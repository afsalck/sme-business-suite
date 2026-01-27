/**
 * UAE Labor Law Calculation Service
 * Compliant with UAE Federal Law No. 8 of 1980 and amendments
 */

const dayjs = require('dayjs');
const { sequelize } = require('../config/database');

/**
 * Calculate gratuity based on UAE Labor Law
 * 
 * Rules:
 * - Less than 1 year: No gratuity
 * - 1-5 years: 21 days basic salary per year
 * - More than 5 years: 30 days basic salary per year
 * - Maximum: 2 years' salary
 * 
 * @param {Object} params
 * @param {number} params.basicSalary - Basic salary amount
 * @param {Date} params.joiningDate - Employee joining date
 * @param {Date} params.endDate - End date (current date or termination date)
 * @param {string} params.terminationType - 'resignation' or 'termination'
 * @returns {Object} Gratuity calculation result
 */
function calculateGratuity({ basicSalary, joiningDate, endDate, terminationType = 'termination' }) {
  const joining = dayjs(joiningDate);
  const end = dayjs(endDate);
  const yearsOfService = end.diff(joining, 'year', true); // Decimal years
  const daysOfService = end.diff(joining, 'day');
  
  let gratuityAmount = 0;
  let gratuityDays = 0;
  let calculationDetails = {
    yearsOfService: parseFloat(yearsOfService.toFixed(2)),
    daysOfService,
    basicSalary: parseFloat(basicSalary),
    terminationType
  };

  // Less than 1 year: No gratuity
  if (yearsOfService < 1) {
    return {
      gratuityAmount: 0,
      gratuityDays: 0,
      calculationDetails: {
        ...calculationDetails,
        reason: 'Less than 1 year of service - no gratuity under UAE law'
      }
    };
  }

  // Calculate daily basic salary
  const dailyBasicSalary = basicSalary / 30; // UAE standard: 30 days per month

  // 1-5 years: 21 days per year
  if (yearsOfService >= 1 && yearsOfService < 5) {
    gratuityDays = 21 * yearsOfService;
    gratuityAmount = dailyBasicSalary * gratuityDays;
    
    // For resignation in first 3 years: reduce by 1/3
    if (terminationType === 'resignation' && yearsOfService < 3) {
      gratuityAmount = gratuityAmount * (2/3);
      calculationDetails.reduction = 'Resignation within 3 years: 1/3 reduction applied';
    }
  }
  // More than 5 years: 30 days per year
  else if (yearsOfService >= 5) {
    gratuityDays = 30 * yearsOfService;
    gratuityAmount = dailyBasicSalary * gratuityDays;
  }

  // Maximum cap: 2 years' salary
  const maxGratuity = basicSalary * 24; // 2 years
  if (gratuityAmount > maxGratuity) {
    gratuityAmount = maxGratuity;
    calculationDetails.capped = true;
    calculationDetails.maxGratuity = maxGratuity;
  }

  return {
    gratuityAmount: parseFloat(gratuityAmount.toFixed(2)),
    gratuityDays: parseFloat(gratuityDays.toFixed(2)),
    calculationDetails: {
      ...calculationDetails,
      dailyBasicSalary: parseFloat(dailyBasicSalary.toFixed(2)),
      gratuityDays,
      finalAmount: parseFloat(gratuityAmount.toFixed(2))
    }
  };
}

/**
 * Calculate annual leave entitlement
 * 
 * UAE Law:
 * - 30 days annual leave for employees with 1+ year service
 * - 2 days per month for employees with less than 1 year
 * - Leave accrues monthly
 * 
 * @param {Object} params
 * @param {Date} params.joiningDate - Employee joining date
 * @param {Date} params.asOfDate - Date to calculate as of
 * @param {number} params.usedLeaveDays - Already used leave days
 * @returns {Object} Leave calculation result
 */
