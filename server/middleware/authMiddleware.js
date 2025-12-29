const { initializeFirebaseAdmin, admin } = require("../config/firebaseAdmin");
const { sequelize } = require("../config/database");
const User = require("../../models/User");

// UserSync is no longer needed with SQL Server - direct creation is fast enough

initializeFirebaseAdmin();

/**
 * Check if email belongs to a developer
 * Developers can bypass domain restrictions
 */
function isDeveloperEmail(email) {
  if (!email) return false;
  
  const emailLower = email.toLowerCase();
  
  // Check by email domain
  const developerDomains = [
    '@bizease.ae',
    '@developer.com'
  ];
  
  if (developerDomains.some(domain => emailLower.endsWith(domain))) {
    return true;
  }
  
  // Check by specific email addresses
  const developerEmails = [
    'developer@bizease.ae',
    'admin@bizease.ae'
  ];
  
  if (developerEmails.includes(emailLower)) {
    return true;
  }
  
  // Check by environment variable
  if (process.env.DEVELOPER_EMAILS) {
    const allowedEmails = process.env.DEVELOPER_EMAILS
      .split(',')
      .map(e => e.trim().toLowerCase());
    
    if (allowedEmails.includes(emailLower)) {
      return true;
    }
  }
  
  return false;
}

async function verifyFirebaseToken(req, res, next) {
  console.log("=".repeat(60));
  console.log(`🔐 [AUTH] ${req.method} ${req.originalUrl}`);
  console.log(`   [AUTH] Request path: ${req.path}`);
  console.log(`   [AUTH] Original URL: ${req.originalUrl}`);
  
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  
  console.log(`   [AUTH] Token present: ${token ? "Yes (length: " + token.length + ")" : "No"}`);

  if (!token) {
    console.log(`   [AUTH] ❌ No token provided for ${req.originalUrl}`);
    console.log("=".repeat(60));
    return res.status(401).json({ message: "Unauthorized: missing token" });
  }

  try {
    console.log(`   [AUTH] Verifying Firebase token...`);
    const decodedToken = await admin.auth().verifyIdToken(token);
    console.log(`   [AUTH] ✅ Token verified for user: ${decodedToken.email} (${decodedToken.uid})`);

    // Check if SQL Server is connected
    try {
      await sequelize.authenticate();
    } catch (dbError) {
      console.error('[Auth] SQL Server not connected:', dbError.message);
      // Allow request to proceed with default role if DB is down
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        displayName: decodedToken.name,
        role: "staff" // Default role
      };
      console.log(`[Auth] Token verified (DB unavailable), using default role`);
      return next();
    }

    // Try to find user, but don't block if it fails
    // Use very short timeout to avoid blocking requests
    let user = null;
    try {
      const userQueryPromise = User.findOne({ 
        where: { uid: decodedToken.uid },
        raw: true 
      });
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Query timeout")), 2000)
      );
      
      user = await Promise.race([userQueryPromise, timeoutPromise]);
      
      if (user) {
        // User exists - update lastLoginAt in background (don't wait)
        User.update(
          { lastLoginAt: new Date(decodedToken.auth_time * 1000) },
          { where: { uid: decodedToken.uid } }
        ).catch(() => {}); // Ignore errors
        
        // Existing users are always allowed (they were created before domain restrictions)
        // No need to check domain for existing users
      }
    } catch (dbError) {
      // Query failed or timed out - continue without blocking
      // User will be created in background
      // Don't log every timeout to reduce noise
    }

    // If user not found, create in background (non-blocking)
    if (!user) {
      // ✅ Assign companyId based on email domain (multi-tenancy)
      // Uses database mappings for dynamic configuration (no code changes needed!)
      const { getCompanyIdFromEmail } = require('../services/companyDomainService');
      
      // Check if user is a developer (bypass domain check)
      const isDev = isDeveloperEmail(decodedToken.email);
      
      let companyId;
      let userRole = "staff"; // Default role
      
      if (isDev) {
        // Developers can bypass domain check - use default companyId
        // Developers automatically get admin role
        companyId = 1;
        userRole = "admin"; // ✅ Developers get admin role
        console.log(`[Auth] ✅ Developer access granted: ${decodedToken.email} (bypassing domain check, role: admin)`);
      } else {
        companyId = await getCompanyIdFromEmail(decodedToken.email);
        
        // If companyId is null, domain is blocked
        if (companyId === null) {
          console.log(`[Auth] ❌ Access denied: Email domain not authorized: ${decodedToken.email}`);
          return res.status(403).json({ 
            message: "Access denied: Your email domain is not authorized. Please contact administrator." 
          });
        }
      }
      
      const userData = {
        uid: decodedToken.uid,
        email: decodedToken.email || "",
        displayName: decodedToken.name || "",
        role: userRole, // ✅ Admin for developers, staff for others
        companyId: companyId, // ✅ Assign companyId
        lastLoginAt: new Date(decodedToken.auth_time * 1000)
      };
      
      // Create user in background - don't wait for it
      // Use setImmediate to ensure it doesn't block the current request
      try {
        setImmediate(async () => {
          try {
            await User.create(userData);
            console.log(`[Auth] ✅ User created: ${userData.email} → companyId: ${companyId}`);
          } catch (err) {
            // User might already exist, or other error - ignore
            if (err && err.message && !err.message.includes('duplicate')) {
              console.error('[Auth] Background user creation error:', err.message);
            }
          }
        });
      } catch (syncError) {
        // If setImmediate itself fails, log but don't crash
        console.error('[Auth] Failed to schedule background user creation:', syncError.message);
      }
    }

    // Set user info (use default role if user not found yet)
    // If user is a developer but doesn't have admin role yet, upgrade them
    const isDev = isDeveloperEmail(decodedToken.email);
    let userRole = user?.role || (isDev ? "admin" : "staff");
    
    // Ensure developers always have admin role
    if (isDev && userRole !== "admin") {
      userRole = "admin";
      // Update user role in background if user exists
      if (user) {
        User.update({ role: "admin" }, { where: { uid: decodedToken.uid } })
          .catch(() => {}); // Ignore errors
      }
    }
    
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      displayName: decodedToken.name,
      role: userRole, // ✅ Admin for developers
      companyId: user?.companyId || 1 // ✅ Include companyId (default to 1 if not found)
    };

    console.log(`   [AUTH] ✅ User authenticated: ${req.user.email} (role: ${req.user.role})`);
    console.log("=".repeat(60));
    return next();
  } catch (error) {
    console.error("=".repeat(60));
    console.error("❌ [AUTH] Token verification failed:");
    console.error("   Error message:", error.message);
    console.error("   Error code:", error.code);
    console.error("=".repeat(60));
    return res.status(401).json({ message: "Unauthorized: invalid token" });
  }
}

function authorizeRole(...authorizedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!authorizedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

module.exports = {
  verifyFirebaseToken,
  authorizeRole
};

