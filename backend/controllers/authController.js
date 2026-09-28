const db = require("../config/db");
const fs = require("fs");
const path = require("path");
const authLog = path.join(__dirname, "../auth_debug.log");
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

    const checkSql = "SELECT * FROM users WHERE email = $1";
    const existingUsers = await db.query(checkSql, [email]);
    
    if (existingUsers.length > 0) {
      return res.status(409).json({ message: "Email sudah terdaftar!" });
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);
    const verificationToken = crypto.randomBytes(32).toString("hex");

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
      
    if (referralCode) {
        await referralService.applyReferralOnRegister(newUserId, referralCode);
    }

    await EmailService.sendVerificationEmail({ name, email }, verificationToken);
    return res.status(200).json("User created. Check email for verification.");
  } catch (err) {
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

    if (data.length === 0) return res.status(400).json("Invalid token.");

    const userId = data[0].id;
    await db.query("UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE id = $1", [userId]);

    const userSql = "SELECT * FROM users WHERE id = $1";
    const userData = await db.query(userSql, [userId]);
    const user = userData[0];

    if (!user.referral_code) {
        await referralService.generateReferralCode(userId, user.name);
    }

    const payload = { id: user.id, role: user.role || 'user' };
    const jwtToken = jwt.sign(payload, process.env.JWT_SECRET || 'secretkey', { expiresIn: '7d' });

    const { password: _, ...other } = user;
    return res.status(200).json({ 
      message: "Email verified successfully.",
      user: { ...other, token: jwtToken }
    });
  } catch (err) {
    return res.status(500).json(err.message || "Internal Server Error");
  }
};

// --- LOGIN ---
exports.login = async (req, res) => {
  try {
    const sql = "SELECT * FROM users WHERE email = $1";
    const data = await db.query(sql, [req.body.email]);

    // Return 200 with success:false for "user not found" - this is NOT a 404
    // 404 should only be used when the endpoint/route doesn't exist
    if (data.length === 0) {
      return res.status(200).json({ success: false, message: "Email atau password salah!" });
    }

    const user = data[0];

    // Check if email is verified
    if (!user.is_verified) {
      return res.status(200).json({
        success: false,
        message: "Harap verifikasi email Anda terlebih dahulu.",
        needsVerification: true
      });
    }

    const isPasswordValid = bcrypt.compareSync(req.body.password, user.password);
    if (!isPasswordValid) {
      return res.status(200).json({ success: false, message: "Email atau password salah!" });
    }

    const payload = { id: user.id, role: user.role || 'user' };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'secretkey', { expiresIn: '7d' });

    try {
        createLog({
            user_id: user.id,
            action: 'LOGIN_SUCCESS',
            entity_type: 'user',
            entity_id: user.id,
            req
        });
    } catch (logErr) {}

    const { password: _, ...userWithoutPassword } = user;
    return res.status(200).json({ success: true, ...userWithoutPassword, token });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "Internal Server Error" });
  }
};

exports.getMe = (req, res) => {
  res.status(200).json(req.user);
};

// --- FORGOT PASSWORD ---
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const sql = "SELECT id, name, email FROM users WHERE email = $1";
    const data = await db.query(sql, [email]);

    if (data.length === 0) return res.status(404).json("User not found.");

    const user = data[0];
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 3600000); 

    await db.query("UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3", [resetToken, expires, user.id]);
    await EmailService.sendResetPasswordEmail(user, resetToken);
    return res.status(200).json("Reset link sent.");
  } catch (err) {
    return res.status(500).json(err.message || "Internal Server Error");
  }
};

// --- RESET PASSWORD ---
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    const sql = "SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()";
    const data = await db.query(sql, [token]);

    if (data.length === 0) return res.status(400).json("Invalid or expired token.");

    const userId = data[0].id;
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    await db.query("UPDATE users SET password = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2", [hashedPassword, userId]);
    return res.status(200).json("Password reset successfully.");
  } catch (err) {
    return res.status(500).json(err.message || "Internal Server Error");
  }
};

// --- GOOGLE AUTH ---
exports.googleAuth = async (req, res) => {
  try {
    const { credential, referralCode } = req.body;
    const settingsRes = await db.pool.query("SELECT setting_value FROM site_settings WHERE setting_key = 'google_client_id'");
    const dynamicClientId = settingsRes.rows.length > 0 ? settingsRes.rows[0].setting_value : null;

    if (!dynamicClientId) return res.status(500).json("Google Client ID not configured.");

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: dynamicClientId,
    });
    
    const payload = ticket.getPayload();
    const { email, name } = payload;

    const checkSql = "SELECT * FROM users WHERE email = $1";
    let data = await db.query(checkSql, [email]);
    let user;

    if (data.length === 0) {
      const randomPassword = crypto.randomBytes(16).toString("hex");
      const hashedPassword = bcrypt.hashSync(randomPassword, 10);

      const insertSql = `INSERT INTO users (name, email, password, is_verified, role) VALUES ($1, $2, $3, TRUE, 'user') RETURNING *`;
      const newUserRows = await db.query(insertSql, [name, email, hashedPassword]);
      user = newUserRows[0];

      if (referralCode) {
          await referralService.applyReferralOnRegister(user.id, referralCode);
          const updatedUser = await db.query("SELECT * FROM users WHERE id = $1", [user.id]);
          user = updatedUser[0];
      }
    } else {
      user = data[0];
      if (!user.is_verified) await db.query("UPDATE users SET is_verified = TRUE WHERE id = $1", [user.id]);
    }

    const jwtPayload = { id: user.id, role: user.role || 'user' };
    const token = jwt.sign(jwtPayload, process.env.JWT_SECRET || 'secretkey', { expiresIn: '7d' });

    const { password: _, ...userWithoutPassword } = user;
    return res.status(200).json({ ...userWithoutPassword, token });
  } catch (err) {
    return res.status(500).json(err.message || "Internal Server Error");
  }
};
