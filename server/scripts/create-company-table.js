/**
 * Create companies table if it doesn't exist
 * Run this script to ensure the table is created
 */

const { sequelize } = require('../config/database');

async function createCompanyTable() {
  try {
    console.log('[Company] Creating companies table...');
    
    await sequelize.query(`
      IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[companies]') AND type in (N'U'))
      BEGIN
        CREATE TABLE [dbo].[companies] (
          [id] INT IDENTITY(1,1) PRIMARY KEY,
          [companyId] INT NOT NULL UNIQUE DEFAULT 1,
          [name] NVARCHAR(255) NOT NULL DEFAULT 'BizEase UAE',
          [shopName] NVARCHAR(255) NULL,
          [address] NTEXT NULL,
          [trn] NVARCHAR(50) NULL,
          [email] NVARCHAR(255) NULL,
          [phone] NVARCHAR(50) NULL,
          [website] NVARCHAR(255) NULL,
          [logo] NVARCHAR(500) NULL,
          [createdAt] DATETIME NOT NULL DEFAULT GETDATE(),
          [updatedAt] DATETIME NOT NULL DEFAULT GETDATE()
        );
        
        PRINT 'Company table created successfully';
      END
      ELSE
      BEGIN
        PRINT 'Company table already exists';
      END
    `);
    
    console.log('[Company] ✓ Company table verified/created');
    
    // Insert default company if it doesn't exist
    await sequelize.query(`
      IF NOT EXISTS (SELECT * FROM [companies] WHERE [companyId] = 1)
      BEGIN
        INSERT INTO [companies] ([companyId], [name], [shopName], [address], [trn], [email], [phone], [website], [createdAt], [updatedAt])
        VALUES (1, 'BizEase UAE', NULL, 'Dubai, United Arab Emirates', '', 'info@bizease.ae', '+971 4 XXX XXXX', 'www.bizease.ae', GETDATE(), GETDATE());
        PRINT 'Default company created';
      END
    `);
    
    console.log('[Company] ✓ Default company verified/created');
    
    process.exit(0);
  } catch (error) {
    console.error('[Company] ✗ Failed to create company table:', error);
    process.exit(1);
  }
}

createCompanyTable();
