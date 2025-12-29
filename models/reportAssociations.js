/**
 * Report Model Associations
 * Centralizes associations to avoid circular dependencies
 */

const ReportTemplate = require('./ReportTemplate');
const CustomReport = require('./CustomReport');
const ScheduledReport = require('./ScheduledReport');
const ReportExecution = require('./ReportExecution');

// CustomReport can be based on a template
CustomReport.belongsTo(ReportTemplate, {
  foreignKey: 'templateId',
  as: 'template'
});

ReportTemplate.hasMany(CustomReport, {
  foreignKey: 'templateId',
  as: 'reports'
});

// ScheduledReport belongs to CustomReport
ScheduledReport.belongsTo(CustomReport, {
  foreignKey: 'reportId',
  as: 'report'
});

CustomReport.hasMany(ScheduledReport, {
  foreignKey: 'reportId',
  as: 'schedules'
});

// ReportExecution can reference CustomReport or ScheduledReport
ReportExecution.belongsTo(CustomReport, {
  foreignKey: 'reportId',
  as: 'report'
});

ReportExecution.belongsTo(ScheduledReport, {
  foreignKey: 'scheduledReportId',
  as: 'scheduledReport'
});

CustomReport.hasMany(ReportExecution, {
  foreignKey: 'reportId',
  as: 'executions'
});

ScheduledReport.hasMany(ReportExecution, {
  foreignKey: 'scheduledReportId',
  as: 'executions'
});

module.exports = {
  ReportTemplate,
  CustomReport,
  ScheduledReport,
  ReportExecution
};

