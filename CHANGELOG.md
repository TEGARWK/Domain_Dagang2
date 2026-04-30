# Project Changelog - Domain-Dagang

Semua pembaruan sistem dan konfigurasi admin dicatat di sini untuk koordinasi tim pengembang.

### [2026-04-30] - Payment Sync, Transaction Stability & Ownership Fixes (Tegar Wira Kesuma)
- **Sistem (Desentralisasi):** Migrasi konfigurasi kritis (SMTP Email, Google OAuth, App URLs) dari file `.env` statis ke tabel database `site_settings`. Memungkinkan perubahan konfigurasi *real-time* tanpa perlu restart server.
- **Backend (Payment Timer):** Perbaikan format `due_date` di `billingController.js` menjadi ISO String untuk akurasi *countdown timer* di frontend.
- **Backend (Payment Gateway):** Sinkronisasi kolom `expired_at` pada tabel `payments` menggunakan data `validity` dari API Prismalink.
- **Backend (Database Stability):** Implementasi **Atomic Transactions** (BEGIN/COMMIT/ROLLBACK) pada `transferController.js` untuk menjamin persistensi data invoice dan mencegah Error 404.
- **Backend (Performance UX):** Modifikasi `OrderService.js` untuk memproses transfer domain di **background** (non-blocking), mempercepat respon sukses pembayaran ke user.
- **Backend (Domain Ownership):** Perbaikan logika *Upsert Domain* agar selalu memperbarui `user_id` dan `registrant_snapshot` saat terjadi perpindahan kepemilikan domain.
- **Frontend (UI Domain Detail):** Refactor `ManageDomain.jsx` untuk menampilkan data "Kontak Administratif" secara dinamis dari snapshot database, menggantikan data hardcoded.
- **Backend (Mail Service):** Refactoring `EmailService.js` agar menggunakan kredensial SMTP dinamis dari database. Panduan implementasi **Google App Password** untuk fix error `EAUTH`.
- **Frontend (Admin UX Overhaul):** Redesign total navigasi **Sistem Konfigurasi**. Implementasi layout tab vertikal (icon-on-top) untuk mencegah penumpukan teks.
- **Frontend (Typography):** Standardisasi bobot font di seluruh dashboard (mengganti `font-black` ke `font-bold`).

- **Frontend (Admin Management):** Overhaul total halaman **Manajemen Domain** (`AdminManageDomain.jsx`). Penambahan informasi krusial: Email & WhatsApp Pelanggan, Detail Pembelian (Invoice ID & Harga Beli), serta Info Registrant mendetail dari Daftarnama.
- **Frontend (Admin Management):** Implementasi sistem **Smart Fallback** untuk ID Registrar. Menggunakan ID Invoice dan Nama Domain sebagai referensi jika API Registrar tidak memberikan Order/Domain ID, menghilangkan status "N/A" yang membingungkan.
- **Frontend (Admin Management):** Implementasi fitur **Auto-Parsing Data Mentah**. Sistem kini otomatis mengonversi data string dari API Daftarnama menjadi objek interaktif di dashboard admin.
- **Frontend (Security & Stability):** Refactor `api.js` (Axios Response Interceptor). Perbaikan logika penanganan error `401/403` untuk mencegah **Logout Paksa** saat terjadi masalah Whitelist IP atau error API Registrar.
- **Backend (Registrar Integration):** Sinkronisasi `domainController.js` untuk menyertakan data pembelian (Invoice & Price) dan kontak user pada setiap pemanggilan detail domain admin.
- **Backend (Voucher Logic):** Standardisasi penamaan metadata voucher (`applicable_to`) pada `VoucherService.js` dan `voucherController.js` untuk memastikan validasi pembatasan TLD (e.g. Voucher .id tidak bisa dipakai di .com) berjalan 100%.
- **Backend (Daftarnama):** Perbaikan `DaftarnamaService.js` untuk selalu menggunakan `getClient()` dinamis guna memastikan setiap request menggunakan konfigurasi API (Sandbox/Production) yang paling aktual.
- **Frontend (UI Polish):** Labeling status domain di `BuyDomain.jsx`. Mengganti status domain yang tidak didukung atau bermasalah di Registrar menjadi **"BELUM AKTIF"** (Oranye) untuk membedakannya dari domain yang sudah benar-benar **"TERPAKAI"** (Merah).
- **Frontend (Security):** Implementasi pengecekan saldo sebelum mengaktifkan **Auto Renewal**. Sistem kini mencegah aktivasi jika saldo Rp 0 dan memberikan instruksi pengisian saldo (Top Up) via SweetAlert.
- **Backend (Security):** Penambahan validasi saldo *server-side* pada fungsi `updateDomain` guna memastikan konsistensi data dan mencegah aktivasi perpanjangan otomatis tanpa saldo Wallet.
- **Backend (Fix & Stability):** Perbaikan sinkronisasi **Transfer Domain** pada `transferController.js` dengan menyertakan data profil administratif (`registrant_snapshot`) yang sebelumnya menyebabkan data pemilik tidak muncul di dashboard.
- **Backend (Database):** Perbaikan skema tabel `notifications` dengan penambahan kolom `reference_id` dan `reference_type` untuk kestabilan sistem notifikasi status domain.
- **Frontend (Admin Settings):** Perbaikan bug `activeTab` pada halaman Admin Settings dan penambahan fitur pengaturan kontak WhatsApp & Email admin yang tersinkronisasi ke halaman publik.
- **Frontend (UI/UX):** Integrasi kembali peta interaktif (Google Maps) dengan marker lokasi yang presisi pada halaman **Hubungi Kami**.
- **Backend (Audit):** Implementasi pembersihan data kepemilikan domain pasca transfer untuk memastikan informasi di dashboard user 100% akurat.
- **Maintenance:** Pembersihan skrip debug `scratch/check_domain_11.cjs` dan optimalisasi query database pada modul domain.

