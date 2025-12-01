// Simple script to start both server and client
const { spawn } = require("child_process");
const path = require("path");

console.log("🚀 Starting BizEase UAE Application...\n");

// Start server
console.log("📦 Starting backend server...");
const server = spawn("npm", ["run", "dev"], {
  cwd: path.join(__dirname, "server"),
  shell: true,
  stdio: "inherit"
});

// Wait a bit for server to start, then start client
setTimeout(() => {
  console.log("\n🎨 Starting frontend client...");
  const client = spawn("npm", ["start"], {
    cwd: path.join(__dirname, "client"),
    shell: true,
    stdio: "inherit"
  });

  client.on("error", (error) => {
    console.error("❌ Failed to start client:", error.message);
  });
}, 3000);

server.on("error", (error) => {
  console.error("❌ Failed to start server:", error.message);
  console.error("\nMake sure you're in the project root directory.");
  process.exit(1);
});

// Handle cleanup
process.on("SIGINT", () => {
  console.log("\n\n🛑 Stopping application...");
  server.kill();
  process.exit(0);
});

