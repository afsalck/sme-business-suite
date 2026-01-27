const express = require('express');
const router = express.Router();

// Load models and set up associations first
require('../models/payrollAssociations');

const payrollController = require('../server/controllers/payrollController');
const { verifyFirebaseToken, authorizeRole } = require('../server/middleware/authMiddleware');
const { setTenantContext } = require('../server/middleware/tenantMiddleware');

// All routes require authentication
router.use(verifyFirebaseToken);
// All routes require tenant context
router.use(setTenantContext);

// Payroll Periods - Admin, HR
router.get('/periods', authorizeRole('admin', 'hr'), payrollController.getPayrollPeriods);
router.post('/periods', authorizeRole('admin', 'hr'), payrollController.createPayrollPeriod);

// Payroll Processing - Admin, HR
router.post('/process', authorizeRole('admin', 'hr'), payrollController.processPayroll);

// Payroll Records - Admin, HR
router.get('/records', authorizeRole('admin', 'hr'), payrollController.getPayrollRecords);
router.post('/records/:id/approve', authorizeRole('admin', 'hr'), payrollController.approvePayrollRecord);
router.post('/records/:id/mark-paid', authorizeRole('admin', 'hr'), payrollController.markPayrollAsPaid);

// Payslip Generation - Admin, HR, Staff (for viewing their own)
router.get('/records/:id/payslip', authorizeRole('admin', 'hr', 'staff'), payrollController.generatePayslip);

// Employee Salary Structure - Admin, HR
router.get('/employees/:employeeId/salary-structure', authorizeRole('admin', 'hr'), payrollController.getEmployeeSalaryStructure);
router.post('/employees/:employeeId/salary-structure', authorizeRole('admin', 'hr'), payrollController.saveEmployeeSalaryStructure);

module.exports = router;

