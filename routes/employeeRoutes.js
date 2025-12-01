const express = require("express");
const dayjs = require("dayjs");
const { sequelize } = require("../server/config/database");
const Employee = require("../models/Employee");
const { authorizeRole } = require("../server/middleware/authMiddleware");

const router = express.Router();

function mapEmployee(employee) {
  const employeeObj = employee.get ? employee.get({ plain: true }) : employee;
  const visaExpiry = employeeObj.visaExpiry ? dayjs(employeeObj.visaExpiry) : null;
  const passportExpiry = employeeObj.passportExpiry ? dayjs(employeeObj.passportExpiry) : null;
  const now = dayjs();
  const isExpiringSoon =
    (visaExpiry && visaExpiry.diff(now, "day") <= 30) ||
    (passportExpiry && passportExpiry.diff(now, "day") <= 30);

  // Add legacy/computed fields for backward compatibility
  return {
    ...employeeObj,
    name: employeeObj.fullName || employeeObj.name,
    position: employeeObj.designation || employeeObj.position,
    salary: parseFloat(employeeObj.basicSalary || 0) + parseFloat(employeeObj.allowance || 0),
    expiringSoon: Boolean(isExpiringSoon)
  };
}

router.get("/", async (req, res) => {
  console.log(`[Employees] GET / - Fetching employees`);
  
  // Check SQL Server connection
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    console.warn(`[Employees] SQL Server not connected:`, dbError.message);
    return res.status(503).json({ 
      message: "Database connection unavailable",
      employees: []
    });
  }

  try {
    const employees = await Employee.findAll({
      attributes: {
        exclude: [] // Explicitly select only defined fields
      },
      order: [['createdAt', 'DESC']],
      raw: false // Get Sequelize instances for mapping
    });
    
    console.log(`[Employees] Found ${employees.length} employees`);
    
    const mappedEmployees = employees.map(mapEmployee);
    res.json(mappedEmployees);
  } catch (error) {
    console.error("[Employees] Fetch error:", error.message);
    
    // Return empty array on connection issues
    if (error.name === 'SequelizeConnectionError' || error.name === 'SequelizeTimeoutError') {
      console.warn("[Employees] Query failed due to connection issue, returning empty array");
      return res.json([]);
    }
    
    res.status(500).json({ 
      message: "Failed to fetch employees",
      error: error.message,
      employees: []
    });
  }
});

// Only admin can create employees
router.post("/", authorizeRole("admin"), async (req, res) => {
  console.log(`[Employees] POST / - Creating employee: ${req.body.name}`);
  
  // Check SQL Server connection
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    console.warn(`[Employees] SQL Server not connected:`, dbError.message);
    return res.status(503).json({ message: "Database connection unavailable" });
  }

  try {
    // Map legacy fields to new HR fields for backward compatibility
    const employeeData = {
      ...req.body,
      // Map name -> fullName if name is provided
      fullName: req.body.fullName || req.body.name || "",
      // Map position -> designation if position is provided
      designation: req.body.designation || req.body.position || "",
      // Map salary -> basicSalary if salary is provided
      basicSalary: req.body.basicSalary || req.body.salary || 0,
      createdByUid: req.user.uid,
      createdByDisplayName: req.user.displayName || req.user.email || "",
      createdByEmail: req.user.email
    };

    // Remove legacy fields to avoid conflicts
    delete employeeData.name;
    delete employeeData.position;
    delete employeeData.salary;

    const employee = await Employee.create(employeeData);
    console.log(`[Employees] Employee created successfully: ${employee.id}`);
    
    res.status(201).json(mapEmployee(employee));
  } catch (error) {
    console.error("[Employees] Create error:", error.message);
    res.status(500).json({ 
      message: "Failed to create employee",
      error: error.message
    });
  }
});

router.put("/:id", authorizeRole("admin"), async (req, res) => {
  console.log(`[Employees] PUT /${req.params.id} - Updating employee`);
  
  // Check SQL Server connection
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: "Database connection unavailable" });
  }

  try {
    const employee = await Employee.findByPk(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    
    await employee.update(req.body);
    res.json(mapEmployee(employee));
  } catch (error) {
    console.error("[Employees] Update error:", error.message);
    res.status(500).json({ 
      message: "Failed to update employee",
      error: error.message
    });
  }
});

router.delete("/:id", authorizeRole("admin"), async (req, res) => {
  console.log(`[Employees] DELETE /${req.params.id} - Deleting employee`);
  
  // Check SQL Server connection
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: "Database connection unavailable" });
  }

  try {
    const employee = await Employee.findByPk(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    
    await employee.destroy();
    res.json({ message: "Employee removed" });
  } catch (error) {
    console.error("[Employees] Delete error:", error.message);
    res.status(500).json({ 
      message: "Failed to delete employee",
      error: error.message
    });
  }
});

module.exports = router;
