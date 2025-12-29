const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const dayjs = require("dayjs");
const { sequelize } = require("../server/config/database");
const Employee = require("../models/Employee");
const Contract = require("../models/Contract");
const LeaveRequest = require("../models/LeaveRequest");
const EmployeeSalaryStructure = require("../models/EmployeeSalaryStructure");
const EmployeeAttendance = require("../models/EmployeeAttendance");
const EmployeeLeaveRecord = require("../models/EmployeeLeaveRecord");
const PayrollRecord = require("../models/PayrollRecord");
const { authorizeRole } = require("../server/middleware/authMiddleware");
const { setTenantContext } = require("../server/middleware/tenantMiddleware");
const { generateContractPdf } = require("../server/services/contractPdfService");

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "..", "uploads", "hr");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error("Only PDF, JPG, and PNG files are allowed"));
    }
  }
});

// ==================== EMPLOYEE ROUTES ====================

// GET /api/hr/employees - Get all employees (admin) or own profile (staff)
router.get("/employees", setTenantContext, async (req, res) => {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: "Database connection unavailable" });
  }

  try {
    if (req.user.role === "admin") {
      // Admin can see all employees from their company (developers see all companies)
      const { buildWhereClause } = require('../server/utils/queryHelpers');
      const employees = await Employee.findAll({
        where: buildWhereClause(req, {}),
        order: [['createdAt', 'DESC']],
        raw: false
      });
      res.json(employees.map(emp => emp.get({ plain: true })));
    } else {
      // Staff can only see their own profile (matching by email and company)
      const { buildWhereClause } = require('../server/utils/queryHelpers');
      const employee = await Employee.findOne({
        where: buildWhereClause(req, { 
          email: req.user.email
        }),
        raw: false
      });
      
      if (!employee) {
        return res.status(404).json({ message: "Employee profile not found" });
      }
      
      res.json(employee.get({ plain: true }));
    }
  } catch (error) {
    console.error("[HR] Fetch employees error:", error);
    res.status(500).json({ message: "Failed to fetch employees", error: error.message });
  }
});

// GET /api/hr/employees/:id - Get single employee
router.get("/employees/:id", setTenantContext, async (req, res) => {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: "Database connection unavailable" });
  }

  try {
    const employee = await Employee.findOne({
      where: {
        id: req.params.id,
        companyId: req.companyId  // ✅ Filter by companyId
      }
    });
    
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Staff can only view their own profile
    if (req.user.role === "staff" && employee.email !== req.user.email) {
      return res.status(403).json({ message: "Forbidden: You can only view your own profile" });
    }

    res.json(employee.get({ plain: true }));
  } catch (error) {
    console.error("[HR] Fetch employee error:", error);
    res.status(500).json({ message: "Failed to fetch employee", error: error.message });
  }
});

// POST /api/hr/employees - Create employee (admin only)
router.post("/employees", authorizeRole("admin"), setTenantContext, async (req, res) => {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: "Database connection unavailable" });
  }

  try {
    const employee = await Employee.create({
      ...req.body,
      companyId: req.companyId,  // ✅ Set companyId
      createdByUid: req.user.uid,
      createdByDisplayName: req.user.displayName || req.user.email,
      createdByEmail: req.user.email
    });
    
    // Immediately check for expiries and create notifications
    try {
      console.log('[HR] Checking employee expiries immediately for:', employee.fullName);
      console.log('[HR] Passport expiry:', employee.passportExpiry);
      console.log('[HR] Visa expiry:', employee.visaExpiry);
      
      const { checkEmployeeExpiriesImmediate } = require('../server/services/notificationService');
      const notifications = await checkEmployeeExpiriesImmediate(employee);
      
      console.log(`[HR] Created ${notifications.length} notification(s) for employee ${employee.fullName}`);
    } catch (notifError) {
      // Don't fail employee creation if notification check fails
      console.error('[HR] Notification check failed (non-critical):', notifError.message);
      console.error('[HR] Notification error stack:', notifError.stack);
    }
    
    res.status(201).json(employee.get({ plain: true }));
  } catch (error) {
    console.error("[HR] Create employee error:", error);
    res.status(500).json({ message: "Failed to create employee", error: error.message });
  }
});

