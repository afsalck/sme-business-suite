# Firebase Login with Multi-Tenancy (companyId)

## 🔥 Current Firebase Login Flow

**Your current setup:**
1. User logs in via Firebase (email/password or Google)
2. Firebase returns user token
3. Backend verifies token
4. User is created/fetched from database
5. **Problem:** No `companyId` assignment!

---

## ✅ Solution: Add companyId to Firebase Login Flow

### Option 1: Assign companyId During First Login (Recommended)

**When user first logs in, assign them to a company.**

#### Step 1: Update User Creation in authMiddleware

```javascript
// server/middleware/authMiddleware.js
const User = require('../models/User');
const Company = require('../models/Company');

async function verifyFirebaseToken(req, res, next) {
  // ... existing token verification code ...
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const firebaseUid = decodedToken.uid;
    const firebaseEmail = decodedToken.email;

    // Check if user exists in database
    let user = await User.findOne({
      where: { uid: firebaseUid }
    });

    // If user doesn't exist, create them
    if (!user) {
      // ✅ OPTION A: Assign to default company (companyId = 1)
      // For existing single-tenant setup
      user = await User.create({
        uid: firebaseUid,
        email: firebaseEmail,
        displayName: decodedToken.name || firebaseEmail.split('@')[0],
        role: 'staff',
        companyId: 1  // ← Default company
      });
      
      // ✅ OPTION B: Assign based on email domain
      // Example: @customera.com → companyId = 1
      const emailDomain = firebaseEmail.split('@')[1];
      const companyMap = {
        'customera.com': 1,
        'customerb.com': 2
      };
      const companyId = companyMap[emailDomain] || 1;
      
      user = await User.create({
        uid: firebaseUid,
        email: firebaseEmail,
        displayName: decodedToken.name || firebaseEmail.split('@')[0],
        role: 'staff',
        companyId: companyId  // ← From email domain
      });
      
      // ✅ OPTION C: Assign based on custom claim
      // Set custom claim in Firebase: { companyId: 1 }
      const companyId = decodedToken.companyId || 1;
      
      user = await User.create({
        uid: firebaseUid,
        email: firebaseEmail,
        displayName: decodedToken.name || firebaseEmail.split('@')[0],
        role: 'staff',
        companyId: companyId  // ← From Firebase custom claim
      });
    }

    // Get companyId from user
    req.user = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      companyId: user.companyId  // ← Include companyId
    };

    next();
  } catch (error) {
    // ... error handling ...
  }
}
```

#### Step 2: Update /auth/me Endpoint

```javascript
// routes/authRoutes.js
router.get("/me", async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Get full user data including companyId
    const user = await User.findOne({
      where: { uid: req.user.uid },
      include: [{
        model: Company,
        as: 'company',
        attributes: ['companyId', 'name', 'shopName']
      }]
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      user: {
        id: user.id,
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        companyId: user.companyId,  // ← Include companyId
        company: user.company
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
```

---

### Option 2: Pre-Create Users with companyId (Better for Multi-Tenant)

**Admin creates users BEFORE they log in.**

#### Step 1: Admin Creates User with companyId

```javascript
// routes/authRoutes.js or routes/userRoutes.js
router.post('/users', authorizeRole('admin'), async (req, res) => {
  try {
    const { email, displayName, role, companyId, password } = req.body;

    // Validate company exists
    const company = await Company.findOne({
      where: { companyId: companyId }
    });

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Create Firebase user
    const firebaseUser = await admin.auth().createUser({
      email,
      displayName,
      password: password || generateRandomPassword(), // Generate if not provided
      emailVerified: false
    });

    // Create user in database with companyId
    const user = await User.create({
      uid: firebaseUser.uid,
      email,
      displayName,
      role: role || 'staff',
      companyId: companyId  // ← Assign to company
    });

    // Send invitation email with password reset link
    const resetLink = await admin.auth().generatePasswordResetLink(email);
    await sendInvitationEmail(email, {
      displayName,
      companyName: company.name,
      resetLink
    });

    res.status(201).json({
      message: 'User created successfully',
      user: user.get({ plain: true })
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
```

