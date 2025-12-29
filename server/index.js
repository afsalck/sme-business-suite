// Set up error handlers FIRST, before anything else
process.on('unhandledRejection', (reason, promise) => {
  console.error('\n❌ Unhandled Rejection:');
  if (reason instanceof Error) {
    console.error('   Message:', reason.message);
    console.error('   Name:', reason.name);
    if (reason.stack) {
      console.error('   Stack:', reason.stack.split('\n').slice(0, 5).join('\n'));
    }
  } else {
    console.error('   Reason:', reason);
  }
  // Don't exit - let the server continue running
});

process.on('uncaughtException', (error) => {
  console.error('\n❌ Uncaught Exception - Server will crash:');
  console.error('   Message:', error.message);
  console.error('   Name:', error.name);
  if (error.stack) {
    console.error('   Stack:', error.stack.split('\n').slice(0, 10).join('\n'));
  }
  // Wait a bit to ensure logs are written
  setTimeout(() => {
    console.error('\n⚠️  Server exiting due to uncaught exception...');
    process.exit(1);
  }, 2000);
});

const path = require("path");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const { sequelize, testConnection } = require("./config/database");
const { verifyFirebaseToken } = require("./middleware/authMiddleware");
const { scheduleAlerts } = require("./services/alertService");
const { killProcessOnPort } = require("./utils/portCleanup");
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

dotenv.config({
  path: path.resolve(__dirname, "..", ".env")
});

const app = express();
const PORT = process.env.PORT || 5004;

// Global server reference to keep it alive
let globalServer = null;

const corsOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true
  })
);

app.use(bodyParser.json({ limit: "2mb" }));
app.use(bodyParser.urlencoded({ extended: true }));

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'BizEase UAE API Documentation'
}));

app.get("/health", async (_, res) => {
  // Test SQL Server connection
  let dbStatus = "disconnected";
  let dbPing = null;
  
  try {
    const start = Date.now();
    await sequelize.authenticate();
    dbStatus = "connected";
    dbPing = Date.now() - start;
  } catch (error) {
    dbStatus = "error";
    dbPing = `error: ${error.message}`;
  }
  
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    database: {
      type: "SQL Server",
      state: dbStatus,
      ping: dbPing
    }
  });
});

app.use("/api", verifyFirebaseToken);

// Load routes with error handling
try {
  app.use("/api/auth", require("../routes/authRoutes"));
  console.log("✓ Auth routes loaded");
} catch (error) {
  console.error("✗ Failed to load auth routes:", error.message);
}

try {
  app.use("/api/invoices", require("../routes/invoiceRoutes"));
  console.log("✓ Invoice routes loaded");
} catch (error) {
  console.error("✗ Failed to load invoice routes:", error.message);
}

try {
  app.use("/api/employees", require("../routes/employeeRoutes"));
  console.log("✓ Employee routes loaded");
} catch (error) {
  console.error("✗ Failed to load employee routes:", error.message);
}

try {
  const inventoryRouter = require("../routes/inventoryRoutes");
  app.use("/api/inventory", inventoryRouter);
  console.log("✓ Inventory routes loaded");
  console.log("   Available routes: /api/inventory/*");
} catch (error) {
  console.error("✗ Failed to load inventory routes:", error.message);
  console.error("   Error stack:", error.stack);
}

try {
  app.use("/api/expenses", require("../routes/expenseRoutes"));
  console.log("✓ Expense routes loaded");
} catch (error) {
  console.error("✗ Failed to load expense routes:", error.message);
}

try {
  app.use("/api/dashboard", require("../routes/dashboardRoutes"));
  console.log("✓ Dashboard routes loaded");
} catch (error) {
  console.error("✗ Failed to load dashboard routes:", error.message);
  console.error("Error details:", error);
}

try {
  app.use("/api/company", require("../routes/companyRoutes"));
  console.log("✓ Company routes loaded");
} catch (error) {
  console.error("✗ Failed to load company routes:", error.message);
}

try {
  app.use("/api/hr", require("../routes/hrRoutes"));
  console.log("✓ HR routes loaded");
} catch (error) {
  console.error("✗ Failed to load HR routes:", error.message);
  console.error("Error details:", error);
}

try {
  app.use("/api/vat", require("../routes/vatRoutes"));
  console.log("✓ VAT routes loaded");
} catch (error) {
  console.error("✗ Failed to load VAT routes:", error.message);
}

try {
  app.use("/api/vat-filings", require("../routes/vatFilingRoutes"));
  console.log("✓ VAT Filing routes loaded");
} catch (error) {
  console.error("✗ Failed to load VAT Filing routes:", error.message);
}

