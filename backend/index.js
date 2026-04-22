require("dotenv").config({ override: true });
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require('path');
const expressLayouts = require('express-ejs-layouts');

const app = express();
app.set('trust proxy', 1); // Enable trusting proxy headers (Nginx/Localtunnel)

// --- MIDDLEWARES ---
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
})); 
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors());
app.use(cookieParser());

// --- VIEW ENGINE SETUP ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'admin/layout');


// --- IMPORT ROUTES ---
const authRoutes = require("./routes/auth");
const domainRoutes = require("./routes/domains");
const checkoutRoutes = require("./routes/checkout");
const billingRoutes = require("./routes/billing");
const daftarnamaRoutes = require("./routes/daftarnama");
const transferRoutes = require("./routes/transferRoutes");


// --- USE ROUTES ---
app.use("/api/auth", authRoutes);
app.use("/api/domains", domainRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/tripay", require("./routes/tripay"));
app.use("/api/daftarnama", daftarnamaRoutes);
app.use("/api/transfers", transferRoutes);
app.use("/api/users", require("./routes/users"));
app.use("/api/pricing", require("./routes/pricing"));
app.use("/api/content", require("./routes/content"));
app.use("/api/payment-gateways", require("./routes/paymentGateways"));
app.use("/api/admin", require("./routes/admin"));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/public', express.static(path.join(__dirname, 'public')));

app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/wallet", require("./routes/wallet"));
app.use("/api/upload", require("./routes/upload"));
app.use("/api/faqs", require("./routes/faqRoutes"));
app.use("/api/support/tickets", require("./routes/supportTicketRoutes"));

app.use("/api/vouchers", require("./routes/vouchers"));
app.use("/api/regions", require("./routes/regions"));
app.use("/api/referral", require("./routes/referral"));



const { errorHandler, notFound } = require("./middleware/errorMiddleware");

app.get("/", (req, res) => {
  res.json("Backend Server Version 2.0 (Voucher Fix) 🚀");
});

// Root route for domain availability (called via Vite proxy rewrite)
const domainController = require("./controllers/domainController");
app.get("/domain-availability", domainController.checkDomainAvailability);




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