#### Step 2: User Logs In (companyId Already Assigned)

```javascript
// When user logs in, companyId is already in database
async function verifyFirebaseToken(req, res, next) {
  // ... verify token ...
  
  const user = await User.findOne({
    where: { uid: decodedToken.uid }
  });

  if (!user) {
    return res.status(404).json({ message: 'User not found. Please contact admin.' });
  }

  req.user = {
    uid: user.uid,
    email: user.email,
    role: user.role,
    companyId: user.companyId  // ← Already assigned
  };

  next();
}
```

---

### Option 3: Set companyId via Firebase Custom Claims

**Set companyId as Firebase custom claim, then use it during login.**

#### Step 1: Admin Sets Custom Claim

```javascript
// routes/authRoutes.js
router.post('/users/:uid/set-company', authorizeRole('admin'), async (req, res) => {
  try {
    const { companyId } = req.body;
    const { uid } = req.params;

    // Validate company
    const company = await Company.findOne({
      where: { companyId: companyId }
    });

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Set custom claim in Firebase
    await admin.auth().setCustomUserClaims(uid, {
      companyId: companyId
    });

    // Update user in database
    await User.update(
      { companyId: companyId },
      { where: { uid: uid } }
    );

    res.json({ message: 'Company assigned successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
```

#### Step 2: Use Custom Claim During Login

```javascript
// server/middleware/authMiddleware.js
async function verifyFirebaseToken(req, res, next) {
  // ... verify token ...
  
  const decodedToken = await admin.auth().verifyIdToken(token);
  
  // Get companyId from custom claim
  const companyId = decodedToken.companyId || 1;
  
  // Get or create user
  let user = await User.findOne({
    where: { uid: decodedToken.uid }
  });

  if (!user) {
    user = await User.create({
      uid: decodedToken.uid,
      email: decodedToken.email,
      displayName: decodedToken.name,
      role: 'staff',
      companyId: companyId  // ← From custom claim
    });
  } else {
    // Update companyId if changed in Firebase
    if (user.companyId !== companyId) {
      await user.update({ companyId: companyId });
    }
  }

  req.user = {
    uid: user.uid,
    email: user.email,
    role: user.role,
    companyId: user.companyId
  };

  next();
}
```

---

## 🔄 Complete Firebase Login Flow with companyId

```
┌─────────────────────────────────────────┐
│  1. User Logs In via Firebase          │
│     - Email/Password or Google          │
│     - Firebase returns token            │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  2. Backend Verifies Token               │
│     - Decode Firebase token              │
│     - Get user UID                       │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  3. Check User in Database              │
│     - Find user by UID                  │
│     - If exists → Get companyId          │
│     - If not → Create with companyId    │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  4. Assign companyId (if new user)      │
│     Option A: Default (companyId = 1)   │
│     Option B: Email domain mapping      │
│     Option C: Firebase custom claim     │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  5. Return User with companyId          │
│     - Include companyId in response      │
│     - Store in client context           │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  6. All API Calls Use companyId         │
│     - Filter queries by companyId       │
│     - User sees only their data         │
└─────────────────────────────────────────┘
```

---

## 💻 Implementation Example

### Update authMiddleware.js

