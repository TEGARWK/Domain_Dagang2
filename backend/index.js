require("dotenv").config({ override: true });
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require('path');
const expressLayouts = require('express-ejs-layouts');

const app = express();
app.set('trust proxy', 1); // Enable trusting proxy headers (Nginx/Localtunnel)

app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
})); 
app.use(express.urlencoded({ limit: '10mb', extended: true }));
// --- CORS CONFIGURATION ---
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? (process.env.CLIENT_URL ? [process.env.CLIENT_URL] : [])
  : [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'https://5804-2404-8000-1024-5c35-957d-e8fd-a080-1807.ngrok-free.app'
    ];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    // In production, strictly check origin
    if (process.env.NODE_ENV === 'production') {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    } else {
      // Development: allow all origins
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'ngrok-skip-browser-warning', 'x-api-key'],
}));
app.use(cookieParser());

// --- LOGGING CONFIGURATION ---
// Only use detailed logging in development mode
const morgan = require('morgan');
if (process.env.NODE_ENV === 'production') {
    // In production, use combined format (standard Apache format) instead of dev
    app.use(morgan('combined'));
} else {
    // Development: detailed logging
    app.use(morgan('dev'));
}

// --- VIEW ENGINE SETUP ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'admin/layout');


// --- IMPORT ROUTES ---
// Note: Prismalink is DEPRECATED and disabled
// To re-enable, uncomment the import and route below
// const prismalinkRoutes = require("./routes/prismalink");

const authRoutes = require("./routes/auth");
const domainRoutes = require("./routes/domains");
const checkoutRoutes = require("./routes/checkout");
const billingRoutes = require("./routes/billing");
const daftarnamaRoutes = require("./routes/daftarnama");
const transferRoutes = require("./routes/transferRoutes");
const pricingRoutes = require('./routes/pricing');


// --- USE ROUTES ---
app.use("/api/auth", authRoutes);
app.use("/api/domains", domainRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/tripay", require("./routes/tripay"));
// app.use("/api/prismalink", prismalinkRoutes); // DEPRECATED
app.use("/api/daftarnama", daftarnamaRoutes);
app.use("/api/transfers", transferRoutes);
app.use("/api/users", require("./routes/users"));
app.use("/api/pricing", require("./routes/pricing"));
app.use("/api/content", require("./routes/content"));
app.use("/api/payment-gateways", require("./routes/paymentGateways"));
app.use("/api/admin", require("./routes/admin"));
app.get('/api/uploads/:filename', (req, res) => {
  res.sendFile(path.join(__dirname, 'uploads', req.params.filename));
});
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/wallet", require("./routes/wallet"));
app.use("/api/upload", require("./routes/upload"));
app.use("/api/faqs", require("./routes/faqRoutes"));
app.use("/api/support/tickets", require("./routes/supportTicketRoutes"));

app.use("/api/vouchers", require("./routes/vouchers"));
app.use("/api/regions", require("./routes/regions"));
app.use("/api/referral", require("./routes/referral"));
app.use("/api/finance", require("./routes/financeRoutes"));




const { errorHandler, notFound } = require("./middleware/errorMiddleware");

// --- ENHANCED HEALTH CHECK ---
app.get("/", async (req, res) => {
  const db = require("./config/db");
  let dbStatus = 'disconnected';

  try {
    await db.pool.query('SELECT 1');
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = 'error: ' + err.message;
  }

  res.json({
    status: 'ok',
    version: '2.2',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    database: dbStatus
  });
});




// --- ERROR HANDLING ---
app.use(notFound); 
app.use(errorHandler);

const PORT = process.env.PORT || 3009; 
const server = app.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT}`);

  // --- INITIALIZE CRON JOBS ---
  const { initCronJobs } = require("./cronJobs");
  initCronJobs();

  try {
    const DomainSyncWorker = require("./workers/DomainSyncWorker");
    DomainSyncWorker.start(300000);
    console.log("🚀 [DomainSyncWorker] Active and scanning.");
  } catch (err) {
    console.error("❌ Failed to start DomainSyncWorker:", err.message);
  }
});

server.on('error', (e) => {
  console.error("❌ Server Error:", e);
});

// --- GLOBAL PROCESS ERROR HANDLERS ---
process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 [FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
  // Optional: Send to logging service
});

process.on('uncaughtException', (err) => {
  console.error('🔥 [FATAL] Uncaught Exception:', err.message);
  console.error(err.stack);
  // In production, you might want to exit gracefully
  // process.exit(1); 
});

module.exports = app;
