const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

/**
 * Utility to convert image buffer to WebP and resize it if necessary
 * 
 * @param {Buffer} inputBuffer - The file buffer from memory storage
 * @param {string} originalName - Original uploaded filename
 * @param {string} uploadDir - Absolute path to save the converted file
 * @returns {Promise<string>} - Returns the generated WebP filename
 */
const convertToWebP = async (inputBuffer, originalName, uploadDir) => {
    // Basic validation: ensure buffer holds data
    if (!inputBuffer || inputBuffer.length < 1024) {
        throw new Error("File corrupt atau ukuran terlalu kecil (< 1KB).");
    }

    try {
        // Parse metadata to ensure it's a valid image (Sharp auto-validates magic bytes)
        const metadata = await sharp(inputBuffer).metadata();
        
        if (metadata.width < 10 || metadata.height < 10) {
            throw new Error("Dimensi gambar terlalu kecil.");
        }

        // Generate unique filename: banner-{timestamp}-{random}.webp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const outputFilename = `banner-${uniqueSuffix}.webp`;
        const outputPath = path.join(uploadDir, outputFilename);
        
        // Convert, resize (max 1920) and compress
        await sharp(inputBuffer)
            .resize({ 
                width: 1920, 
                withoutEnlargement: true // Don't enlarge smaller images
            })
            .webp({ quality: 80 }) // Balance size and quality
            .toFile(outputPath);
            
        return outputFilename;
    } catch (err) {
        throw new Error(err.message || "Gagal mengkonversi gambar ke WebP (File bukan gambar valid).");
    }
};

/**
 * Remove old image if specified
 * @param {string} oldImageUrl - Path / URL of the old image
 * @param {string} uploadDir - Static upload directory
 */
const removeOldImage = (oldImageUrl, uploadDir) => {
    if (!oldImageUrl) return;

    try {
        // Extract filename from the URL (e.g., "/uploads/banner-123.jpg" -> "banner-123.jpg")
        const filename = oldImageUrl.split('/').pop();
        if (!filename) return;

        const oldPath = path.join(uploadDir, filename);
        if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
            console.log(`[UploadWorker] Removed old banner: ${filename}`);
        }
    } catch (error) {
        console.error(`[UploadWorker] Failed to remove old banner: ${error.message}`);
    }
};

module.exports = {
    convertToWebP,
    removeOldImage
};