```javascript
// server/middleware/authMiddleware.js
const User = require('../models/User');
const Company = require('../models/Company');

async function verifyFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized: missing token" });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const firebaseUid = decodedToken.uid;
    const firebaseEmail = decodedToken.email;

    // Check SQL Server connection
    try {
      await sequelize.authenticate();
    } catch (dbError) {
      // Fallback if DB is down
      req.user = {
        uid: firebaseUid,
        email: firebaseEmail,
        role: "staff",
        companyId: 1  // Default
      };
      return next();
    }

    // Find or create user
    let user = await User.findOne({
      where: { uid: firebaseUid }
    });

    if (!user) {
      // ✅ NEW USER: Assign companyId
      // Option 1: Default company
      const defaultCompanyId = 1;
      
      // Option 2: Email domain mapping
      const emailDomain = firebaseEmail.split('@')[1];
      const companyMap = {
        'customera.com': 1,
        'customerb.com': 2,
        'customerc.com': 3
      };
      const companyId = companyMap[emailDomain] || defaultCompanyId;
      
      // Option 3: From Firebase custom claim
      // const companyId = decodedToken.companyId || defaultCompanyId;

      // Create user with companyId
      user = await User.create({
        uid: firebaseUid,
        email: firebaseEmail,
        displayName: decodedToken.name || firebaseEmail.split('@')[0],
        role: 'staff',
        companyId: companyId  // ← Assign companyId
      });

      console.log(`[Auth] ✅ New user created: ${firebaseEmail} → companyId: ${companyId}`);
    }

    // Get user with company info
    const userWithCompany = await User.findOne({
      where: { uid: firebaseUid },
      include: [{
        model: Company,
        as: 'company',
        attributes: ['companyId', 'name']
      }]
    });

    // Set user in request
    req.user = {
      uid: userWithCompany.uid,
      email: userWithCompany.email,
      displayName: userWithCompany.displayName,
      role: userWithCompany.role,
      companyId: userWithCompany.companyId  // ← Include companyId
    };

    console.log(`[Auth] ✅ User authenticated: ${req.user.email} (companyId: ${req.user.companyId})`);
    next();
  } catch (error) {
    console.error("[Auth] Token verification error:", error);
    res.status(401).json({ message: "Unauthorized: invalid token" });
  }
}
```

### Update AuthContext to Store companyId

```javascript
// client/src/context/AuthContext.js
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [companyId, setCompanyId] = useState(null);  // ← Add this

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          
          // Get user data from backend (includes companyId)
          const { data } = await apiClient.get("/auth/me", {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (data?.user) {
            setUser(data.user);
            setCompanyId(data.user.companyId);  // ← Store companyId
            localStorage.setItem('companyId', data.user.companyId);
          }
        } catch (error) {
          console.error("Failed to get user data:", error);
        }
      } else {
        setUser(null);
        setCompanyId(null);
        localStorage.removeItem('companyId');
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, companyId, ... }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### Use companyId in API Calls

```javascript
// client/src/services/apiClient.js
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5004/api'
});

// Add companyId to all requests
apiClient.interceptors.request.use((config) => {
  const companyId = localStorage.getItem('companyId');
  if (companyId) {
    config.headers['X-Company-Id'] = companyId;
  }
  return config;
});

export default apiClient;
```

---

## 🎯 Recommended Approach

**For your current Firebase setup, I recommend:**

### Option 1: Email Domain Mapping (Easiest)

```javascript
// When user first logs in, assign based on email domain
const emailDomain = firebaseEmail.split('@')[1];
const companyMap = {
  'customera.com': 1,
  'customerb.com': 2
};
const companyId = companyMap[emailDomain] || 1;
```

**Pros:**
- Automatic assignment
- No manual setup needed
- Works with existing Firebase login

**Cons:**
- Requires email domain control
- Less flexible

### Option 2: Admin Pre-Creates Users (Most Secure)

```javascript
// Admin creates users with companyId BEFORE they log in
// User logs in → companyId already assigned
```

**Pros:**
- Full control
- Most secure
- Better for multi-tenant

**Cons:**
- Requires admin to create users first
- More setup

---

## ✅ Summary

**Your Question:** "If I'm creating from Firebase login?"

**Answer:**
1. **First Login:** User logs in via Firebase → Backend creates user in database → Assign `companyId` (default, email domain, or custom claim)
2. **Subsequent Logins:** User logs in → Backend gets user from database → `companyId` already assigned
3. **Data Access:** All queries filter by `companyId` → User sees only their company's data

**Key Point:**
> **When user first logs in via Firebase, assign them a `companyId` during user creation. Then all subsequent logins will use that `companyId`.**

Would you like me to implement this? I can:
1. Update `authMiddleware.js` to assign `companyId` on first login
2. Update `/auth/me` to return `companyId`
3. Update client to store and use `companyId`
4. Create middleware to filter all queries by `companyId`

