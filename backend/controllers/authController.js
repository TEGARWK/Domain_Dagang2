const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const EmailService = require("../services/EmailService");
const { createLog } = require("./auditController");
const crypto = require("crypto");
const referralService = require("../services/referralService");
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// --- REGISTER ---
exports.register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    // Cek email dulu
    const checkSql = "SELECT * FROM users WHERE email = $1";
    const existingUsers = await db.query(checkSql, [email]);
    
    if (existingUsers.length > 0) {
      return res.status(409).json({ message: "Email sudah terdaftar! Silakan gunakan email lain atau masuk." });
    }

    // Hash Password
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    // Generate Verification Token
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // Destructure new fields from req.body
    const { bio, address_line1, city, state, district, village, zip_code, country, referralCode } = req.body;

    const sql = `INSERT INTO users (
        name, email, phone, password, 
        bio, address_line1, city, state, district, village, zip_code, country,
        verification_token
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`;
    
    const values = [
        name, email, phone, hashedPassword,
        bio || null, 
        address_line1 || null, 
        city || null, 
        state || null, 
        district || null,
        village || null,
        zip_code || null, 
        country || 'ID',
        verificationToken
    ];

    const result = await db.query(sql, values);
    const newUserId = result[0].id;
      
    // --- REFERRAL INTEGRATION ---
    if (referralCode) {
        await referralService.applyReferralOnRegister(newUserId, referralCode);
    }
    // ----------------------------

    // Send Verification Email
    await EmailService.sendVerificationEmail({ name, email }, verificationToken);

    return res.status(200).json("User has been created. Please check your email to verify your account.");
  } catch (err) {
    console.error("🔥 Register Error:", err);
    return res.status(500).json(err.message || "Internal Server Error");
  }
};

// --- VERIFY EMAIL ---
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) return res.status(400).json("Verification token is required.");

    const sql = "SELECT id FROM users WHERE verification_token = $1";
    const data = await db.query(sql, [token]);

    if (data.length === 0) {
      return res.status(400).json("Invalid or expired verification token.");
    }

    const userId = data[0].id;
    const updateSql = "UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE id = $1";
    await db.query(updateSql, [userId]);

    // FETCH USER DATA FOR AUTO-LOGIN
    const userSql = "SELECT * FROM users WHERE id = $1";
    const userData = await db.query(userSql, [userId]);
    const user = userData[0];

    // --- REFERRAL INTEGRATION ---
    // 1. Generate Referral Code for this new user if not exists
    if (!user.referral_code) {
        await referralService.generateReferralCode(userId, user.name);
    }

    // 2. Check for referrer link (From Query or Cookie)
    const referralCode = req.query.ref || req.cookies?.referral_code;
    if (referralCode) {
        await referralService.applyReferralOnRegister(userId, referralCode);
    }
    // ----------------------------

    // Generate Token
    const payload = { id: user.id, role: user.role || 'user' };
    const jwtToken = jwt.sign(payload, process.env.JWT_SECRET || 'secretkey', {
        expiresIn: '24h'
    });

    const { password, ...other } = user;
    const userWithToken = { ...other, token: jwtToken };

    return res.status(200).json({ 
      message: "Email has been verified successfully.",
      user: userWithToken
    });
  } catch (err) {
    console.error("🔥 Verify Email Error:", err);
    return res.status(500).json(err.message || "Internal Server Error");
  }
};

// --- LOGIN ---
exports.login = async (req, res) => {
  try {
    const sql = "SELECT * FROM users WHERE email = $1";
    console.log(`[Auth] Attempting login for: ${req.body.email}`);

    const data = await db.query(sql, [req.body.email]);

    if (data.length === 0) return res.status(404).json({ message: "User tidak ditemukan!" });

    const user = data[0];
    
    // Check if verified
    if (!user.is_verified) {
        return res.status(403).json({ message: "Harap verifikasi email Anda sebelum masuk." });
    }

    // Cek password hash
    const isPasswordValid = bcrypt.compareSync(req.body.password, user.password);

    if (!isPasswordValid) {
        return res.status(400).json({ message: "Kata sandi salah!" });
    }

    // Kirim data user (kecuali password) + TOKEN
    const { password, ...other } = data[0];
    
    console.log(`[Auth] Login Logic: Email ${req.body.email} -> Found ID ${user.id} (Role: ${user.role})`);

    // Generate Token
    const payload = { id: user.id, role: user.role || 'user' };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'secretkey', {
        expiresIn: '24h'
    });
    
    console.log(`[Auth] Token Generated for ID ${payload.id}. Token: ${token.substring(0, 20)}...`);

    // Audit Log for Login
    createLog({
        user_id: user.id,
        action: 'LOGIN_SUCCESS',
        entity_type: 'user',
        entity_id: user.id,
        req
    });

    return res.status(200).json({ ...other, token });
  } catch (err) {
    console.error("🔥 Login Error:", err);
    return res.status(500).json(err.message || "Internal Server Error");
  }
};

