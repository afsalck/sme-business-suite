/**
 * Create Company Email Domains Table
 * 
 * This script creates the company_email_domains table for dynamic email domain mapping.
 * 
 * Usage:
 *   node scripts/create-company-email-domains-table.js
 */

const { sequelize } = require('../server/config/database');

async function createCompanyEmailDomainsTable() {
  try {
    console.log('🔄 Creating company_email_domains table...');
    await sequelize.authenticate();
    console.log('✅ Database connected');

    const createTableQuery = `
      IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'company_email_domains') AND type in (N'U'))
      BEGIN
        CREATE TABLE company_email_domains (
          id INT PRIMARY KEY IDENTITY(1,1),
          companyId INT NOT NULL,
          emailDomain VARCHAR(255) NOT NULL,
          isActive BIT NOT NULL DEFAULT 1,
          createdAt DATETIME DEFAULT GETDATE(),
          updatedAt DATETIME DEFAULT GETDATE()
        );

        CREATE UNIQUE INDEX IX_CompanyEmailDomains_Domain ON company_email_domains(emailDomain);
        CREATE INDEX IX_CompanyEmailDomains_CompanyId ON company_email_domains(companyId);
        CREATE INDEX IX_CompanyEmailDomains_IsActive ON company_email_domains(isActive);

        PRINT '✅ Created company_email_domains table';
      END
      ELSE
        PRINT '⏭️  company_email_domains table already exists';
    `;

    await sequelize.query(createTableQuery);
    console.log('✅ Table creation query executed');

    // Migrate existing mappings from authMiddleware.js
    console.log('\n📋 Migrating existing email domain mappings...');
    
    // Get existing mappings (you can customize these)
    const existingMappings = [
      { domain: 'biz.com', companyId: 2 },
      { domain: 'customerb.com', companyId: 2 },
      { domain: 'testcompany.com', companyId: 3 }
    ];

    for (const mapping of existingMappings) {
      try {
        const insertQuery = `
          IF NOT EXISTS (SELECT * FROM company_email_domains WHERE emailDomain = :domain)
          BEGIN
            INSERT INTO company_email_domains (companyId, emailDomain, isActive)
            VALUES (:companyId, :domain, 1);
            PRINT 'Inserted: ' + :domain + ' → companyId ' + CAST(:companyId AS VARCHAR);
          END
        `;
        
        await sequelize.query(insertQuery, {
          replacements: {
            domain: mapping.domain,
            companyId: mapping.companyId
          },
          type: sequelize.QueryTypes.INSERT
        });
        console.log(`  ✅ Migrated: ${mapping.domain} → companyId ${mapping.companyId}`);
      } catch (error) {
        if (error.message && error.message.includes('duplicate')) {
          console.log(`  ⏭️  ${mapping.domain} already exists, skipping`);
        } else {
          console.error(`  ❌ Error migrating ${mapping.domain}:`, error.message);
        }
      }
    }

    // Verify
    const verifyQuery = `
      SELECT companyId, emailDomain, isActive
      FROM company_email_domains
      ORDER BY companyId, emailDomain;
    `;
    
    const results = await sequelize.query(verifyQuery, {
      type: sequelize.QueryTypes.SELECT
    });

    console.log('\n📊 Current email domain mappings:');
    if (results.length > 0) {
      results.forEach(row => {
        console.log(`   ${row.emailDomain} → companyId ${row.companyId} (${row.isActive ? 'Active' : 'Inactive'})`);
      });
    } else {
      console.log('   No mappings found');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Setup completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Update authMiddleware.js to use database mappings');
    console.log('2. Create admin UI to manage email domain mappings');
    console.log('3. Restart server');
    console.log('='.repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

createCompanyEmailDomainsTable();