// PUT /api/hr/employees/:id - Update employee
router.put("/employees/:id", setTenantContext, async (req, res) => {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: "Database connection unavailable" });
  }

  try {
    const employee = await Employee.findOne({
      where: {
        id: req.params.id,
        companyId: req.companyId  // ✅ Filter by companyId
      }
    });
    
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Staff can only update their own profile
    if (req.user.role === "staff" && employee.email !== req.user.email) {
      return res.status(403).json({ message: "Forbidden: You can only update your own profile" });
    }

    // Check if passport or visa expiry is being updated
    const expiryFieldsChanged = req.body.passportExpiry !== undefined || req.body.visaExpiry !== undefined;

    await employee.update(req.body);
    
    // If expiry fields were updated, check for notifications immediately
    if (expiryFieldsChanged) {
      try {
        // Reload employee to get updated values
        await employee.reload();
        console.log('[HR] Expiry fields changed, checking notifications for:', employee.fullName);
        console.log('[HR] Updated passport expiry:', employee.passportExpiry);
        console.log('[HR] Updated visa expiry:', employee.visaExpiry);
        
        const { checkEmployeeExpiriesImmediate } = require('../server/services/notificationService');
        const notifications = await checkEmployeeExpiriesImmediate(employee);
        
        console.log(`[HR] Created ${notifications.length} notification(s) for updated employee ${employee.fullName}`);
      } catch (notifError) {
        // Don't fail employee update if notification check fails
        console.error('[HR] Notification check failed (non-critical):', notifError.message);
        console.error('[HR] Notification error stack:', notifError.stack);
      }
    }
    
    res.json(employee.get({ plain: true }));
  } catch (error) {
    console.error("[HR] Update employee error:", error);
    res.status(500).json({ message: "Failed to update employee", error: error.message });
  }
});

// DELETE /api/hr/employees/:id - Delete employee (admin only)
router.delete("/employees/:id", authorizeRole("admin"), setTenantContext, async (req, res) => {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: "Database connection unavailable" });
  }

  // Use transaction to ensure all related records are deleted
  const transaction = await sequelize.transaction();

  try {
    const employeeId = parseInt(req.params.id);
    const employee = await Employee.findOne({
      where: {
        id: employeeId,
        companyId: req.companyId  // ✅ Filter by companyId
      },
      transaction
    });
    
    if (!employee) {
      await transaction.rollback();
      return res.status(404).json({ message: "Employee not found" });
    }

    console.log(`[HR] Deleting employee ${employeeId} and all related records...`);

    // Delete all related records first (cascade delete)
    // 1. Delete salary structure
    await EmployeeSalaryStructure.destroy({
      where: { 
        employeeId,
        companyId: req.companyId  // ✅ Filter by companyId
      },
      transaction
    });
    console.log(`[HR] Deleted salary structure for employee ${employeeId}`);

    // 2. Delete attendance records
    await EmployeeAttendance.destroy({
      where: { 
        employeeId,
        companyId: req.companyId  // ✅ Filter by companyId
      },
      transaction
    });
    console.log(`[HR] Deleted attendance records for employee ${employeeId}`);

    // 3. Delete leave records
    await EmployeeLeaveRecord.destroy({
      where: { 
        employeeId,
        companyId: req.companyId  // ✅ Filter by companyId
      },
      transaction
    });
    console.log(`[HR] Deleted leave records for employee ${employeeId}`);

    // 4. Delete payroll records
    await PayrollRecord.destroy({
      where: { 
        employeeId,
        companyId: req.companyId  // ✅ Filter by companyId
      },
      transaction
    });
    console.log(`[HR] Deleted payroll records for employee ${employeeId}`);

    // 5. Delete contracts
    await Contract.destroy({
      where: { 
        employeeId,
        companyId: req.companyId  // ✅ Filter by companyId
      },
      transaction
    });
    console.log(`[HR] Deleted contracts for employee ${employeeId}`);

    // 6. Delete leave requests
    await LeaveRequest.destroy({
      where: { 
        employeeId,
        companyId: req.companyId  // ✅ Filter by companyId
      },
      transaction
    });
    console.log(`[HR] Deleted leave requests for employee ${employeeId}`);

    // 7. Finally, delete the employee
    await employee.destroy({ transaction });
    console.log(`[HR] Deleted employee ${employeeId}`);

    // Commit transaction
    await transaction.commit();
    res.json({ message: "Employee and all related records deleted successfully" });
  } catch (error) {
    await transaction.rollback();
    console.error("[HR] Delete employee error:", error);
    
    // Provide user-friendly error message
    let errorMessage = "Failed to delete employee";
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      errorMessage = "Cannot delete employee. There are related records that prevent deletion. Please contact support.";
    } else {
      errorMessage = error.message || errorMessage;
    }
    
    res.status(500).json({ message: errorMessage, error: error.message });
  }
});