### [2026-04-29] - Domain Dashboard Modernization & Lifecycle Optimization (Tegar Wira Kesuma)
- **Frontend (UI Modernization):** Overhaul tab **Overview** dengan informasi teknis mendalam (Nameservers aktif, Registrar API, tanggal registrasi) dan ringkasan kontak administratif yang lebih profesional.
- **Frontend (UI Modernization):** Membuka akses manajemen (DNS, Nameservers, Keamanan) untuk domain berstatus `provisioned`, memungkinkan pengguna melakukan konfigurasi sebelum aktivasi penuh selesai.
- **Frontend (UI Modernization):** Redesign total tab **Verifikasi** dengan kartu sukses premium untuk domain yang sudah disetujui, menggantikan tombol aksi yang sudah tidak diperlukan.
- **Frontend (UX/Billing):** Optimalisasi alur perpanjangan domain. Tombol **Perpanjang** kini langsung mengarahkan pengguna ke halaman Checkout (bypassing Cart) untuk mempercepat proses transaksi.
- **Frontend (Design Polish):** Standardisasi bobot font di seluruh dashboard manajemen. Mengganti `font-black` menjadi `font-bold` untuk keseimbangan estetika yang lebih baik dan keterbacaan tinggi.
- **Backend (DNS Management):** Perbaikan sistem input DNS record untuk menangani simbol `@` secara otomatis (dikonversi menjadi *empty string*) sesuai standar API Registrar untuk root record.
- **Backend (DNS Management):** Optimalisasi penarikan data DNS agar lebih fleksibel dalam menangani berbagai format respon API Registrar (Array-direct maupun Object-wrapped).
- **Backend (Fix & Stability):** Perbaikan validasi nomor telepon untuk API Daftarnama dengan format ketat `+62.xxxx` guna menghindari error registrasi.
- **Backend (Fix & Stability):** Perbaikan bug persistensi konfigurasi Prismalink yang sebelumnya gagal tersimpan karena masalah sensitivitas karakter (case-sensitivity) pada database.
- **Backend (Logging):** Implementasi logging error mendalam pada modul DNS untuk mempermudah diagnosa masalah komunikasi (Status 502/500) dengan API upstream.
- **Frontend (Checkout Fix):** Mengatasi masalah `RpNaN` pada daftar layanan dengan standarisasi penyimpanan harga sebagai *raw number* di LocalStorage (perbaikan di `BuyDomain.jsx` dan `Checkout.jsx`).
- **Frontend (Checkout UX):** Implementasi fitur interaktif pada Daftar Layanan. Sekarang pengguna bisa **Menghapus Item** dan **Mengubah Durasi (1-10 Tahun)** langsung di halaman Checkout tanpa harus kembali ke keranjang.
- **Frontend (Checkout UX):** Kalkulasi ulang subtotal, pajak, dan biaya layanan secara real-time saat terjadi perubahan durasi atau penghapusan item di daftar layanan.
- **Frontend (Wallet UI):** Modernisasi komponen Pembayaran Wallet. Sekarang label berubah menjadi **Saldo Akun (Wallet)**, dilengkapi proteksi otomatis (disabled) jika saldo kurang, serta indikator deficit (e.g., `-Rp 150.000`) untuk transparansi.

