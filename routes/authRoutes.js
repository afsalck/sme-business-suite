const express = require("express");
const { sequelize } = require("../server/config/database");
const User = require("../models/User");
const { authorizeRole } = require("../server/middleware/authMiddleware");
const dayjs = require("dayjs");

const router = express.Router();

router.get("/me", async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Get full user data including companyId
    const User = require("../models/User");
    const user = await User.findOne({
      where: { uid: req.user.uid },
      attributes: ['id', 'uid', 'email', 'displayName', 'role', 'companyId', 'phoneNumber', 'lastLoginAt']
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userData = user.get({ plain: true });
    res.json({
      user: {
        id: userData.id,
        uid: userData.uid,
        email: userData.email,
        displayName: userData.displayName,
        role: userData.role,
        companyId: userData.companyId, // ✅ Include companyId
        phoneNumber: userData.phoneNumber,
        lastLoginAt: userData.lastLoginAt
      }
    });
  } catch (error) {
    console.error("[Auth] Error in /me endpoint:", error);
    res.status(500).json({ message: "Failed to get user data" });
  }
});

router.get("/users", authorizeRole("admin"), async (req, res) => {
  // Check SQL Server connection
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: "Database connection unavailable" });
  }

  try {
    const users = await User.findAll({
      order: [['createdAt', 'DESC']],
      raw: false
    });
    
    // Convert to plain objects
    const usersData = users.map(user => user.get({ plain: true }));
    res.json(usersData);
  } catch (error) {
    console.error("[Auth] Users fetch error:", error);
    res.status(500).json({ message: "Failed to load users" });
  }
});

router.patch("/users/:uid/role", authorizeRole("admin"), async (req, res) => {
  // Check SQL Server connection
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: "Database connection unavailable" });
  }

  const { role } = req.body;
  const validRoles = ["admin", "staff", "hr", "accountant"];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ message: `Invalid role. Must be one of: ${validRoles.join(", ")}` });
  }

  try {
    console.log('[Auth] Updating role:', { uid: req.params.uid, newRole: role });
    
    const user = await User.findOne({
      where: { uid: req.params.uid }
    });
    
    if (!user) {
      console.error('[Auth] User not found:', req.params.uid);
      return res.status(404).json({ message: "User not found" });
    }
    
    console.log('[Auth] Found user:', { email: user.email, currentRole: user.role });
    
    // Use raw SQL to avoid any Sequelize issues with role field
    const formattedDate = dayjs().format('YYYY-MM-DD HH:mm:ss');
    
    await sequelize.query(
      `UPDATE users SET role = :role, updatedAt = :updatedAt WHERE uid = :uid`,
      {
        replacements: {
          role: role,
          updatedAt: formattedDate,
          uid: req.params.uid
        },
        type: sequelize.QueryTypes.UPDATE
      }
    );
    
    // Reload user to get fresh data
    await user.reload();
    
    console.log('[Auth] ✓ Role updated successfully:', { email: user.email, newRole: user.role });
    res.json(user.get({ plain: true }));
  } catch (error) {
    console.error("[Auth] ✗ Role update error:", error);
    console.error("[Auth] Error details:", {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    res.status(500).json({ 
      message: "Failed to update role", 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

router.delete("/users/:uid", authorizeRole("admin"), async (req, res) => {
  // Check SQL Server connection
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: "Database connection unavailable" });
  }

  try {
    const user = await User.findOne({
      where: { uid: req.params.uid }
    });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prevent deleting yourself
    if (user.uid === req.user.uid) {
      return res.status(400).json({ message: "Cannot delete your own account" });
    }
    
    await user.destroy();
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("[Auth] User delete error:", error);
    res.status(500).json({ message: "Failed to delete user" });
  }
});

module.exports = router;
