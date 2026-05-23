const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  const fs = require('fs');
  const path = require('path');
  const logFile = path.join(__dirname, '../emergency_error.log');
  
  const logEntry = `[${new Date().toISOString()}] ${req.method} ${req.url} - ${statusCode}\nERROR: ${err.message}\nSTACK: ${err.stack}\n---\n`;
  fs.appendFileSync(logFile, logEntry);

  // Log error (Winston or just console for now)
  console.error("🔥 Error Middleware Caught:", err.message);
  console.error(err.stack);

  fs.appendFileSync(logFile, logEntry);

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

module.exports = { errorHandler, notFound };