### [2026-04-28] - Registrar Stability & Voucher Logic Fix (Tegar Wira Kesuma)
- **Frontend (Security):** Refactor `api.js` (Axios Interceptor) untuk memisahkan error `401` (Logout) dan `403` (Forbidden). Sekarang error IP Whitelist dari Registrar tidak akan menyebabkan pengguna ter-logout paksa.
- **Backend (Voucher):** Fix mapping data `applicable_to` pada `voucherController.js` untuk memastikan pembatasan voucher per-TLD (e.g., khusus .id) terbaca dengan benar di Frontend.
- **Backend (Daftarnama):** Standarisasi `DaftarnamaService.js` menggunakan metode `getClient()` dinamis untuk menjamin setiap request menggunakan konfigurasi API terbaru.
- **Frontend (UI/UX):** Perubahan label status domain pada `BuyDomain.jsx`. Domain yang tidak didukung atau bermasalah di Registrar kini berstatus **"BELUM AKTIF"** (Oranye) alih-alih **"TERPAKAI"** (Merah) untuk akurasi informasi ke pengguna.
- **Backend (PrismaLink):** Implementasi rincian produk dinamis (`product_details`) pada payload API Prismalink. Sekarang item invoice (Domain, Renew, Topup, dll) terperinci secara otomatis di halaman pembayaran gateway.
- **Backend (Security):** Penambahan validasi status gateway (`is_active`) pada level controller (`prismaLinkController.js`). Transaksi otomatis diblokir jika gateway dinonaktifkan di Admin Panel untuk mencegah penyalahgunaan API.
- **Frontend (UI/UX):** Implementasi label "via Provider" (e.g., *via Prismalink* / *via Tripay*) pada halaman Checkout untuk transparansi channel pembayaran jika terdapat bank yang sama dari provider berbeda.
- **Frontend (Payment Dashboard):** Optimalisasi rendering logo bank pada `Payment.jsx` menggunakan pemetaan kode angka standar Bank Indonesia (BI) untuk menjamin akurasi identitas visual bank.
- **Frontend (Fix):** Standardisasi penamaan Virtual Account pada UI Dashboard. Sekarang label bank (e.g., *BCA*, *Mandiri*) tampil konsisten terlepas dari variasi format data respon API.
- **Frontend (Checkout):** Pembersihan total syntax error and karakter sampah (backslash) pada `Checkout.jsx` untuk menjamin stabilitas aplikasi di sisi client.
- **Frontend (Admin):** Overhaul **Dashboard Sistem Konfigurasi** (Admin Settings) dengan desain premium. Implementasi *Tabbed Interface* untuk manajemen terpusat: Profil, Keamanan, Site Settings, Domain API, Mail Server, dan Pembayaran.
- **Frontend (Admin):** Integrasi **Kontrol Gateway Aktif** pada tab Pembayaran. Memungkinkan admin untuk mengaktifkan/menonaktifkan Tripay, Prismalink, dan Manual secara real-time dengan status visual yang informatif.

### [2026-04-27] - Mobile Optimization & Registrar Transparency (Tegar Wira Kesuma)
- **Backend (Fix):** Optimalisasi `syncDomain` dengan pemetaan ID registrar yang lebih fleksibel (mendukung field `id`, `domain_id`, dan `registration_id`) untuk menjamin akurasi data Daftarnama.
- **Frontend (Admin):** Overhaul `AdminManageDomain.jsx` untuk responsivitas mobile total. Implementasi layout fleksibel dan penyesuaian font agar navigasi di HP sempurna.
- **Feature (Admin):** Penambahan seksi "Daftarnama Raw Data" pada detail domain untuk verifikasi data API langsung dari registrar (transparansi data Daftarnama).
- **Backend (Fix):** Implementasi *strict typing* (boolean casting & JSON stringify) pada `paymentGatewayController.js` untuk mengatasi Error 500 saat update setting Tripay di PostgreSQL.
- **Frontend (UI/UX):** Perbaikan masalah `z-index` pada menu mobile. Sekarang Navbar memiliki prioritas tertinggi (`z-100`) agar tidak tertutup oleh elemen melayang.
- **Frontend (Home):** Penyesuaian `z-index` pada Floating Cart Badge menjadi `z-40` untuk memastikan navigasi mobile tetap dapat diakses dengan mudah.
- **Frontend (Admin):** Pembaruan rincian biaya pada `AdminInvoiceDetail.jsx`. Sekarang menampilkan rincian Harga Dasar, PPN 11%, Biaya Layanan, dan Diskon secara transparan baik di tampilan layar maupun PDF.
- **Database (Fix):** Penambahan kolom konfigurasi Tripay yang hilang (`api_key`, `private_key`, `merchant_code`, `webhook_url`) ke tabel `payment_gateways`.

### [2026-04-26] - Error System Overhaul & Humanization (Tegar Wira Kesuma)
- **Frontend (Error Pages):** Redesign total halaman 404, 403, dan 500 dengan estetika premium white/orange. Menghapus teks "Oops!" dan menggantinya dengan bahasa yang lebih profesional.
- **Frontend (New Pages):** Implementasi halaman Maintenance (`/maintenance`) dengan indikator estimasi waktu dan halaman Coming Soon (`/coming-soon`) dengan animasi roket.
- **Frontend (UI/UX):** Modernisasi desain tombol (Pill-shaped, gradients, sleek) dan memastikan teks tombol tidak terpotong (anti-wrap).
- **Frontend (Branding):** Update teks Hero pada halaman Home untuk memperjelas visi identitas digital yang aman dan terpercaya.
- **Global (Humanization):** Audit menyeluruh dan penghapusan emoji serta bahasa teknis (programmer jargon) pada seluruh sistem notifikasi (Toast) dan respon error di Backend.
- **Backend (Fix):** Perbaikan syntax error pada `domainController.js` di fungsi `getDomainDetail` untuk memastikan kestabilan data domain.
- **Frontend (Footer):** Integrasi channel pembayaran dinamis yang otomatis menyesuaikan dengan gateway yang aktif di Admin Panel.
- **Frontend (Promo):** Redesign total bagian Newsletter. Mengganti tema "Promo Gila!" menjadi "Penawaran Eksklusif" dengan bahasa yang lebih profesional dan estetika *glassmorphism* yang lebih premium.