try {
  app.use("/api/kyc", require("../routes/kycRoutes"));
  console.log("✓ KYC/AML routes loaded");
} catch (error) {
  console.error("✗ Failed to load KYC/AML routes:", error.message);
}

try {
  app.use("/api/reports", require("../routes/reportRoutes"));
  console.log("✓ Reports & Analytics routes loaded");
} catch (error) {
  console.error("✗ Failed to load Reports & Analytics routes:", error.message);
}

try {
  app.use("/api/notifications", require("../routes/notificationRoutes"));
  console.log("✓ Notification routes loaded");
} catch (error) {
  console.error("✗ Failed to load notification routes:", error.message);
}

try {
  app.use("/api/accounting", require("../routes/accountingRoutes"));
  console.log("✓ Accounting routes loaded");
} catch (error) {
  console.error("✗ Failed to load accounting routes:", error.message);
}

try {
  app.use("/api/payroll", require("../routes/payrollRoutes"));
  console.log("✓ Payroll routes loaded");
} catch (error) {
  console.error("✗ Failed to load payroll routes:", error.message);
}

try {
  app.use("/api/payments", require("../routes/paymentRoutes"));
  console.log("✓ Payment routes loaded");
} catch (error) {
  console.error("✗ Failed to load payment routes:", error.message);
}

// 404 handler for API routes (must be LAST, after all routes are registered)
// This catches any API requests that didn't match any route
app.all("/api/*", (req, res) => {
  console.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  console.warn(`Request path: ${req.path}`);
  console.warn(`Request baseUrl: ${req.baseUrl}`);
  console.warn(`Available routes: /api/auth, /api/invoices, /api/employees, /api/inventory, /api/expenses, /api/dashboard, /api/accounting, /api/payroll, /api/vat, /api/vat-filings, /api/payments, /api/kyc, /api/reports, /api/hr, /api/notifications`);
  
  res.status(404).json({ 
    message: "API endpoint not found",
    path: req.originalUrl,
    method: req.method,
    availableRoutes: ["/api/auth", "/api/invoices", "/api/employees", "/api/inventory", "/api/expenses", "/api/dashboard", "/api/accounting", "/api/payroll", "/api/vat", "/api/vat-filings", "/api/payments", "/api/kyc", "/api/reports", "/api/hr", "/api/notifications"]
  });
});

// Serve static files from React build folder
const buildPath = path.join(__dirname, "..", "client", "build");
app.use(express.static(buildPath));

// Catch-all handler: send back React's index.html file for any non-API routes
// This allows React Router to handle client-side routing
app.get("*", (req, res) => {
  // Only handle GET requests (not API routes)
  if (req.method === "GET" && !req.path.startsWith("/api")) {
    const indexPath = path.join(buildPath, "index.html");
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error("Failed to send index.html:", err);
        res.status(500).json({ message: "Failed to load application" });
      }
    });
  } else {
    res.status(404).json({ message: "Not found" });
  }
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Unexpected error occurred" });
});

