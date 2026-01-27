/**
 * Log Monitoring Helper: Check CompanyId in Logs
 * 
 * This script helps you monitor and verify that companyId is being set correctly.
 * 
 * Usage:
 *   node scripts/check-companyid-logs.js
 * 
 * Or add this to your server startup to enable detailed logging.
 */

const fs = require('fs');
const path = require('path');

/**
 * Enhanced logging function for companyId monitoring
 * Add this to your middleware or routes to track companyId usage
 */
function logCompanyIdContext(req, operation = 'REQUEST') {
  const logEntry = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    operation,
    user: req.user ? {
      uid: req.user.uid,
      email: req.user.email,
      role: req.user.role
    } : null,
    companyId: req.companyId || 'NOT SET',
    hasCompanyId: !!req.companyId
  };

  // Log to console with color coding
  const status = logEntry.hasCompanyId ? '✅' : '❌';
  console.log(`${status} [CompanyId] ${operation} ${req.method} ${req.path}`);
  console.log(`   User: ${logEntry.user?.email || 'Unknown'}`);
  console.log(`   CompanyId: ${logEntry.companyId}`);
  
  // Optionally log to file
  if (process.env.LOG_COMPANYID_TO_FILE === 'true') {
    const logFile = path.join(__dirname, '..', 'logs', 'companyid.log');
    const logDir = path.dirname(logFile);
    
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
  }

  return logEntry;
}

/**
 * Check recent logs for companyId issues
 */
function analyzeLogs() {
  const logFile = path.join(__dirname, '..', 'logs', 'companyid.log');
  
  if (!fs.existsSync(logFile)) {
    console.log('⚠️  No log file found. Enable logging by setting LOG_COMPANYID_TO_FILE=true');
    return;
  }

  const logs = fs.readFileSync(logFile, 'utf8')
    .split('\n')
    .filter(line => line.trim())
    .map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        return null;
      }
    })
    .filter(log => log !== null);

  console.log(`\n📊 Analyzing ${logs.length} log entries...\n`);

  const issues = [];
  const companyIdCounts = {};

  logs.forEach(log => {
    // Count companyId usage
    const cid = log.companyId || 'NULL';
    companyIdCounts[cid] = (companyIdCounts[cid] || 0) + 1;

    // Check for issues
    if (!log.hasCompanyId) {
      issues.push({
        timestamp: log.timestamp,
        path: log.path,
        user: log.user?.email,
        issue: 'Missing companyId'
      });
    }

    if (log.companyId === 'NOT SET') {
      issues.push({
        timestamp: log.timestamp,
        path: log.path,
        user: log.user?.email,
        issue: 'companyId not set in request'
      });
    }
  });

  console.log('📈 CompanyId Distribution:');
  Object.entries(companyIdCounts).forEach(([cid, count]) => {
    console.log(`   CompanyId ${cid}: ${count} requests`);
  });

  if (issues.length > 0) {
    console.log(`\n❌ Found ${issues.length} issues:`);
    issues.slice(0, 10).forEach(issue => {
      console.log(`   - ${issue.timestamp}: ${issue.path} (${issue.user}) - ${issue.issue}`);
    });
    if (issues.length > 10) {
      console.log(`   ... and ${issues.length - 10} more issues`);
    }
  } else {
    console.log('\n✅ No issues found in logs!');
  }
}

// Export functions
if (require.main === module) {
  // If run directly, analyze logs
  analyzeLogs();
} else {
  // If imported, export the logging function
  module.exports = { logCompanyIdContext, analyzeLogs };
}