exports.getMe = (req, res) => {
  res.status(200).json(req.user);
};

// --- FORGOT PASSWORD ---
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json("Email is required.");

    const sql = "SELECT id, name, email FROM users WHERE email = $1";
    const data = await db.query(sql, [email]);

    if (data.length === 0) {
      // Return 200 for security to not reveal registered emails, 
      // but in this case we return 404 for better UX if the user is sure.
      return res.status(404).json("User with this email does not exist.");
    }

    const user = data[0];
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 3600000); // 1 hour from now

    const updateSql = "UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3";
    await db.query(updateSql, [resetToken, expires, user.id]);

    // Send Reset Email
    await EmailService.sendResetPasswordEmail(user, resetToken);

    return res.status(200).json("Reset link has been sent to your email.");
  } catch (err) {
    console.error("🔥 Forgot Password Error:", err);
    return res.status(500).json(err.message || "Internal Server Error");
  }
};

// --- RESET PASSWORD ---
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json("Token and new password are required.");

    const sql = "SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()";
    const data = await db.query(sql, [token]);

    if (data.length === 0) {
      return res.status(400).json("Invalid or expired reset token.");
    }

    const userId = data[0].id;

    // Hash New Password
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    const updateSql = "UPDATE users SET password = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2";
    await db.query(updateSql, [hashedPassword, userId]);

    return res.status(200).json("Password has been reset successfully. You can now login with your new password.");
  } catch (err) {
    console.error("🔥 Reset Password Error:", err);
    return res.status(500).json(err.message || "Internal Server Error");
  }
};

// --- GOOGLE AUTH ---
exports.googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;
    
    if (!process.env.GOOGLE_CLIENT_ID) {
        return res.status(500).json("Google Client ID is not configured on the server.");
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const { email, name, sub: googleId } = payload;

    // 1. Check if user exists
    const checkSql = "SELECT * FROM users WHERE email = $1";
    let data = await db.query(checkSql, [email]);
    let user;

    if (data.length === 0) {
      // 2. Create user if doesn't exist
      // Generate a random secure password for database constraint
      const randomPassword = require("crypto").randomBytes(16).toString("hex");
      const bcrypt = require("bcryptjs");
      const hashedPassword = bcrypt.hashSync(randomPassword, 10);

      const insertSql = `
        INSERT INTO users (name, email, password, is_verified, role) 
        VALUES ($1, $2, $3, TRUE, 'user') 
        RETURNING *`;
      const newUser = await db.query(insertSql, [name, email, hashedPassword]);
      user = newUser[0];
      
      createLog({
        user_id: user.id,
        action: 'REGISTER_GOOGLE',
        entity_type: 'user',
        entity_id: user.id,
        req
      });
    } else {
      user = data[0];
      // Auto-verify if already exists but not verified (Google is a trusted source)
      if (!user.is_verified) {
          await db.query("UPDATE users SET is_verified = TRUE WHERE id = $1", [user.id]);
      }
    }

    // 3. Generate JWT
    const jwtPayload = { id: user.id, role: user.role || 'user' };
    const token = jwt.sign(jwtPayload, process.env.JWT_SECRET || 'secretkey', {
      expiresIn: '24h'
    });

    const { password, ...other } = user;
    
    createLog({
      user_id: user.id,
      action: 'LOGIN_GOOGLE',
      entity_type: 'user',
      entity_id: user.id,
      req
    });

    return res.status(200).json({ ...other, token });
  } catch (err) {
    console.error("🔥 Google Auth Error:", err);
    return res.status(500).json(err.message || "Internal Server Error");
  }
};
