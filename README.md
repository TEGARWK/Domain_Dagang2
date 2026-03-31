# Panduan Santuy Tim Domain-Dagang 🚀

Halo Cuy! Lo udah masuk ke tim produksi **Domain-Dagang**. Biar kodingan lo nggak bikin server meledak, baca ini dulu ya. Santai aja, nggak bakal ribet kok!

---

## 🧐 Gue Harus Ngapain Dulu? (Step Awal)

### 1. Terima Undangan GitHub
- Cek email lo. Ada undangan masuk dari GitHub Bos Agam.
- Klik tombol **"Accept Invitation"**.
- Wajib! Kalau nggak klik, lo cuma bisa liat tapi nggak bisa kirim kerjaan.

### 2. Isi "Tas Tempur" Lo (Install Tools)
PC atau Mac lo butuh 3 barang ini:
- **Node.js:** (Pilih yang versi LTS). Download di [nodejs.org](https://nodejs.org/).
- **Git:** Biar kodingan lo bisa mondar-mandir ke server. Download di [git-scm.com](https://git-scm.com/).
- **VS Code:** Buat ngetik kode. Download di [code.visualstudio.com](https://code.visualstudio.com/).

---

## 💻 Mulai Koding (Meja Kerja Lo)

Gampangnya gini: **Branch `main`** itu **Etalase Toko**. Jangan diacak-acak. 
Kerjaan lo itu di **Meja Kerja** (Branch baru).

### Cara Ambil Kodingan ke PC (Clone)
Buka Terminal (Mac) atau CMD (Windows), terus ketik ini:
```bash
git clone https://github.com/agamgusriyandi/Domain-Dagang.git
cd Domain-Dagang
```

### Cara Setup Pertama Kali
```bash
# Biar fitur-fiturnya keinstall semua di PC lo
npm install
```

### Cara Mulai Ngedit (PENTING!)
Jangan koding di branch `main`. Bahaya cuy! Buat "Meja Kerja" sendiri:
```bash
# Ganti "fitur-baru" pake nama kerjaan lo
git checkout -b fitur-baru
```

### Cara Liat Hasil Kodingan di Browser
```bash
npm run dev
```
Terus buka `localhost:5173` di Chrome. Keliatan deh hasil editan lo!

---

## 🚀 Kirim Hasil Kerja (Push ke Boss)

Udah kelar koding? Bagus! Sekarang kirim balik ke GitHub Bos Agam:

1. **Simpan:** `git add .`
2. **Kasih Nama:** `git commit -m "Udah beres edit warna tombol"`
3. **Kirim:** `git push origin fitur-baru` (Ganti "fitur-baru" sama nama branch lo).

---

## 🚦 Aturan Main (SOP Gak Pake Ribet)

### 1. Wajib Update CHANGELOG.md!
Sebelum lo minta Bos Agam buat **Merge** (gabungin kodingan lo ke website asli), lo **HARUS** tulis apa yang lo rubah di file `CHANGELOG.md`. 
- Biar Bos Agam nggak bingung pas nge-cek.
- Tulis aja: Tanggal - Nama Lo - Apa yang dirubah.

### 2. Minta Izin (Pull Request)
Di halaman GitHub, klik tombol hijau **"Compare & Pull Request"**. 
Tunggu Bos Agam klik **"Merge"**. 
Begitu diklik, **ROBOT** kita bakal langsung update website aslinya secara otomatis. Lo nggak usah ngapa-ngapain lagi!

### 3. Waduh, Error! (Rollback)
Kalo habis update terus websitenya malah rusak, tenang! Gak usah panik.
Ketik ini di terminal lo:
```bash
git revert HEAD
git push origin main
```
Sistem bakal otomatis balik ke versi sebelumnya yang aman. Beres!

---
*Happy Coding cuy! Titipan dari Bos Agam buat kita semua. :p | Agam Gusriyandi, S.T.*
