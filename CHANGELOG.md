# Project Changelog - Domain-Dagang

Semua pembaruan sistem dan konfigurasi admin dicatat di sini untuk koordinasi tim pengembang.

## [2026-04-24] - Footer Enhancement & Branding
- **Frontend (Branding):** Penambahan informasi alamat resmi PT. Aplikasi Dagang Teknologi pada Footer.
- **Frontend (Contact):** Penambahan detail kontak WhatsApp, Telepon, dan Email pada Footer untuk meningkatkan kepercayaan pelanggan.
- **Frontend (Social Media):** Implementasi ikon sosial media lengkap (Instagram, Youtube, Facebook, TikTok, X) dengan desain modern.
- **Frontend (UX):** Update link "Kontak Support" agar langsung terhubung ke WhatsApp resmi.
- **Maintenance:** Perbaikan struktur kode dan optimalisasi komponen `Footer.jsx`.

## [2026-04-23] - Stabilization & Security Patch
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
