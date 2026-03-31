const jwt = require("jsonwebtoken");

const verifyAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(" ")[1]; // Bearer <token>

    jwt.verify(token, process.env.JWT_SECRET || 'secretkey', (err, user) => {
      if (err) {
        return res.status(403).json("Token is not valid!");
      }

      // Check Role
      if (user.role !== 'admin') {
          return res.status(403).json("Access Denied: You are not an Admin!");
      }

      req.user = user;
      next();
    });
  } else {
    return res.status(401).json("You are not authenticated!");
  }
};

module.exports = { verifyAdmin };
