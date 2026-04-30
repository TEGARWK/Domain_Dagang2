const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(" ")[1]; // Bearer <token>

    const secret = process.env.JWT_SECRET || 'secretkey';
    // console.log(`[AuthMiddleware] Verifying token with secret: ${secret.substring(0, 5)}...`);

    jwt.verify(token, secret, (err, user) => {
      if (err) {
        const fs = require('fs');
        const path = require('path');
        const logFile = path.join(__dirname, '../emergency_error.log');
        fs.appendFileSync(logFile, `[${new Date().toISOString()}] ❌ AUTH ERROR: ${err.message}\n`);
        console.error("[AuthMiddleware] Token Verification Failed:", err.message);
        return res.status(403).json("Token is not valid!");
      }
      req.user = user;
      next();
    });
  } else {
    return res.status(401).json("You are not authenticated!");
  }
};

const verifyAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    // console.log("[AuthMiddleware] Checking Admin Role for User ID:", req.user.id);
    if (req.user.role === "admin") {
      next();
    } else {
      console.warn("[AuthMiddleware] Access Denied. User role:", req.user.role);
      res.status(403).json("You are not allowed to do that!");
    }
  });
};

module.exports = { verifyToken, verifyAdmin };
