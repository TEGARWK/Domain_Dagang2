const express = require("express");
const cors = require("cors");
require("dotenv").config({ override: true });

const app = express();

// --- MIDDLEWARES ---
app.use((req, res, next) => {
  if (req.headers['content-type']?.includes('application/json')) {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try {
        if (data.trim()) {
          req.body = JSON.parse(data);
        } else {
          req.body = {};
        }
        next();
      } catch (err) {
        console.error("🔥 JSON Parse Error:", err.message);
        console.error("RAW DATA:", data);
        res.status(400).json({ success: false, message: "Invalid JSON format", details: err.message });
      }
    });
  } else {
    next();
  }
});

// app.use(express.json({ limit: '10mb' })); // Disabled built-in
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors());

// --- IMPORT ROUTES ---
const authRoutes = require("./routes/auth");
const domainRoutes = require("./routes/domains");
const checkoutRoutes = require("./routes/checkout");
const billingRoutes = require("./routes/billing");
const prismaLinkRoutes = require("./routes/prismaLink");
const daftarnamaRoutes = require("./routes/daftarnama");
const transferRoutes = require("./routes/transferRoutes");


// --- USE ROUTES ---
app.use("/api/auth", authRoutes);
app.use("/api/domains", domainRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/prismalink", prismaLinkRoutes);
app.use("/api/daftarnama", daftarnamaRoutes);
app.use("/api/transfers", transferRoutes);
app.use("/api/users", require("./routes/users"));
app.use("/api/pricing", require("./routes/pricing"));
app.use("/api/content", require("./routes/content"));
app.use("/api/payment-gateways", require("./routes/paymentGateways"));
app.use("/api/admin", require("./routes/admin"));
// app.use("/api/coupons", couponRoutes); // Deprecated (Removed)
app.use("/api/vouchers", require("./routes/vouchers"));
app.use("/api/promos", require("./routes/promoEvents"));
app.use("/api/coupons", require("./routes/coupons"));
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/public', express.static(path.join(__dirname, 'public')));

app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/wallet", require("./routes/wallet"));
app.use("/api/upload", require("./routes/upload"));
app.use("/api/faqs", require("./routes/faqRoutes"));
app.use("/api/support/tickets", require("./routes/supportTicketRoutes"));

const { errorHandler, notFound } = require("./middleware/errorMiddleware");

app.get("/", (req, res) => {
  res.json("Backend Server Version 2.0 (Voucher Fix) 🚀");
});




// --- ERROR HANDLING ---
app.use(notFound); 
app.use(errorHandler);

const PORT = process.env.PORT || 3009; 
const server = app.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT}`);

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

module.exports = app;
