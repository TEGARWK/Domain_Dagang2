const jwt = require("jsonwebtoken");

/**
 * ADMIN VIEW AUTH MIDDLEWARE
 * Digunakan untuk rute render EJS (Server-Side).
 * Mengecek token JWT di Cookie. Jika tidak ada, redirect ke login.
 */

const verifyAdminView = (req, res, next) => {
    // 1. Ambil token dari Cookie
    const token = req.cookies.token;

    if (!token) {
        // Jika tidak ada token, kita asumsikan user belum login atau sesi habis
        // Untuk sekarang kita return 401, idealnya redirect ke /login
        return res.status(401).send(`
            <div style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h1>Akses Ditolak</h1>
                <p>Sesi login admin tidak ditemukan. Silakan login terlebih dahulu via API atau Dashboard.</p>
                <a href="/api/auth/login" style="color: #F97316;">Ke Halaman Login</a>
            </div>
        `);
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
        
        if (decoded.role !== 'admin') {
            return res.status(403).send("<h1>Akses Terlarang!</h1><p>Anda bukan administrator.</p>");
        }

        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).send("<h1>Sesi Expired</h1><p>Token tidak valid. Silakan login ulang.</p>");
    }
};

module.exports = { verifyAdminView };