// ==================== DOCUMENT UPLOAD ROUTES ====================

// POST /api/hr/employees/:id/documents/passport
router.post("/employees/:id/documents/passport", authorizeRole("admin"), setTenantContext, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const employee = await Employee.findOne({
      where: {
        id: req.params.id,
        companyId: req.companyId  // ✅ Filter by companyId
      }
    });
    if (!employee) {
      // Delete uploaded file if employee not found
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: "Employee not found" });
    }

    // Delete old file if exists
    if (employee.passportUrl) {
      const oldPath = path.join(__dirname, "..", employee.passportUrl);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    const fileUrl = `/uploads/hr/${req.file.filename}`;
    await employee.update({ passportUrl: fileUrl });

    res.json({ message: "Passport uploaded successfully", url: fileUrl });
  } catch (error) {
    console.error("[HR] Upload passport error:", error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: "Failed to upload passport", error: error.message });
  }
});

// POST /api/hr/employees/:id/documents/emirates-id
router.post("/employees/:id/documents/emirates-id", authorizeRole("admin"), setTenantContext, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const employee = await Employee.findOne({
      where: {
        id: req.params.id,
        companyId: req.companyId  // ✅ Filter by companyId
      }
    });
    if (!employee) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: "Employee not found" });
    }

    if (employee.emiratesIdUrl) {
      const oldPath = path.join(__dirname, "..", employee.emiratesIdUrl);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    const fileUrl = `/uploads/hr/${req.file.filename}`;
    await employee.update({ emiratesIdUrl: fileUrl });

    res.json({ message: "Emirates ID uploaded successfully", url: fileUrl });
  } catch (error) {
    console.error("[HR] Upload Emirates ID error:", error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: "Failed to upload Emirates ID", error: error.message });
  }
});

// POST /api/hr/employees/:id/documents/visa
router.post("/employees/:id/documents/visa", authorizeRole("admin"), setTenantContext, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const employee = await Employee.findOne({
      where: {
        id: req.params.id,
        companyId: req.companyId  // ✅ Filter by companyId
      }
    });
    if (!employee) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: "Employee not found" });
    }

    if (employee.visaUrl) {
      const oldPath = path.join(__dirname, "..", employee.visaUrl);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    const fileUrl = `/uploads/hr/${req.file.filename}`;
    await employee.update({ visaUrl: fileUrl });

    res.json({ message: "Visa uploaded successfully", url: fileUrl });
  } catch (error) {
    console.error("[HR] Upload visa error:", error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: "Failed to upload visa", error: error.message });
  }
});

// POST /api/hr/employees/:id/documents/insurance
router.post("/employees/:id/documents/insurance", authorizeRole("admin"), setTenantContext, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const employee = await Employee.findOne({
      where: {
        id: req.params.id,
        companyId: req.companyId  // ✅ Filter by companyId
      }
    });
    if (!employee) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: "Employee not found" });
    }

    if (employee.insuranceUrl) {
      const oldPath = path.join(__dirname, "..", employee.insuranceUrl);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    const fileUrl = `/uploads/hr/${req.file.filename}`;
    await employee.update({ insuranceUrl: fileUrl });

    res.json({ message: "Insurance uploaded successfully", url: fileUrl });
  } catch (error) {
    console.error("[HR] Upload insurance error:", error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: "Failed to upload insurance", error: error.message });
  }
});

