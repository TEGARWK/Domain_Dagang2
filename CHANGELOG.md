# Project Changelog - Domain-Dagang

Semua pembaruan sistem dan konfigurasi admin dicatat di sini untuk koordinasi tim pengembang.

## [2026-03-31] - Stabilisasi & Automasi Deployment

### 1. Keamanan & Autentikasi (Frontend)
- **Refactor API Calls:** Semua panggilan `fetch()` mentah telah dimigrasi ke layanan `api` terpusat (Axios).
- **Authorization:** Menambahkan sistem token `Authorization: Bearer <JWT>` otomatis pada setiap request untuk mengatasi error **401 Unauthorized** di Dashboard Admin & User.
- **Pages Updated:** `AdminPricing`, `AdminPromos`, `ManageDomain`, `BuyDomain`, `Vouchers`, `Cart`, `Domain`, `Promo`, `Home`, dan `BannerSection`.

### 2. Perbaikan Database (PostgreSQL)
- **Schema Update:** Penambahan kolom yang hilang untuk mencegah internal server error:
    - `audit_logs`: Menambahkan `old_value` dan `new_value`.
    - `transfer_requests`: Menambahkan `invoice_id`.
    - `payment_gateways`: Menambahkan `provider`.

### 3. Integrasi API Produksi
- **Daftarnama:** Migrasi dari Sandbox/Testing ke **Production Environment** (`api.dnama.id`).
- **Verifikasi:** Koneksi saldo dan operasional domain sudah aktif.

### 4. Sistem Deployment (CI/CD)
- **GitHub Actions:** Sekarang repositori ini mendukung **Auto-Deploy**. 
- **Workflow:** Setiap perubahan yang di-push ke branch `main` akan otomatis membangun ulang (rebuild) dan memperbarui server VPS secara real-time.
- **Manual Build:** Sudah tidak disarankan melakukan `npm run build` manual di server kecuali darurat.

---
*Dokumen ini diperbarui secara berkala oleh System Administrator.*

### [2026-04-01] - Migrasi Google OAuth
- Migrasi sistem Login Google dari Akun Pengembang (Tegar) ke Akun Kantor Resmi (Bos Agam).
- Perubahan Google Client ID di file .env Frontend & Backend.
- Tim pengembang wajib update file .env lokal menggunakan Client ID Kantor yang baru.
