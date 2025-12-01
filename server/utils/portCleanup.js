// Utility to clean up processes using a specific port
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function killProcessOnPort(port) {
  try {
    // Find process using the port (Windows)
    const { stdout } = await execPromise(`netstat -ano | findstr :${port}`);
    
    if (!stdout.trim()) {
      return false; // No process found
    }

    // Extract PID from netstat output
    const lines = stdout.trim().split('\n');
    const pids = new Set();
    
    for (const line of lines) {
      const match = line.match(/\s+(\d+)\s*$/);
      if (match && match[1]) {
        pids.add(match[1]);
      }
    }

    // Kill all processes using the port
    for (const pid of pids) {
      try {
        await execPromise(`taskkill /F /PID ${pid}`);
        console.log(`✓ Killed process ${pid} using port ${port}`);
      } catch (err) {
        // Process might already be gone, ignore
      }
    }

    return true;
  } catch (error) {
    // No process found or error - that's okay
    return false;
  }
}

module.exports = { killProcessOnPort };

