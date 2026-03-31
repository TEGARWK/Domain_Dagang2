const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(" ")[1]; // Bearer <token>

    const secret = process.env.JWT_SECRET || 'secretkey';
    // console.log(`[AuthMiddleware] Verifying token with secret: ${secret.substring(0, 5)}...`);

    jwt.verify(token, secret, (err, user) => {
      if (err) {
        console.error("[AuthMiddleware] Token Verification Failed:", err.message);
        console.error("[AuthMiddleware] Token being verified:", token.substring(0, 15) + "...");
        return res.status(403).json("Token is not valid!");
      }
      console.log(`[AuthMiddleware] Token Decoded. Payload ID: ${user.id}, Role: ${user.role}`);
      req.user = user;
      next();
    });
  } else {
    return res.status(401).json("You are not authenticated!");
  }
};

const verifyAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    console.log("[AuthMiddleware] Checking Admin Role for User:", req.user);
    if (req.user.role === "admin") {
      next();
    } else {
      console.warn("[AuthMiddleware] Access Denied. User role:", req.user.role);
      res.status(403).json("You are not allowed to do that!");
    }
  });
};

module.exports = { verifyToken, verifyAdmin };