async function bootstrap() {
  try {
    // Connect to SQL Server
    console.log('🔄 Connecting to SQL Server...');
    const connected = await testConnection();
    
    if (!connected) {
      console.warn('⚠️  SQL Server connection failed. Server will start but database features may not work.');
      console.warn('   Please check your SQL Server connection settings in .env file.');
    } else {
      console.log("✅ Connected to SQL Server successfully");
      console.log(`   Database: ${process.env.DB_NAME || 'bizease'}`);
    }

    // Schedule alerts with error handling
    try {
      scheduleAlerts();
    } catch (alertError) {
      console.warn("⚠️  Failed to schedule alerts:", alertError.message);
      console.warn("   Server will continue without scheduled alerts");
      // Don't crash the server if alerts fail
    }

    // Schedule HR reminders (document expiry checks)
    try {
      const { checkExpiringDocuments } = require("./services/hrReminderService");
      const cron = require("node-cron");
      
      // Run daily at 9 AM
      cron.schedule("0 9 * * *", async () => {
        console.log("[HR Reminder] Running daily document expiry check...");
        await checkExpiringDocuments();
      });
      
      console.log("✓ HR reminder cron job scheduled (daily at 9 AM)");
    } catch (hrError) {
      console.warn("⚠️  Failed to schedule HR reminders:", hrError.message);
      // Don't crash the server if HR reminders fail
    }

    // Schedule notification cron job
    try {
      const { scheduleNotificationCron } = require("./services/notificationCron");
      scheduleNotificationCron();
    } catch (notifError) {
      console.warn("⚠️  Failed to schedule notification cron job:", notifError.message);
      // Don't crash the server if notifications fail
    }

    // Clean up any process using the port before starting
    console.log(`Checking port ${PORT}...`);
    try {
      await killProcessOnPort(PORT);
    } catch (portError) {
      console.warn("⚠️  Port cleanup warning:", portError.message);
      // Continue anyway
    }
    
    // Small delay to ensure port is released
    await new Promise(resolve => setTimeout(resolve, 1000));

    const server = app.listen(PORT, () => {
      console.log(`✅ Server listening on port ${PORT}`);
      console.log(`   Health check: http://localhost:${PORT}/health`);
      console.log(`   API base: http://localhost:${PORT}/api`);
    });
    
    // Store server globally to prevent garbage collection
    globalServer = server;

    // Handle server errors (like port already in use)
    server.on('error', async (error) => {
      console.error("❌ Server error event:", error.message);
      if (error.code === 'EADDRINUSE') {
        console.log(`\n⚠️  Port ${PORT} is still in use. Attempting to clean up...`);
        try {
          await killProcessOnPort(PORT);
          await new Promise(resolve => setTimeout(resolve, 2000));
          console.log("✓ Port cleaned up. Please restart the server (nodemon should auto-restart).");
        } catch (cleanupError) {
          console.error("Failed to clean up port:", cleanupError.message);
        }
      } else {
        console.error("Server error details:", error);
      }
    });

    // Keep the process alive
    server.on('close', () => {
      console.log("Server closed");
    });

    // Prevent process from exiting - but only set handlers once
    if (!process.listeners('SIGTERM').length) {
      process.on('SIGTERM', async () => {
        console.log('SIGTERM received, closing server...');
        server.close(async () => {
          console.log('Server closed');
          await sequelize.close();
          process.exit(0);
        });
      });
    }

    if (!process.listeners('SIGINT').length) {
      process.on('SIGINT', async () => {
        console.log('\nSIGINT received, closing server...');
        server.close(async () => {
          console.log('Server closed');
          await sequelize.close();
          process.exit(0);
        });
      });
    }

    console.log("✅ Server startup complete");
    
    // Keep server reference to prevent garbage collection
    // This ensures the server stays alive
    return server; // Return server to keep it in scope
  } catch (error) {
    console.error("\n❌ Failed to start server:", error.message);
    
    // SQL Server connection errors
    if (error.name === 'SequelizeConnectionError' || error.name === 'SequelizeConnectionRefusedError') {
      console.error("\n🔍 SQL Server Connection Troubleshooting:");
      console.error("   1. Check if DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD are correct in your .env file");
      console.error("   2. Verify SQL Server is running");
      console.error("   3. Check if SQL Server allows remote connections");
      console.error("   4. Verify SQL Server authentication (Windows Auth vs SQL Auth)");
      console.error(`\n   Error details: ${error.message}`);
    } else if (error.code === 'EADDRINUSE') {
      console.log(`\n⚠️  Port ${PORT} is in use. Attempting to clean up...`);
      killProcessOnPort(PORT).then(() => {
        console.log("✓ Port cleaned up. Please restart the server.");
      });
    } else {
      console.error(`\n   Error type: ${error.name}`);
      console.error(`   Error code: ${error.code || 'N/A'}`);
    }
    
    // Don't exit on database errors - let the server start anyway
    // Routes will handle disconnected state gracefully
    if (error.code !== 'EADDRINUSE') {
      console.warn("\n⚠️  Starting server without database connection.");
      console.warn("   Some features may not work until database is connected.");
      
      // Start server anyway
      console.log(`\nChecking port ${PORT}...`);
      await killProcessOnPort(PORT);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const server = app.listen(PORT, () => {
        console.log(`✅ Server listening on port ${PORT} (Database disconnected)`);
      });
      
      // Store server globally to prevent garbage collection
      globalServer = server;
      
      server.on('error', async (err) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`\n⚠️  Port ${PORT} is still in use. Attempting to clean up...`);
          await killProcessOnPort(PORT);
          await new Promise(resolve => setTimeout(resolve, 2000));
          console.log("✓ Port cleaned up. Please restart the server.");
        }
      });
      
      // Return server to keep it alive
      return server;
    }
    
    process.exit(1);
  }
}

// Start the server
bootstrap().catch((error) => {
  console.error("\n❌ Bootstrap failed:", error.message);
  console.error("   Stack:", error.stack);
  // Don't exit immediately - let error handlers deal with it
  setTimeout(() => {
    process.exit(1);
  }, 2000);
});