### [2026-04-24] - Footer Enhancement & Branding (Tegar Wira Kesuma)
- **Frontend (Branding):** Penambahan informasi alamat resmi PT. Aplikasi Dagang Teknologi pada Footer.
- **Frontend (Contact):** Penambahan detail kontak WhatsApp, Telepon, dan Email pada Footer untuk meningkatkan kepercayaan pelanggan.
- **Frontend (Social Media):** Implementasi ikon sosial media lengkap (Instagram, Youtube, Facebook, TikTok, X) dengan desain modern.
- **Frontend (UX):** Update link "Kontak Support" agar langsung terhubung ke WhatsApp resmi.
- **Maintenance:** Perbaikan struktur kode dan optimalisasi komponen `Footer.jsx`.
- **Modernisasi Footer:** Update informasi kontak resmi, alamat kantor Bandung, dan integrasi ikon sosial media (IG, Youtube, FB, TikTok, X).
- **Fix Sinkronisasi Harga:** Perbaikan pada `VoucherService.js` untuk menyertakan voucher otomatis dalam API publik agar "Harga Pasar Terbaik" di halaman depan mencerminkan diskon yang aktif.
- **Admin Profile Settings:** Implementasi halaman pengaturan profil khusus Admin (`AdminSettings.jsx`) untuk mengelola data personal dan reset password.
- **Navigasi Dinamis:** Update `Navbar` dan `AdminNavbar` untuk mendeteksi role user dan mengarahkan admin ke area kontrol yang tepat secara otomatis.
- **Fix Domain Transfer:** Perbaikan Error 500 & 404 pada fitur migrasi domain dengan melakukan migrasi skema database `transfer_requests` (penambahan kolom `epp_code`, `invoice_id` dll) dan standarisasi tipe data `invoice_id` menjadi `VARCHAR`.
- **Fix Payment Gateways:** Perbaikan Error 500 pada pengaturan Tripay di Admin Panel dengan optimasi pengiriman data JSONB ke PostgreSQL dan penyelarasan skema tabel `payment_gateways`.
- **Audit Sistem Transaksi:** Melakukan audit menyeluruh pada alur pendaftaran, perpanjangan (renew), dan pemulihan (restore) domain untuk memastikan konsistensi data dan mencegah error skema database serupa di masa depan.
- **Fix Order Activation (Renew):** Perbaikan pada `OrderService.js` untuk menyertakan parameter `current_expiry_date` saat aktivasi otomatis perpanjangan domain, memastikan sinkronisasi yang akurat dengan API Registrar (Daftarnama).

