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

### [2026-04-01] - Cleanup Database & Fitur Sinkronisasi Manual Domain
- **Database Clean Slate:** Mengosongkan (`Truncate Cascade`) seluruh data *dummy* terkait transaksi, request withdraw, riwayat sinkronisasi tiket, dan data domain.
- **Daftarnama Limitasi:** Penemuan bahwa API v2 Daftarnama tidak mendukung penarikan list domain (`GET /domains`) secara massal.
- **SyncService:** Membangun `SyncService.js` untuk menerima input array nama domain dari aplikasi (admin) dan secara otomatis melacak serta menambahkannya ke database, meng-assign ke Office User (`id: 3`).
- **Endpoint Admin:** Penambahan `POST /api/admin/domains/sync-manual` khusus untuk admin meresync domain-domain dari registrar.
- **Akun Admin Tetap:** Registrasi permanen untuk `admin@aplikasidagang.co.id` dan `tegar@aplikasidagang.com`.

### [2026-04-01] - Bug Fixes & Security Optimization (Agent Anti-Gravity)
- **Frontend (UI/UX):** Perombakan total (Overhaul) tampilan halaman Pengaturan menjadi desain Premium Dashboard.
- **Frontend (UI/UX):** Implementasi grid alignment baru, modern typography, dan interactive elements (verified badge, hover states).
- **Frontend (UI/UX):** Refinement tata letak form menjadi *Vertical Stack* (Label di atas input) dan pembatasan lebar form (`max-w-2xl`) untuk visual balance.
- **Frontend (Settings):** Fix bug kursor loncat (focus loss) pada input nomor telepon dengan implementasi stabilisasi DOM dan mode Edit.
- **Frontend (Settings):** Memperbaiki overlap teks input dengan ikon gembok melalui penambahan padding kanan (`pr-12`).
- **Backend (Security):** Menghapus perbandingan password teks biasa (plain-text) untuk meningkatkan keamanan akun.
- **Database (Billing):** Memperbaiki Error 500 pada API Billing dengan menambahkan kolom `invoice_id` yang hilang pada tabel `transfer_requests`.
- **Database (Schema):** Sinkronisasi file `database_pg.sql` dengan perubahan schema terbaru.
