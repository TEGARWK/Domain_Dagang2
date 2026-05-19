# Domain Dagang - Project Documentation

Proyek **Domain Dagang** adalah platform layanan domain dan hosting terpadu dengan arsitektur modern Javascript Full-Stack. Dokumen ini memuat informasi kunci terkait stack teknologi, topologi server, dan konfigurasi database proyek.

## 🛠️ Tech Stack & Arsitektur
- **Frontend**: React.js dengan Vite (`/Domain-Dagang`). Menggunakan React Router untuk navigasi SPA, Zustand untuk State Management, serta Tailwind CSS dan Framer Motion untuk styling dan animasi antarmuka.
- **Backend**: Node.js dengan framework Express.js (`/Domain-Dagang/backend`). Melayani endpoint REST API, manajemen *Cron Jobs*, Worker Sinkronisasi Domain, serta interface backend view menggunakan EJS.
- **Database Utama**: PostgreSQL (Terpisah di server khusus).
- **Caching**: Redis (Opsional, terdapat *graceful fallback* jika Redis tidak tersedia).

## 🌍 Topologi & Lingkungan Server
Dalam fase production (rencana unggah ke aaPanel), arsitektur layanan akan dibagi menjadi sebagai berikut:

1. **Server Aplikasi (Web Server & Backend Server)**
   - Engine: aaPanel (Nginx + PM2 Node.js).
   - Backend berjalan di port internal (misal: `3009`), di-*manage* menggunakan PM2 Manager.
   - Frontend di-build menjadi file statis (`dist/`) dan disajikan langsung via Nginx.
   - Nginx bertindak sebagai *Reverse Proxy* untuk merutekan *traffic* ke backend API.

2. **Server Database (PostgreSQL)**
   - Database tidak di-host dalam satu server dengan web aplikasi untuk keandalan (*reliability*) dan pemisahan beban (*load separation*).
   - Akses via port standar PostgreSQL (5432).

## 🗄️ Kredensial & Konfigurasi Database (Remote)
Aplikasi terhubung ke Remote Database Server menggunakan informasi berikut. Konfigurasi ini **harus** dimasukkan ke dalam file `.env` di dalam folder `backend/`:

```env
# Konfigurasi PostgreSQL Remote
DB_HOST=103.65.237.146
DB_PORT=5432
DB_USER=domainDgUsr
DB_PASS=P5bMPEmH6M8zwC5a
DB_NAME=domaindgdb
```

> **⚠️ Peringatan Keamanan**: 
> Pastikan firewall di server database (103.65.237.146) telah dikonfigurasi untuk hanya menerima koneksi port 5432 dari IP Server Aplikasi aaPanel Anda guna mencegah akses publik/brute force ke database.

## 🚀 Panduan Ringkas Menjalankan Proyek

**1. Menjalankan Backend Lokal**
```bash
cd Domain-Dagang/backend
npm install
# Jangan lupa isi .env dengan kredensial remote DB di atas
npm run dev
```

**2. Menjalankan Frontend Lokal**
```bash
cd Domain-Dagang
npm install
npm run dev
```
*(Pastikan `VITE_API_URL` pada .env frontend menunjuk ke URL backend dengan benar).*

## 📖 Referensi Lanjutan
Untuk langkah-langkah instalasi, konfigurasi proxy Nginx, dan persiapan detail aaPanel, silakan merujuk pada dokumen analisis teknis yang tersedia di:
[`deploy_analysis_aapanel.md`](./deploy_analysis_aapanel.md)


SSL Certifikat
Origin Certificate : 
-----BEGIN CERTIFICATE-----
MIIErDCCA5SgAwIBAgIUE56qLXZOzi7PSwjBSzXCRphxRdAwDQYJKoZIhvcNAQEL
BQAwgYsxCzAJBgNVBAYTAlVTMRkwFwYDVQQKExBDbG91ZEZsYXJlLCBJbmMuMTQw
MgYDVQQLEytDbG91ZEZsYXJlIE9yaWdpbiBTU0wgQ2VydGlmaWNhdGUgQXV0aG9y
aXR5MRYwFAYDVQQHEw1TYW4gRnJhbmNpc2NvMRMwEQYDVQQIEwpDYWxpZm9ybmlh
MB4XDTI2MDUxOTEwMjgwMFoXDTQxMDUxNTEwMjgwMFowYjEZMBcGA1UEChMQQ2xv
dWRGbGFyZSwgSW5jLjEdMBsGA1UECxMUQ2xvdWRGbGFyZSBPcmlnaW4gQ0ExJjAk
BgNVBAMTHUNsb3VkRmxhcmUgT3JpZ2luIENlcnRpZmljYXRlMIIBIjANBgkqhkiG
9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0F37XDvjSg45yS7a0cyO2/HuHqCK7XLvYowa
TzA5Bli/GTQWKDDzlg3q1tAm1nsVcTtbgAdxdVpBomYOMWpZ1mc0GHZuqmbrJQGs
VVSAoBZOdyyu+wfClwhlcCDnjCLW+SPOp2D4UltGf5Lx4iT3Q7ugmqIiIOyZHoGc
P1nulAN6Rt96KAbw6X24SkyxgpaNnAMO4UofncPgEDL24iyZJaASd0xpnwEJATo0
gE3dDP5SSW1IcP+2cLgRwMQ8EU3pknVIObsWd/OUHnDZ2ZVtcLwRDW39Wvvwt1q4
AzjFjIyTKN2jmKghVeEvwXwMo2ej1WVnaXxDUCgMrn2SIVNmGwIDAQABo4IBLjCC
ASowDgYDVR0PAQH/BAQDAgWgMB0GA1UdJQQWMBQGCCsGAQUFBwMCBggrBgEFBQcD
ATAMBgNVHRMBAf8EAjAAMB0GA1UdDgQWBBQiYx10bRekSGLAM78a/O9nY4tP7zAf
BgNVHSMEGDAWgBQk6FNXXXw0QIep65TbuuEWePwppDBABggrBgEFBQcBAQQ0MDIw
MAYIKwYBBQUHMAGGJGh0dHA6Ly9vY3NwLmNsb3VkZmxhcmUuY29tL29yaWdpbl9j
YTAvBgNVHREEKDAmghIqLmRvbWFpbmRhZ2FuZy5jb22CEGRvbWFpbmRhZ2FuZy5j
b20wOAYDVR0fBDEwLzAtoCugKYYnaHR0cDovL2NybC5jbG91ZGZsYXJlLmNvbS9v
cmlnaW5fY2EuY3JsMA0GCSqGSIb3DQEBCwUAA4IBAQB5+jDs/3CsDMzhUj/kQ/fA
K4B78KElIV+jwIaMI6P4SX/NS7uwxVy4TNYcX/F2Hqcq5WSMAxqVeWU70GyqeUof
PUz6mV1CefwLUQi+7sww6KiMus4QNyNVHXQct7iVqUBsBYBvbZV/qwKrvitM1MOX
rmtVw45PlJAZqxkfoE67pwyb2DRY5WgF7jb1VJQk85vekN09mWZD/bTd9hRsS+RP
ZJHSBHxKjJNcwzSFgLQwrCmZFU1xAg9raK2cjgJFBlJnIlqI2nGqifzVGsUBevAF
7B2KB2lDezIIWixZiHA1bCKKKMumlWvZJscO10k/zgDIG/NLm2VjJu9s8BHHdAHh
-----END CERTIFICATE-----