### [2026-04-23] - Stabilization & Security Patch (Tegar Wira Kesuma)
- **Backend (Voucher Fix):** Memperbaiki Error 500 pada halaman Promo dengan menyinkronkan nama fungsi `getAvailableClaimableVouchers` antara Controller dan Service. Menambahkan fungsi `getVoucherInfo` yang hilang pada `VoucherService.js` untuk mendukung detail kupon.
- **Backend (Top-Up Wallet):** Mengatasi Error 500 pada proses Isi Saldo (Top-Up) melalui perbaikan logika `InvoiceService` yang sebelumnya gagal karena kolom-kolom finansial baru belum ada di database produksi.
- **Database (Schema Self-Healing):** Merilis `master_database.sql` v2.7 yang mendukung migrasi otomatis (*Auto-Repair*). Skrip ini mendeteksi dan menambah kolom yang hilang secara otomatis tanpa merusak data yang sudah ada.
- **Database (Invoices):** Menambahkan kolom krusial `applied_promo_snapshot`, `type` (untuk identifikasi Topup/Domain), `tax_amount`, dan metrik profit ke tabel `invoices` guna mendukung sistem laporan keuangan terbaru.
- **Database (Users):** Menambahkan kolom alamat mendetail (`district` untuk Kecamatan dan `village` untuk Desa/Kelurahan) pada tabel `users` untuk mencegah crash saat sistem memuat data profil di halaman Checkout.
- **Database (Regions):** Mengimplementasikan sistem data wilayah Indonesia menggunakan package `idn-area-data`. Menyediakan skrip `seed_regions.js` dan SQL khusus untuk mengisi data 38 Provinsi dan 514 Kota/Kabupaten guna memfungsikan dropdown alamat pada form pendaftaran.
- **Backend (Diagnostics):** Meningkatkan sistem logging pada `checkoutController` untuk memberikan informasi error yang lebih akurat saat terjadi kegagalan pembuatan invoice di server produksi.
- **Backend (Routing Fix):** Menyinkronkan endpoint cek domain dengan mengubah route `/domain-availability` menjadi `/api/domain-availability` agar sesuai dengan permintaan dari frontend.
- **Admin (Voucher Management):** Memperbaiki Error 500 saat pembuatan voucher baru dengan melengkapi kolom `max_use_per_user`, `is_stackable`, `segment`, `eligible_actions`, dan `created_by` pada tabel `vouchers`.
- **Database (Legacy Cleanup):** Melepaskan constraint `NOT NULL` pada kolom `type` di tabel `vouchers` untuk mendukung skema database terbaru yang kini menggunakan kolom `discount_type`.
- **Integration (Payment Gateway):** Memberikan panduan konfigurasi Tripay untuk mengatasi error 400 (Bad Request) dengan memastikan penggunaan Merchant Code (T-ID) dan Private Key yang valid dari Dashboard Tripay.
- **Frontend (Admin Dashboard):** Memperbaiki tampilan "Saldo Registrar" pada halaman Overview yang sebelumnya selalu Rp 0 karena kesalahan pemanggilan path data (`balance.current_balance`).
- **Frontend (Home Layout):** Menghapus sistem Banner secara total pada halaman utama untuk menghilangkan spasi kosong dan menyederhanakan tampilan sesuai kebutuhan sistem terbaru.
- **Database (Regions Fix):** Memperbaiki Error *Foreign Key Violation* pada proses import data wilayah dengan mengimplementasikan urutan *insert* hierarkis (Provinsi -> Kota -> Kecamatan -> Desa).
- **Database (Regions Optimization):** Menyediakan skrip `export_regions_light.js` and file `regions_light.sql` versi ringan (hanya Provinsi & Kota) untuk mempermudah migrasi data di server VPS tanpa resiko *timeout*.
- **Backend (Invoice Service):** Memperbaiki bug deskripsi otomatis pada transaksi Top Up Saldo yang sebelumnya terdeteksi sebagai pendaftaran domain.
- **Backend & Frontend (Tax Logic Fix):** Sinkronisasi logika kalkulasi PPN 11% di backend (`calculateCartPreview`) dan frontend (`Checkout.jsx`) untuk memastikan pajak hanya diterapkan pada transaksi terkait Domain. Top Up Wallet kini terdeteksi bebas pajak (Rp 0).
- **Backend (Routing Fix):** Standarisasi endpoint ketersediaan domain dengan memindahkan rute ke `/api/domains/check` guna menjamin kompatibilitas *proxy* Nginx di server produksi.
- **Frontend (Google Login Fix):** Menonaktifkan fitur *FedCM* pada `Login.jsx` and `Register.jsx` untuk mengatasi *NetworkError* and pemblokiran inisialisasi Google Identity Services oleh setelan privasi browser.
- **Frontend (Services):** Sinkronisasi `domainService.js` untuk menggunakan endpoint baru `/api/domains/check`.
- **Frontend (Admin Fix):** Memperbaiki `TypeError` pada halaman kelola domain admin (`AdminManageDomain.jsx`) dengan menambahkan logika *safe-parsing* untuk data Nameserver yang tersimpan sebagai string di database.
- **Database (Security):** Menambahkan skrip `update_banned_words.sql` yang berisi daftar lengkap kata terlarang (Anti-Profanity) untuk filter kustomisasi kode referral.
- **Maintenance (Cleanup):** Pembersihan tahap kedua; penghapusan skrip migrasi usang (`tripay_migration.js`, `export_regions.js`, dll) dan pengarsipan file hotfix database ke folder `archive` untuk merapikan struktur repositori.

### [2026-04-09] - Perbaikan Bug Margin & Harga (Tegar Wira Kesuma)
- **Backend (Pricing):** Menurunkan threshold `sanitizePrice` pada `pricingController.js` dari 5.000.000 menjadi 500.000 untuk menangani harga promo dari API Daftarnama yang terekspos dalam format Cents (misal: Harga asli Rp25.050 dikirim sebagai 2.505.000). Hal ini menghentikan bug "Modal Membeludak" dan margin menjadi minus.
- **Backend (Hotfix):** Membuat skrip mandiri `backend/migrations/hotfix_vouchers_columns.js` untuk menambahkan kolom-kolom operasional voucher (`eligible_tlds`, `is_automatic`, `priority`, dll) yang tertinggal di tabel `vouchers` pada server production. Ini fix bug 500 saat membuat Kupon dan Promo Event.
- **Backend (Database Sync):** Menambahkan `vouchers` dan `promo_events` table sync operations ke `backend/scripts/sync_production_db.js`. Hal ini memastikan server production benar-benar mendapatkan kolom *eligible_tlds*, *valid_until*, *is_automatic*, *min_purchase* yang sebelumnya menyebabkan Error 500 di halaman checkout.

### [2026-03-31] - Stabilisasi & Automasi Deployment (Tegar Wira Kesuma)
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

