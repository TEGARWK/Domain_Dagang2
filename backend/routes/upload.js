const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { verifyAdmin } = require('../middleware/adminMiddleware');
const { verifyToken } = require('../middleware/authMiddleware');
const fs = require('fs');
const { convertToWebP, removeOldImage } = require('../utils/imageConverter');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// === ALUR BARU: Menggunakan Memory Storage ===
// File masuk ke buffer RAM sementara sebelum dikonversi
const storage = multer.memoryStorage();

// File filter to only allow images
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Hanya file gambar yang diperbolehkan (jpg, png, webp, gif)!'), false);
    }
};

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: fileFilter
});

// Route for uploading banner image
router.post('/banner', verifyAdmin, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Tidak ada file yang diunggah.' });
        }

        /* 
         * === PERBANDINGAN ALUR ===
         * ALUR LAMA: Request masuk -> Multer write ke Disk -> Return path gambar (format mentah .png/.jpg).
         * ALUR BARU: Request masuk -> Multer tampung di Memory (Buffer) -> Sharp Konversi WebP & Resize (max 1920) 
         *             -> Sharp write ke Disk -> Return url .webp. Ukuran jadi sangat hemat dan load lebih cepat!
         */

        // Jika request mengirim URL gambar lama, kita hapus agar tidak jadi orphan file
        if (req.body.oldImageUrl) {
            removeOldImage(req.body.oldImageUrl, uploadDir);
        }

        // Proses konversi file dari memory buffer menjadi .webp di disk
        const webpFilename = await convertToWebP(req.file.buffer, req.file.originalname, uploadDir);

        // Generate relative URL
        const imageUrl = `/api/uploads/${webpFilename}`;

        res.json({
            success: true,
            message: 'File berhasil diunggah',
            imageUrl: imageUrl
        });
    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ success: false, message: error.message || 'Gagal mengunggah file' });
    }
});

// Route for uploading gateway logos or QRIS images
router.post('/gateway', verifyAdmin, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Tidak ada file yang diunggah.' });
        }

        // Hapus file lama jika ada
        if (req.body.oldImageUrl) {
            removeOldImage(req.body.oldImageUrl, uploadDir);
        }

        // Konversi ke WebP dengan prefix 'gateway'
        const webpFilename = await convertToWebP(req.file.buffer, req.file.originalname, uploadDir, 'gateway');

        res.json({
            success: true,
            message: 'Gambar berhasil diunggah',
            imageUrl: `/api/uploads/${webpFilename}`
        });
    } catch (error) {
        console.error("Gateway Upload Error:", error);
        res.status(500).json({ success: false, message: error.message || 'Gagal mengunggah gambar' });
    }
});

// Route for uploading payment proof (Accessible by Users)
router.post('/proof', verifyToken, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Tidak ada file yang diunggah.' });
        }

        // Konversi ke WebP dengan prefix 'proof'
        const webpFilename = await convertToWebP(req.file.buffer, req.file.originalname, uploadDir, 'proof');

        res.json({
            success: true,
            message: 'Bukti pembayaran berhasil diunggah',
            imageUrl: `/api/uploads/${webpFilename}`
        });
    } catch (error) {
        console.error("Proof Upload Error:", error);
        res.status(500).json({ success: false, message: error.message || 'Gagal mengunggah bukti pembayaran' });
    }
});

// Route for support ticket attachments (Accessible by Users & Admin)
router.post('/support', verifyToken, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Tidak ada file yang diunggah.' });
        }

        // Konversi ke WebP dengan prefix 'support'
        const webpFilename = await convertToWebP(req.file.buffer, req.file.originalname, uploadDir, 'support');

        res.json({
            success: true,
            message: 'Lampiran berhasil diunggah',
            imageUrl: `/api/uploads/${webpFilename}`
        });
    } catch (error) {
        console.error("Support Upload Error:", error);
        res.status(500).json({ success: false, message: error.message || 'Gagal mengunggah lampiran' });
    }
});

module.exports = router;
