const express = require("express");
const { sequelize } = require("../server/config/database");
const User = require("../models/User");
const { authorizeRole } = require("../server/middleware/authMiddleware");

const router = express.Router();

router.get("/me", (req, res) => {
  res.json({ user: req.user });
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
  if (!["admin", "staff"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  try {
    const user = await User.findOne({
      where: { uid: req.params.uid }
    });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    await user.update({ role });
    res.json(user.get({ plain: true }));
  } catch (error) {
    console.error("[Auth] Role update error:", error);
    res.status(500).json({ message: "Failed to update role" });
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