### [2026-04-01] - Bug Fixes & Security Optimization (Tegar Wira Kesuma)
- **Frontend (UI/UX):** Perombakan total (Overhaul) tampilan halaman Pengaturan menjadi desain Premium Dashboard.
- **Frontend (UI/UX):** Implementasi grid alignment baru, modern typography, and interactive elements (verified badge, hover states).
- **Frontend (UI/UX):** Refinement tata letak form menjadi *Vertical Stack* (Label di atas input) and pembatasan lebar form (`max-w-2xl`) untuk visual balance.
- **Frontend (Settings):** Fix bug kursor loncat (focus loss) pada input nomor telepon dengan implementasi stabilisasi DOM and mode Edit.
- **Frontend (Settings):** Memperbaiki overlap teks input dengan ikon gembok melalui penambahan padding kanan (`pr-12`).
- **Backend (Security):** Menghapus perbandingan password teks biasa (plain-text) untuk meningkatkan keamanan akun.
- **Database (Billing):** Memperbaiki Error 500 pada API Billing dengan menambahkan kolom `invoice_id` yang hilang pada tabel `transfer_requests`.
- **Database (Schema):** Sinkronisasi file `database_pg.sql` dengan perubahan schema terbaru.

### [2026-04-01] - PrismaLink Integration & Billing Fixes (Tegar Wira Kesuma)
- **Database (Audit Logs):** Memperbaiki Error 500 dengan menambahkan kolom `old_value` and `new_value` yang hilang ke tabel `audit_logs` di PostgreSQL.
- **Frontend (API):** Mengatasi Error 404 dengan menghapus prefix `/api` ganda pada file `Payment.jsx` and `Checkout.jsx`.
- **Backend (PrismaLink):** Update `PrismaLinkService.js` untuk mengarahkan callback ke path yang benar (`/dashboard/billing`) and menambahkan logging response API untuk debugging yang lebih presisi.
- **Environment:** Membersihkan karakter *hidden newline* pada kredensial PrismaLink di file `.env` untuk mencegah kegagalan autentikasi.

### [2026-04-01] - PrismaLink Bad Request & Admin 500 Fix (Tegar Wira Kesuma)
- **Backend (PrismaLink):** Memperbaiki Error 400 (FAILED_SYSTEM) dengan menyinkronkan format `transaction_date_time` menjadi `yyyy-MM-dd HH:mm:ss.SSS Z`.
- **Backend (PrismaLink):** Mengubah tipe data `transaction_amount` menjadi **Number** and `product_details` menjadi **JSON String** sesuai spesifikasi teknis terbaru.
- **Backend (PrismaLink):** Menambahkan field wajib `user_ip_address` (IP Pengguna) and `user_device_id` (User-Agent) pada payload transaksi.
- **Backend (PrismaLink):** Menambahkan utility `getIPv4` untuk memastikan alamat IP yang dikirim ke API selalu dalam format IPv4 yang valid (sanitasi dari IPv6/proxy headers).
- **Backend (Admin):** Memperbaiki Error 500 pada Dashboard Metode Pembayaran dengan menambahkan kolom wajib `bank_name`, `account_number`, and `account_holder` pada logika pembuatan data otomatis (default insert).
- **Database (Payment Gateways):** Sinkronisasi skema tabel `payment_gateways` untuk mendukung integrasi PrismaLink di lingkungan produksi.

### [2026-04-01] - PrismaLink Final Validation & Proxy Fix (Tegar Wira Kesuma)
- **Backend (Server):** Implementasi `app.set('trust proxy', 1)` pada `index.js` untuk mendukung deteksi IP klien yang akurat di balik Nginx/Localtunnel.
- **Backend (PrismaLink):** Peningkatan utilitas `getIPv4` dengan **Indonesian Public IP Fallback** (`103.11.132.1`) untuk mengatasi penolakan API terhadap IP loopback/lokal (`127.0.0.1`).
- **Backend (Diagnostics):** Penambahan log sistem terperinci (`[DEBUG]`) pada Controller and Service untuk melacak payload JSON and Signature HMAC secara real-time sebelum dikirim ke API.
- **Backend (Refactor):** Penghapusan default fallback internal pada service layer untuk memastikan validasi IP dilakukan secara eksplisit di controller.

### [2026-04-01] - PrismaLink Payment Rejection Diagnostic (Tegar Wira Kesuma)
- **Backend (PrismaLink):** Menambahkan sistem pelaporan error mendetail pada `createTransaction` yang meneruskan pesan asli dari API PrismaLink (`response_message`) ke pengguna.
- **Backend (PrismaLink):** Menghapus ambiguitas error "Failed to create payment" dengan menyertakan detail teknis (seperti duplikasi Merchant ID atau kesalahan Signature) langsung pada respon API.
- **Backend (Diagnostics):** Penambahan logging konsol (`console.error`) for respons gagal dari PrismaLink guna mempermudah troubleshooting di sisi server.

### [2026-04-01] - PrismaLink Diagnostic Force Sync (Tegar Wira Kesuma)
- **Backend (PrismaLink):** Menambahkan marker `[FORCE-SYNC-V2]` untuk memaksa sinkronisasi ulang kodingan diagnostik ke branch `main`.
- **Backend (PrismaLink):** Memastikan logika pelaporan error PrismaLink tetap aktif setelah resolusi merge conflict.