// ==================== CONTRACT ROUTES ====================

// Generate contract number
function generateContractNumber() {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `CNT-${year}-${random}`;
}

// GET /api/hr/contracts - Get all contracts
router.get("/contracts", setTenantContext, async (req, res) => {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: "Database connection unavailable" });
  }

  try {
    let contracts;
    
    if (req.user.role === "admin") {
      contracts = await Contract.findAll({
        where: {
          companyId: req.companyId  // ✅ Filter by companyId
        },
        order: [['createdAt', 'DESC']]
      });
      
      // Attach employee data manually
      for (const contract of contracts) {
        const employee = await Employee.findOne({
          where: {
            id: contract.employeeId,
            companyId: req.companyId  // ✅ Filter by companyId
          }
        });
        contract.dataValues.employee = employee ? employee.get({ plain: true }) : null;
      }
    } else {
      // Staff can only see their own contracts
      const employee = await Employee.findOne({ 
        where: { 
          email: req.user.email,
          companyId: req.companyId  // ✅ Filter by companyId
        } 
      });
      if (!employee) {
        return res.json([]);
      }
      
      contracts = await Contract.findAll({
        where: { 
          employeeId: employee.id,
          companyId: req.companyId  // ✅ Filter by companyId
        },
        order: [['createdAt', 'DESC']]
      });
      
      // Attach employee data manually
      for (const contract of contracts) {
        contract.dataValues.employee = employee.get({ plain: true });
      }
    }

    res.json(contracts.map(contract => contract.get({ plain: true })));
  } catch (error) {
    console.error("[HR] Fetch contracts error:", error);
    res.status(500).json({ message: "Failed to fetch contracts", error: error.message });
  }
});

// POST /api/hr/contracts - Create contract (admin only)
router.post("/contracts", authorizeRole("admin"), setTenantContext, async (req, res) => {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: "Database connection unavailable" });
  }

  try {
    const contractNumber = generateContractNumber();
    
    const contract = await Contract.create({
      ...req.body,
      contractNumber,
      companyId: req.companyId,  // ✅ Set companyId
      createdByUid: req.user.uid,
      createdByDisplayName: req.user.displayName || req.user.email,
      createdByEmail: req.user.email
    });

    res.status(201).json(contract.get({ plain: true }));
  } catch (error) {
    console.error("[HR] Create contract error:", error);
    res.status(500).json({ message: "Failed to create contract", error: error.message });
  }
});

// POST /api/hr/contracts/:id/generate-pdf - Generate contract PDF (admin only)
router.post("/contracts/:id/generate-pdf", authorizeRole("admin"), setTenantContext, async (req, res) => {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: "Database connection unavailable" });
  }

  try {
    const contract = await Contract.findOne({
      where: {
        id: req.params.id,
        companyId: req.companyId  // ✅ Filter by companyId
      }
    });

    if (!contract) {
      return res.status(404).json({ message: "Contract not found" });
    }

    const employee = await Employee.findOne({
      where: {
        id: contract.employeeId,
        companyId: req.companyId  // ✅ Filter by companyId
      }
    });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Prepare contract data for PDF
    const contractData = {
      contractNumber: contract.contractNumber,
      employeeFullName: employee.fullName || employee.name,
      employeePassport: employee.passportNumber,
      employeeEmiratesId: employee.emiratesId,
      designation: contract.designation || employee.designation,
      contractType: contract.contractType,
      startDate: contract.startDate,
      endDate: contract.endDate,
      basicSalary: contract.basicSalary,
      allowance: contract.allowance,
      terms: contract.terms
    };

    // Generate PDF
    const pdfBuffer = await generateContractPdf(contractData);

    // Save PDF to uploads directory
    const pdfFilename = `contract-${contract.contractNumber}-${Date.now()}.pdf`;
    const pdfPath = path.join(uploadsDir, pdfFilename);
    fs.writeFileSync(pdfPath, pdfBuffer);

    const pdfUrl = `/uploads/hr/${pdfFilename}`;
    await contract.update({ pdfUrl });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="contract-${contract.contractNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error("[HR] Generate contract PDF error:", error);
    res.status(500).json({ message: "Failed to generate contract PDF", error: error.message });
  }
});

