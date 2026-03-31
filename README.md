# Domain-Dagang (Project Dashboard) 🚀

Selamat datang di repositori resmi **Domain-Dagang**. Proyek ini adalah platform manajemen domain yang terintegrasi dengan berbagai layanan registrar.

## 🛠 Tech Stack
- **Frontend:** React + Vite + TailwindCSS
- **Backend:** Node.js (Express)
- **Database:** PostgreSQL
- **Server:** Nginx + PM2

---

## 📜 Standard Operating Procedure (SOP) Wajib
Seluruh tim produksi (termasuk Tegar dan anggota lainnya) **WAJIB** mematuhi aturan berikut demi menjaga kesehatan website:

### 1. Wajib Update `CHANGELOG.md`
Setiap kali Anda melakukan **Merge** ke branch `main`, Anda **HARUS** mencatatkan perubahan tersebut di file `CHANGELOG.md`. 
- **Tujuannya:** Agar Master Proyek (Bos Agam) dan tim lain tahu persis apa yang baru saja "naik" ke server produksi.
- **Format:** Tanggal, Nama Pengembang, dan daftar perubahan (lihat contoh di dalam file tersebut).

### 2. Verifikasi Pasca-Deploy
Setelah status di tab **Actions** berubah menjadi Hijau (Success), pengembang yang melakukan merge **WAJIB** membuka website [domaindagang.com](https://domaindagang.com) dan dashboard untuk memastikan fitur berjalan normal.

### 3. Komunikasi
Jika Robot CI/CD gagal (Merah), segera laporkan kepada System Admin atau lakukan Rollback mandiri sesuai panduan di bawah.

---

## 📂 Struktur Folder
- `/src`: Berisi kode sumber frontend (React components, pages, hooks).
- `/backend`: Berisi logika server, database, dan integrasi API Registrar.
- `/public`: Aset statis frontend (image, fonts).
- `CHANGELOG.md`: Catatan pembaruan teknis oleh Admin.

## 💻 Cara Menjalankan di Lokal

### 1. Prasyarat
- Node.js versi 20.x atau lebih baru.

### 2. Frontend
```bash
npm install
npm run dev
```

### 3. Backend
```bash
cd backend
npm install
npm run dev
```
*(Pastikan Anda sudah memiliki file `.env` yang sesuai di lokal).*

---

## 🔐 Standar Keamanan & Kode
- **API Requests:** Selalu gunakan instance `api` dari `src/services/api.js`. JANGAN gunakan `fetch()` mentah untuk menghindari masalah autentikasi (401).
- **Environment:** Jangan pernah meng-push file `.env` ke repositori. Gunakan `.env.example` sebagai referensi.

---

## 🚀 Alur Deployment (CI/CD)
Proyek ini menggunakan **Auto-Deployment** via GitHub Actions.
- **Cara Deploy:** Cukup lakukan `git push` atau `Merge` ke branch `main`.
- **Proses:** Server VPS akan secara otomatis menarik kode terbaru, membangun ulang frontend, dan merestart backend.
- **Monitoring:** Anda dapat melihat status deployment di tab **Actions** di GitHub.

---

## 🌿 Alur Kerja Tim (Branching Strategy)
Untuk menjaga kestabilan website produksi, seluruh tim pengembang **WAJIB** mengikuti aturan ini:

1. **JANGAN EDIT LANGSUNG DI `main`**: Branch `main` hanya untuk kode yang sudah siap tampil di website (Live).
2. **Buat Branch Fitur**: Sebelum mulai koding, buatlah branch baru dari `main` dengan nama yang jelas (contoh: `fitur/tambah-voucher` atau `fix/bug-login`).
3. **Pull Request (PR)**: Setelah selesai koding di branch fitur, lakukan **Push** dan buatlah **Pull Request** di GitHub.
4. **Review & Merge**: Master Proyek akan mereview kode. Begitu disetujui dan di-**Merge** ke `main`, Robot (CI/CD) akan otomatis mengupdate website aslinya.

---

## ↩️ Rollback (Kembali ke Versi Sebelumnya)
Jika ada kesalahan fatal setelah deploy, ikuti langkah ini untuk mengembalikan ke versi stabil:

### 1. Rollback via Git (Direkomendasikan)
Cara ini paling aman karena tetap mengikuti alur CI/CD:
```bash
# Batalkan commit terakhir
git revert HEAD
# Push perubahan pembatalan ke GitHub
git push origin main
```
Sistem akan otomatis mendeteksi "perubahan pembatalan" ini dan melakukan build ulang dari versi yang sebelumnya stabil.

### 2. Rollback Manual (Darurat di Server)
Jika GitHub Actions bermasalah, lakukan ini di VPS:
```bash
cd /home/domaindagang/Domain-Dagang
git reset --hard [ID_COMMIT_STABIL]
/bin/bash /home/domaindagang/deploy.sh
```

---
*happy coding :p | Agam Gusriyandi, S.T. *