### [2026-04-02] - PrismaLink Status Sync, Home Page & Navbar Fix (Tegar Wira Kesuma)
- **Database (Fix):** Implementasi skrip otomatis `ensure_tables.js` untuk memperbaiki tabel yang hilang (`coupons`, `promo_events`, `faqs`, `user_vouchers`) guna menghentikan error 500 pada halaman utama.
- **Frontend (Home Page):** Penambahan fallback and validasi data pada `BannerSection.jsx` untuk mencegah crash saat data promo tidak tersedia atau tidak valid.
- **Frontend (Navbar):** Penambahan menu dropdown **"Lainnya"** pada Navbar Guest yang terhubung ke layanan ekspor (Pengembangan Web, Aplikasi, Digital Marketing, VPS, Maintenance) di website Aplikasidagang.com.
- **Frontend (Admin Dashboard):** Memperbaiki Recharts layout warning (`width -1`) dengan implementasi **Delayed Mount** (300ms) and tinggi kontainer tetap untuk stabilitas rendering grafik.
- **Backend (API Stability):** Implementasi pola **Graceful Fail-safe** pada `VoucherService` and `faqController` yang mengembalikan array kosong `[]` sebagai ganti Error 500 jika terjadi kegagalan database pada endpoint publik.
- **Backend (PrismaLink):** Implementasi penanganan status sukses **`SETLD`** (Settled) and validasi signature HMAC-SHA256 pada webhook callback.
- **Backend (PrismaLink):** Menambahkan dukungan field **`validity`** pada pembuatan VA untuk mendukung skenario pengetesan VA Expired.
- **Backend (Wallet Integration):** Integrasi penuh alur pelunasan otomatis ke **`WalletService.credit()`** untuk sinkronisasi saldo real-time setelah pembayaran sukses.
- **Database (Type Handling):** Memperbaiki Error 500 pada Inquiry Status dengan menyinkronkan tipe data pencarian (String vs Integer) pada tabel `payments`.
- **Backend (Pricing Fix):** Memperbaiki Error 500 pada Update Harga Admin dengan menambahkan kolom `discount_price_reg` yang hilang di database, sinkronisasi jumlah placeholder SQL, and perbaikan logika update menggunakan `result.affectedRows` pada `pricingController.js`.
- **Backend (Banner Sync):** Sinkronisasi data Banner Home Page dengan Admin Panel dengan mengubah sumber data dari `promo_events` ke tabel `coupons` (is_automatic = TRUE).
- **Frontend (Payment Status Check):** Memperbaiki bug pada tombol "Cek Status" di halaman pembayaran and implementasi **Auto-Polling status** agar status tagihan terupdate otomatis setiap 5 detik tanpa perlu klik tombol atau refresh.
- **Backend (PrismaLink v1.121 Fix):** Memperbaiki Error 500/400 (FAILED_SYSTEM) pada pembuatan transaksi dengan menyinkronkan format `validity` ke Standar Dokumentasi v1.121 (Format String: `yyyy-MM-dd HH:mm:ss.SSS +0700`).

### [2026-04-04] - Perbaikan Skema Database & Proteksi Harga (Tegar Wira Kesuma)
- **Backend (Pricing):** Implementasi "Pricing Guard" pada pricingController.js untuk menormalkan harga modal yang terdeteksi inflasi (meledak 100x) dari API Daftarnama.
- **Backend (PostgreSQL):** Perbaikan kompatibilitas update harga dengan mengganti properti affectedRows menjadi rowCount untuk mencegah Error 404 saat data berhasil diperbarui.
- **Backend (Voucher):** Sinkronisasi skema tabel coupons dengan menambahkan 9 kolom yang hilang (eligible_tlds, is_automatic, priority, dll) guna mengatasi Error 500 saat pembuatan voucher.
- **Environment (API):** Update .env dengan IP publik terbaru (182.10.129.80) and perbaikan URL pathing v2 untuk stabilitas koneksi registrar.

### [2026-04-07] - Sinkronisasi Skema Voucher & Bug Fix 500 (Tegar Wira Kesuma)
- **Database (Schema):** Melakukan eksekusi manual ALTER TABLE vouchers ADD COLUMN subtitle VARCHAR(255) untuk mengatasi Error 500 pada pembuatan Promo Event dimana kode mengekspektasi adanya kolom subtitle pada tabel vouchers.
- **Backend (Hotfix):** Membuat skrip mandiri backend/migrations/hotfix_add_subtitle.js guna mempermudah aplikasi patch kolom di server *production* tanpa harus menjalankan terminal SQL manual.
- **Backend (Voucher):** Mengganti referensi tabel dari coupons ke vouchers secara menyeluruh pada VoucherService.js, PromoEngine.js, CouponService.js, and BillingController.js untuk mengatasi Error 500 (Internal Server Error) saat load and create voucher.
- **Backend (Cleanup):** Menghapus file migrasi percobaan (fix_vouchers_to_coupons.js) karena kode aplikasi langsung disesuaikan dengan skema vouchers terbaru di environment production.

