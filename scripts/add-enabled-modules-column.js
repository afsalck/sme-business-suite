/**
 * Migration script to add enabledModules column to companies table
 * 
 * Run from root: node scripts/add-enabled-modules-column.js
 */

const path = require('path');

// Get absolute paths
const rootDir = path.resolve(__dirname, '..');
const serverDir = path.join(rootDir, 'server');

// Add server's node_modules to module path
const Module = require('module');
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function(request, parent, isMain, options) {
  if (request === 'dotenv' || request.startsWith('dotenv/')) {
    try {
      return require.resolve(request, { paths: [path.join(serverDir, 'node_modules')] });
    } catch (e) {
      // Fall through to original
    }
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

// Now require database config
const { sequelize } = require(path.join(serverDir, 'config', 'database'));

async function addEnabledModulesColumn() {
  try {
    console.log('='.repeat(60));
    console.log('Migration: Adding enabledModules column to companies table');
    console.log('='.repeat(60));

    // Check if column already exists
    const checkColumnQuery = `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'companies' AND COLUMN_NAME = 'enabledModules'
    `;
    
    const [results] = await sequelize.query(checkColumnQuery);
    
    if (results.length > 0) {
      console.log('✓ Column enabledModules already exists. Skipping migration.');
      await sequelize.close();
      return;
    }

    // Add the column
    const addColumnQuery = `
      ALTER TABLE companies 
      ADD enabledModules NTEXT NULL
    `;

    await sequelize.query(addColumnQuery);
    console.log('✓ Successfully added enabledModules column');

    // Set default value for existing companies (null = all modules enabled)
    const updateExistingQuery = `
      UPDATE companies 
      SET enabledModules = NULL 
      WHERE enabledModules IS NULL
    `;

    await sequelize.query(updateExistingQuery);
    console.log('✓ Set default values for existing companies (null = all modules enabled)');

    console.log('='.repeat(60));
    console.log('Migration completed successfully!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('='.repeat(60));
    console.error('Migration failed:', error.message);
    console.error('='.repeat(60));
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    try {
      await sequelize.close();
    } catch (e) {
      // Ignore close errors
    }
  }
}

// Run migration
addEnabledModulesColumn();