// GET /api/hr/contracts/:id/download - Download contract PDF
router.get("/contracts/:id/download", setTenantContext, async (req, res) => {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: "Database connection unavailable" });
  }

  try {
    const contract = await Contract.findOne({
      where: {
        id: req.params.id,
        companyId: req.companyId  // ✅ Filter by companyId
      }
    });

    if (!contract) {
      return res.status(404).json({ message: "Contract not found" });
    }

    // Staff can only download their own contracts
    if (req.user.role === "staff") {
      const employee = await Employee.findOne({ 
        where: { 
          email: req.user.email,
          companyId: req.companyId  // ✅ Filter by companyId
        } 
      });
      if (!employee || contract.employeeId !== employee.id) {
        return res.status(403).json({ message: "Forbidden: You can only download your own contracts" });
      }
    }

    if (!contract.pdfUrl) {
      return res.status(404).json({ message: "Contract PDF not generated yet" });
    }

    const filePath = path.join(__dirname, "..", contract.pdfUrl);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Contract PDF file not found" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="contract-${contract.contractNumber}.pdf"`);
    res.sendFile(path.resolve(filePath));
  } catch (error) {
    console.error("[HR] Download contract error:", error);
    res.status(500).json({ message: "Failed to download contract", error: error.message });
  }
});

// ==================== LEAVE REQUEST ROUTES ====================

// Calculate leave balance (30 days per year)
function calculateLeaveBalance(joiningDate) {
  if (!joiningDate) return 30;
  
  const joining = dayjs(joiningDate);
  const now = dayjs();
  const monthsWorked = now.diff(joining, "month", true);
  const yearsWorked = monthsWorked / 12;
  
  // Pro-rated: 30 days per year
  return Math.floor(yearsWorked * 30);
}

// GET /api/hr/leave-requests - Get all leave requests
router.get("/leave-requests", setTenantContext, async (req, res) => {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: "Database connection unavailable" });
  }

  try {
    let leaveRequests;
    
    if (req.user.role === "admin") {
      leaveRequests = await LeaveRequest.findAll({
        where: {
          companyId: req.companyId  // ✅ Filter by companyId
        },
        order: [['createdAt', 'DESC']]
      });
      
      // Attach employee data manually
      for (const leave of leaveRequests) {
        const employee = await Employee.findOne({
          where: {
            id: leave.employeeId,
            companyId: req.companyId  // ✅ Filter by companyId
          }
        });
        leave.dataValues.employee = employee ? employee.get({ plain: true }) : null;
      }
    } else {
      // Staff can only see their own leave requests
      const employee = await Employee.findOne({ 
        where: { 
          email: req.user.email,
          companyId: req.companyId  // ✅ Filter by companyId
        } 
      });
      if (!employee) {
        return res.json([]);
      }
      
      leaveRequests = await LeaveRequest.findAll({
        where: { 
          employeeId: employee.id,
          companyId: req.companyId  // ✅ Filter by companyId
        },
        order: [['createdAt', 'DESC']]
      });
      
      // Attach employee data manually
      for (const leave of leaveRequests) {
        leave.dataValues.employee = employee.get({ plain: true });
      }
    }

    res.json(leaveRequests.map(leave => leave.get({ plain: true })));
  } catch (error) {
    console.error("[HR] Fetch leave requests error:", error);
    res.status(500).json({ message: "Failed to fetch leave requests", error: error.message });
  }
});

