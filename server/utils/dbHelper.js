// Database helper utilities
const mongoose = require('mongoose');

/**
 * Check if MongoDB is ready for operations
 */
function isDbReady() {
  return mongoose.connection.readyState === 1; // 1 = connected
}

/**
 * Execute a MongoDB operation with timeout and connection check
 */
async function executeWithTimeout(operation, timeoutMs = 5000) {
  if (!isDbReady()) {
    throw new Error('Database not connected');
  }

  return Promise.race([
    operation,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database operation timeout')), timeoutMs)
    )
  ]);
}

/**
 * Safe find operation with timeout
 */
async function safeFind(Model, query = {}, options = {}) {
  if (!isDbReady()) {
    return [];
  }
  
  try {
    return await executeWithTimeout(
      Model.find(query).maxTimeMS(5000).lean(),
      options.timeout || 5000
    );
  } catch (error) {
    console.warn(`[DB] Find operation failed: ${error.message}`);
    return [];
  }
}

/**
 * Safe create operation with timeout
 */
async function safeCreate(Model, data, options = {}) {
  if (!isDbReady()) {
    throw new Error('Database not connected');
  }
  
  try {
    return await executeWithTimeout(
      Model.create(data),
      options.timeout || 10000
    );
  } catch (error) {
    console.error(`[DB] Create operation failed: ${error.message}`);
    throw error;
  }
}

module.exports = {
  isDbReady,
  executeWithTimeout,
  safeFind,
  safeCreate
};