### [2026-04-09] - Pemulihan Error 500, Integrasi WebP & Frontend UX State (Tegar Wira Kesuma)
- **Backend (Critical Fixes):** Memperbaiki Error 500 pada integrasi Payment Gateway & Top-Up Wallet dengan mengimplementasikan sistem **Explicit Database Transaction** (BEGIN/COMMIT/ROLLBACK). Transaksi dibatalkan secara total apabila koneksi ke *PrismaLink* gagal, mencegah masuknya data korup.
- **Backend (Security):** Menambahkan middleware verifyToken pada rute transaksi pembayaran (/api/checkout/topup and processCheckout) untuk memblokir eksploitasi impersonasi dari celah publik.
- **Backend (Data Normalization):** Menyelesaikan Error 500 pada kalkulasi Harga Keranjang (/api/checkout/preview) melalui penambahan validasi array ketat, parsial kalkulasi cost_transfer, and perbaikan tipe data via parseFloat untuk menghindari output NaN.
- **Backend (Query Fix):** Memperbaiki ambiguitas kolom (Duplikat Kolom SQL) pada endpoint /promos/active, serta membuat fungsi agregat parser JSONB untuk menyamakan handling Eligible TLDs di database.
- **Backend (Image Optimization):** Mengimplementasikan utilitas imageConverter.js menggunakan library sharp. Semua gambar banner yang diunggah akan di-resize (max 1920px) and dikonversi secara otomatis menjadi format WebP (memoryStorage) untuk menghemat konsumsi trafik server.
- **Backend (Storage Management):** Menambahkan logic eliminasi orphan files secara otomatis saat admin memperbarui gambar pada panel Edit Promo.
- **Backend (Routing Fix):** Migrasi metode Absolute URL (beserta IP host/ngrok) ke Relative URL (/uploads/...) pada output URL Banner untuk mencegah 404 error saat ter-serve di Node berbeda.
- **Frontend (Vite Proxy):** Menambahkan router proxy /uploads pada vite.config.js sebagai perantara penyamaran image host untuk lokal development.
- **Frontend (UI/UX Validation):** Menyelaraskan error message Gagal Top Up Wallet pada komponen Wallet API agar menayangkan respon komplit dari engine database (Bukan pesan generic).
- **Frontend (Fault Tolerance):** Memitigasi risiko crash (White Screen) halaman Promo List jika data.data gagal dicerna karena perubahan format API. Tombol bayar pada halaman Checkout pun sekarang diblokir (disabled) otomatis apabila proses hitung /checkout/preview di backend bermasalah.
- **Frontend (Skeletons & Fallback):** Pengamanan ekstra pada <img/> tag Banner Home, Promo, and Admin Form menggunakan **Skeleton Loader Animasi** (Tailwind animate-pulse) sebagai pendahulu render, serta fallback error load /fallback-banner.jpg saat gambar rusak.

### [2026-04-22] - Mobile Responsiveness, Payment Automation & System Cleanup (Tegar Wira Kesuma)
- **Fitur Baru (Sistem Referral):** Implementasi penuh sistem referral mulai dari pembuatan kode kustom, pelacakan pendaftaran, hingga pembagian komisi otomatis ke saldo Wallet.
- **Fitur Baru (Wallet & Penarikan Dana):** Penambahan fitur Dompet Digital (Wallet) untuk menampung reward and dana hasil referral, serta sistem pengajuan penarikan dana (Withdrawal) yang terintegrated.
- **Fitur Baru (Voucher System 2.0):** Modernisasi sistem kupon menjadi "Interactive Selection" di halaman Checkout, menghilangkan input kode manual and beralih ke sistem pilih dari daftar kupon yang sudah diklaim.
- **Frontend (UI/UX Overhaul):** Perbaikan total responsivitas mobile pada halaman Settings.jsx, Support.jsx, and AdminPaymentGateways.jsx. Implementasi stacking layout, horizontal scrolling tabs, and tombol full-width untuk pengalaman pengguna yang lebih baik di perangkat seluler.
- **Frontend (Checkout UX):** Penambahan validasi wajib kelengkapan profil (alamat & nomor telepon) serta banner peringatan di halaman Checkout untuk memastikan data registrar domain terpenuhi.
- **Frontend (Admin Panel):** Pembersihan UI pada halaman Payment Gateways dengan menghapus widget "Total Saldo (Settled)" and seluruh logika fetching saldo Tripay yang sudah tidak diperlukan.
- **Frontend (Production Ready):** Mengganti hardcoded localhost:5173 dengan teks generik "domain website ini" pada halaman Login.jsx and Register.jsx untuk persiapan deployment.
- **Backend (Automated Provisioning):** Mengintegrasikan OrderService.activateDomain ke dalam webhook Tripay and pengecekan status manual. Domain sekarang otomatis terdaftar/aktif sesaat setelah pembayaran dikonfirmasi PAID.
- **Backend (Maintenance & Cleanup):** Pembersihan repositori dari folder scratch/ (script testing), file error_debug.log yang membengkak, and file SQL sementara untuk menjaga performa server.
- **Backend (Architecture):** Merapikan folder backend/migrations dengan memindahkan 26 file migrasi historis ke dalam subfolder archive/ agar struktur proyek lebih bersih.
- **Bug Fixes:** Memperbaiki kesalahan casing pemanggilan VoucherService di tripayController.js and menghapus duplikasi deklarasi state suggestedWebhook pada Panel Admin.