// POST /api/hr/leave-requests - Apply for leave (staff)
router.post("/leave-requests", setTenantContext, async (req, res) => {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: "Database connection unavailable" });
  }

  try {
    // Find employee by email, or create one if it doesn't exist
    let employee = await Employee.findOne({ 
      where: { 
        email: req.user.email,
        companyId: req.companyId  // ✅ Filter by companyId
      } 
    });
    if (!employee) {
      // Auto-create employee profile for staff member
      // Set default expiry dates (1 year from now) for required fields
      const defaultExpiryDate = dayjs().add(1, 'year').toDate();
      
      employee = await Employee.create({
        fullName: req.user.displayName || req.user.email?.split("@")[0] || "Staff Member",
        email: req.user.email,
        phone: req.user.phoneNumber || "",
        designation: "Staff",
        contractType: "full-time",
        basicSalary: 0,
        allowance: 0,
        visaStatus: "active",
        insuranceStatus: "active",
        visaExpiry: defaultExpiryDate, // Required by database schema
        passportExpiry: defaultExpiryDate, // Required by database schema
        companyId: req.companyId,  // ✅ Set companyId
        createdByUid: req.user.uid,
        createdByDisplayName: req.user.displayName || req.user.email,
        createdByEmail: req.user.email
      });
      console.log(`[HR] Auto-created employee profile for ${req.user.email}`);
    }

    const { startDate, endDate, leaveType, reason } = req.body;
    
    // Calculate total days
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    const totalDays = end.diff(start, "day") + 1;

    // Check leave balance
    const leaveBalance = calculateLeaveBalance(employee.joiningDate);
    
    // Get approved leave days for this year
    const currentYear = dayjs().year();
    const approvedLeaves = await LeaveRequest.findAll({
      where: {
        employeeId: employee.id,
        companyId: req.companyId,  // ✅ Filter by companyId
        status: "approved",
        [sequelize.Sequelize.Op.and]: [
          sequelize.where(sequelize.fn("YEAR", sequelize.col("startDate")), currentYear)
        ]
      }
    });

    const usedDays = approvedLeaves.reduce((sum, leave) => sum + leave.totalDays, 0);
    const availableDays = leaveBalance - usedDays;

    if (totalDays > availableDays) {
      return res.status(400).json({ 
        message: `Insufficient leave balance. Available: ${availableDays} days, Requested: ${totalDays} days` 
      });
    }

    const leaveRequest = await LeaveRequest.create({
      employeeId: employee.id,
      leaveType: leaveType || "annual",
      startDate,
      endDate,
      totalDays,
      reason,
      companyId: req.companyId,  // ✅ Set companyId
      createdByUid: req.user.uid,
      createdByDisplayName: req.user.displayName || req.user.email,
      createdByEmail: req.user.email
    });

    res.status(201).json(leaveRequest.get({ plain: true }));
  } catch (error) {
    console.error("[HR] Create leave request error:", error);
    res.status(500).json({ message: "Failed to create leave request", error: error.message });
  }
});

// PUT /api/hr/leave-requests/:id/approve - Approve leave (admin only)
router.put("/leave-requests/:id/approve", authorizeRole("admin"), setTenantContext, async (req, res) => {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: "Database connection unavailable" });
  }

  try {
    const leaveRequest = await LeaveRequest.findOne({
      where: {
        id: req.params.id,
        companyId: req.companyId  // ✅ Filter by companyId
      }
    });
    
    if (!leaveRequest) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    await leaveRequest.update({
      status: "approved",
      approvedBy: req.user.uid,
      approvedAt: new Date()
    });

    res.json(leaveRequest.get({ plain: true }));
  } catch (error) {
    console.error("[HR] Approve leave request error:", error);
    res.status(500).json({ message: "Failed to approve leave request", error: error.message });
  }
});

// PUT /api/hr/leave-requests/:id/reject - Reject leave (admin only)
router.put("/leave-requests/:id/reject", authorizeRole("admin"), setTenantContext, async (req, res) => {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: "Database connection unavailable" });
  }

  try {
    const leaveRequest = await LeaveRequest.findOne({
      where: {
        id: req.params.id,
        companyId: req.companyId  // ✅ Filter by companyId
      }
    });
    
    if (!leaveRequest) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    await leaveRequest.update({
      status: "rejected",
      approvedBy: req.user.uid,
      approvedAt: new Date(),
      rejectionReason: req.body.reason || "No reason provided"
    });

    res.json(leaveRequest.get({ plain: true }));
  } catch (error) {
    console.error("[HR] Reject leave request error:", error);
    res.status(500).json({ message: "Failed to reject leave request", error: error.message });
  }
});

module.exports = router;