Private Key : 
-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDQXftcO+NKDjnJ
LtrRzI7b8e4eoIrtcu9ijBpPMDkGWL8ZNBYoMPOWDerW0CbWexVxO1uAB3F1WkGi
Zg4xalnWZzQYdm6qZuslAaxVVICgFk53LK77B8KXCGVwIOeMItb5I86nYPhSW0Z/
kvHiJPdDu6CaoiIg7JkegZw/We6UA3pG33ooBvDpfbhKTLGClo2cAw7hSh+dw+AQ
MvbiLJkloBJ3TGmfAQkBOjSATd0M/lJJbUhw/7ZwuBHAxDwRTemSdUg5uxZ385Qe
cNnZlW1wvBENbf1a+/C3WrgDOMWMjJMo3aOYqCFV4S/BfAyjZ6PVZWdpfENQKAyu
fZIhU2YbAgMBAAECggEAAX6LDPBJAwDzHSQ+4X5MD/u+L24LUQSf/t7uWV8JKah9
Rlr/Ra6EMLFM29mGTcd4MeWxFEv5XlQVYGrG80fF+SmoT/yZcpNmYE+QwtPmUD+Y
tHYXkylNFfQzdghmYLTnQcYl90FUxpJtAQE2xt5o/41a64D6Ka5IstVPH40vjtQs
PM3arOwPzwwq+MQZ/Keg0EXZYsOtySqbGX3mr7R80L+SO6tYVw7hMAgpJv4kbhwD
74/iI1j97IF1YprJELVYxh8CO94W3QEkRuMKJap8+wrYzk7etTzF0vmz+26ejI8s
0biPxRqzZLpk6ePw6fP/qgLpsTsO08mM2/h64z0WsQKBgQD07uQKKKINILJyLhiV
NZdO0VApt2cNWADgrER/r7rtp9L6749/RbU0OhQ4EW0YWRanOOO+Ekrmb4EsVs3A
MCSxYWnzQcGY/lDhLG5Mtuc2ifDoLQ+bubPlm0Rk0vyFEnLEqRvARH0XxzDqQg8K
SNwRPGfn1G4gwhkqEoGERoJYpwKBgQDZyCLwHpWDUPobHcw2CJOwI6pdv6OWtteM
9EWEe+GXNbFSxPjTQKp4xmn4iWgp4FN9iqTwGXYGvxmK9mXHUjruZ6F4cLe6+RaQ
EflF8VAtWlwgny78QsowSQIx46cFAmvY55WAYPvsdKjXUTUDgC0BtP/WpyptQq/C
MH9mPw0BbQKBgDXigITDn7MnqFp6Tao12g3a+rnSwXcsDzVecMtui79RFpdiML2d
RloxFNWo78lVgChV2bStLZE4osBwcF+Bt/DWL4r2wnK4MG75aWKzMnbLLhbGIxLt
behrmkZcLHXSMzGUyqgn6SVcCyTeV5S5psCb+3gDQh8u1H5vB9Nj97UtAoGASWEX
9JQ5iG+GdhCKOEKXkKfTxZbGxgeBhWrg6YzcLBjZUKwxsux9BAjGuAmEYWfGeex3
Orc5f3hwYNQ44vogBShBzdUc8xDuu0hzF1AB1eY2WH+KU1El0zMmXCz6n8N7FzCg
vQrwl3GPWk1wcWeEwqh785WLxBjOI743jvn7pdkCgYAplUPee/IfMEYQMuNYUtnL
px7Js/LamyfA33g9jJekntmalWdPnOdyQpYV43K4gjKVASIMCyZ9S12Q3IjZwyRz
p8hoH3NaX8+yIy/BhrneWZDVADJ1JWZ6aPonSaORuHmuD10M00EXKs17EelCnMME
1sFMaJ3+QldoLOQkmtdGoA==
-----END PRIVATE KEY-----