function calculateAnnualLeave({ joiningDate, asOfDate, usedLeaveDays = 0 }) {
  const joining = dayjs(joiningDate);
  const asOf = dayjs(asOfDate);
  const monthsOfService = asOf.diff(joining, 'month', true);
  const yearsOfService = asOf.diff(joining, 'year', true);

  let entitledDays = 0;
  let accruedDays = 0;

  if (yearsOfService >= 1) {
    // Full year: 30 days per year
    entitledDays = 30 * yearsOfService;
    // Accrual: 2.5 days per month (30 days / 12 months)
    accruedDays = 2.5 * monthsOfService;
  } else {
    // Less than 1 year: 2 days per month
    accruedDays = 2 * monthsOfService;
    entitledDays = accruedDays;
  }

  const availableDays = Math.max(0, accruedDays - usedLeaveDays);
  const pendingDays = Math.max(0, usedLeaveDays - accruedDays);

  return {
    entitledDays: parseFloat(entitledDays.toFixed(2)),
    accruedDays: parseFloat(accruedDays.toFixed(2)),
    usedDays: parseFloat(usedLeaveDays),
    availableDays: parseFloat(availableDays.toFixed(2)),
    pendingDays: parseFloat(pendingDays.toFixed(2)),
    calculationDetails: {
      monthsOfService: parseFloat(monthsOfService.toFixed(2)),
      yearsOfService: parseFloat(yearsOfService.toFixed(2)),
      accrualRate: yearsOfService >= 1 ? 2.5 : 2
    }
  };
}

/**
 * Calculate annual leave payment (if leave is encashed)
 * 
 * @param {Object} params
 * @param {number} params.basicSalary - Basic salary
 * @param {number} params.leaveDays - Number of leave days to encash
 * @returns {number} Leave encashment amount
 */
function calculateLeaveEncashment({ basicSalary, leaveDays }) {
  const dailyBasicSalary = basicSalary / 30;
  return parseFloat((dailyBasicSalary * leaveDays).toFixed(2));
}

/**
 * Calculate overtime payment
 * 
 * UAE Law:
 * - Overtime: 125% of regular hourly rate (1.25x)
 * - Night work (10 PM - 4 AM): 150% of regular hourly rate (1.5x)
 * - Weekend/Public Holiday: 150% of regular hourly rate (1.5x)
 * 
 * @param {Object} params
 * @param {number} params.basicSalary - Basic salary
 * @param {number} params.overtimeHours - Number of overtime hours
 * @param {string} params.overtimeType - 'regular', 'night', 'weekend', 'holiday'
 * @returns {Object} Overtime calculation result
 */
function calculateOvertime({ basicSalary, overtimeHours, overtimeType = 'regular' }) {
  // Calculate hourly rate (assuming 8 hours per day, 30 days per month)
  const monthlyHours = 8 * 30; // 240 hours per month
  const hourlyRate = basicSalary / monthlyHours;

  let overtimeRate = 1.25; // Default: 125%
  let overtimeTypeLabel = 'Regular Overtime';

  switch (overtimeType) {
    case 'night':
      overtimeRate = 1.5; // 150%
      overtimeTypeLabel = 'Night Overtime (10 PM - 4 AM)';
      break;
    case 'weekend':
      overtimeRate = 1.5; // 150%
      overtimeTypeLabel = 'Weekend Overtime';
      break;
    case 'holiday':
      overtimeRate = 1.5; // 150%
      overtimeTypeLabel = 'Public Holiday Overtime';
      break;
    default:
      overtimeRate = 1.25; // 125%
      overtimeTypeLabel = 'Regular Overtime';
  }

  const overtimeHourlyRate = hourlyRate * overtimeRate;
  const overtimeAmount = overtimeHourlyRate * overtimeHours;

  return {
    overtimeHours: parseFloat(overtimeHours),
    hourlyRate: parseFloat(hourlyRate.toFixed(2)),
    overtimeRate: parseFloat(overtimeRate),
    overtimeHourlyRate: parseFloat(overtimeHourlyRate.toFixed(2)),
    overtimeAmount: parseFloat(overtimeAmount.toFixed(2)),
    overtimeType: overtimeTypeLabel,
    calculationDetails: {
      monthlyHours,
      basicSalary,
      overtimeType
    }
  };
}

