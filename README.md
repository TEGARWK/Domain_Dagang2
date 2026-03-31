# Domain-Dagang (Project Dashboard) 🚀

Selamat datang di repositori resmi **Domain-Dagang**. Proyek ini adalah platform manajemen domain yang terintegrasi dengan berbagai layanan registrar.

## 🛠 Tech Stack
- **Frontend:** React + Vite + TailwindCSS
- **Backend:** Node.js (Express)
- **Database:** PostgreSQL
- **Server:** Nginx + PM2

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
*Dikelola oleh Tim Admin & Cybersecurity Domain-Dagang*
