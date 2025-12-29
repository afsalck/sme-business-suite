/**
 * Verification Script: Check if companyId exists in all tables
 * 
 * This script verifies that all tenant-specific tables have the companyId column.
 * 
 * Usage:
 *   node scripts/verify-companyid.js
 */

const { sequelize } = require('../server/config/database');
const { QueryTypes } = require('sequelize');

// All tables that should have companyId
const tablesToCheck = [
  'users',
  'invoices',
  'inventoryItems',
  'sales',
  'employees',
  'expenses',
  'leaveRequests',
  'contracts',
  'notifications',
  'journal_entry_lines',
  'vat_filing_items',
  'payment_allocations',
  'companies',
  'company_email_domains',
  'clients',
  'custom_reports',
  'scheduled_reports',
  'report_templates',
  'report_executions',
  'kyc_audit_log',
  'aml_screenings',
  'kyc_documents',
  'vat_filings',
  'payments',
  'employee_attendance',
  'employee_leave_records',
  'employee_salary_structure',
  'payroll_periods',
  'payroll_records',
  'general_ledger',
  'journal_entries',
  'financial_periods',
  'chart_of_accounts',
  'vat_adjustments',
  'company_vat_settings'
];

async function verifyCompanyIdColumns() {
  try {
    console.log('🔍 Verifying companyId columns in all tables...\n');
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    const results = {
      hasCompanyId: [],
      missingCompanyId: [],
      tableNotFound: []
    };

    for (const tableName of tablesToCheck) {
      try {
        const query = `
          SELECT COUNT(*) as columnExists
          FROM sys.columns 
          WHERE object_id = OBJECT_ID(N'${tableName}') 
          AND name = 'companyId'
        `;
        
        const queryResults = await sequelize.query(query, { type: QueryTypes.SELECT });
        const columnExists = queryResults[0]?.columnExists > 0;

        if (columnExists) {
          results.hasCompanyId.push(tableName);
          console.log(`✅ ${tableName.padEnd(35)} - companyId exists`);
        } else {
          // Check if table exists
          const tableCheckQuery = `
            SELECT COUNT(*) as tableExists
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME = '${tableName}'
          `;
          const tableQueryResults = await sequelize.query(tableCheckQuery, { type: QueryTypes.SELECT });
          const tableExists = tableQueryResults[0]?.tableExists > 0;

          if (tableExists) {
            results.missingCompanyId.push(tableName);
            console.log(`❌ ${tableName.padEnd(35)} - companyId MISSING`);
          } else {
            results.tableNotFound.push(tableName);
            console.log(`⚠️  ${tableName.padEnd(35)} - Table not found (may not be created yet)`);
          }
        }
      } catch (error) {
        console.error(`❌ Error checking ${tableName}:`, error.message);
        results.missingCompanyId.push(tableName);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 VERIFICATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Tables with companyId:     ${results.hasCompanyId.length}`);
    console.log(`❌ Tables missing companyId:  ${results.missingCompanyId.length}`);
    console.log(`⚠️  Tables not found:         ${results.tableNotFound.length}`);
    console.log(`📋 Total tables checked:      ${tablesToCheck.length}`);

    if (results.missingCompanyId.length > 0) {
      console.log('\n❌ Tables missing companyId:');
      results.missingCompanyId.forEach(table => {
        console.log(`   - ${table}`);
      });
      console.log('\n💡 Run the migration script: node scripts/add-companyid-migration.js');
    }

    if (results.tableNotFound.length > 0) {
      console.log('\n⚠️  Tables not found (may need to be created):');
      results.tableNotFound.forEach(table => {
        console.log(`   - ${table}`);
      });
    }

    if (results.missingCompanyId.length === 0 && results.tableNotFound.length === 0) {
      console.log('\n🎉 SUCCESS! All tables have companyId column!');
    }

    process.exit(results.missingCompanyId.length > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

// Run verification
verifyCompanyIdColumns();