/**
 * Calculate end of service benefits
 * Includes: Gratuity + Accrued Leave + Any other benefits
 * 
 * @param {Object} params
 * @param {number} params.basicSalary - Basic salary
 * @param {Date} params.joiningDate - Employee joining date
 * @param {Date} params.terminationDate - Termination date
 * @param {string} params.terminationType - 'resignation' or 'termination'
 * @param {number} params.accruedLeaveDays - Accrued but unused leave days
 * @returns {Object} End of service calculation
 */
function calculateEndOfServiceBenefits({ 
  basicSalary, 
  joiningDate, 
  terminationDate, 
  terminationType = 'termination',
  accruedLeaveDays = 0 
}) {
  // Calculate gratuity
  const gratuity = calculateGratuity({
    basicSalary,
    joiningDate,
    endDate: terminationDate,
    terminationType
  });

  // Calculate leave encashment
  const leaveEncashment = accruedLeaveDays > 0 
    ? calculateLeaveEncashment({ basicSalary, leaveDays: accruedLeaveDays })
    : 0;

  const totalBenefits = gratuity.gratuityAmount + leaveEncashment;

  return {
    gratuity: gratuity.gratuityAmount,
    leaveEncashment,
    totalBenefits: parseFloat(totalBenefits.toFixed(2)),
    breakdown: {
      gratuityDetails: gratuity,
      leaveDays: accruedLeaveDays,
      leaveEncashmentAmount: leaveEncashment
    }
  };
}

/**
 * Get UAE public holidays for a given year
 * 
 * @param {number} year - Year to get holidays for
 * @returns {Array} Array of public holiday dates
 */
function getUAEPublicHolidays(year) {
  // UAE Public Holidays (approximate - actual dates vary by moon sighting)
  const holidays = [
    // New Year
    `${year}-01-01`,
    // Eid al-Fitr (3 days - approximate, actual dates vary)
    // Eid al-Adha (3 days - approximate, actual dates vary)
    // National Day
    `${year}-12-02`,
    `${year}-12-03`
  ];

  // Note: Islamic holidays (Eid) dates are based on moon sighting
  // In production, you should use a proper Islamic calendar library
  // or fetch from an API

  return holidays.map(date => dayjs(date).toDate());
}

/**
 * Calculate working days in a period (excluding weekends and holidays)
 * 
 * @param {Object} params
 * @param {Date} params.startDate - Start date
 * @param {Date} params.endDate - End date
 * @param {Array} params.holidays - Array of holiday dates (optional)
 * @returns {Object} Working days calculation
 */
function calculateWorkingDays({ startDate, endDate, holidays = [] }) {
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  let workingDays = 0;
  let weekends = 0;
  let publicHolidays = 0;

  let current = start;
  while (current.isBefore(end) || current.isSame(end, 'day')) {
    const dayOfWeek = current.day(); // 0 = Sunday, 6 = Saturday
    
    // Check if it's a weekend (Friday = 5, Saturday = 6 in UAE)
    if (dayOfWeek === 5 || dayOfWeek === 6) {
      weekends++;
    } else {
      // Check if it's a public holiday
      const isHoliday = holidays.some(holiday => 
        dayjs(holiday).isSame(current, 'day')
      );
      
      if (isHoliday) {
        publicHolidays++;
      } else {
        workingDays++;
      }
    }
    
    current = current.add(1, 'day');
  }

  return {
    totalDays: end.diff(start, 'day') + 1,
    workingDays,
    weekends,
    publicHolidays,
    nonWorkingDays: weekends + publicHolidays
  };
}

module.exports = {
  calculateGratuity,
  calculateAnnualLeave,
  calculateLeaveEncashment,
  calculateOvertime,
  calculateEndOfServiceBenefits,
  getUAEPublicHolidays,
  calculateWorkingDays
};

