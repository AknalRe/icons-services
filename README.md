# Reneo Icons

Layanan terpusat dan galeri ikon SVG resmi ekosistem **Reneo** (`reneo.my.id`).

## Fitur Utama

- **Galeri Publik SVG**: pencarian cepat, filter kategori, filter gaya (`Brand`, `Outline`, `Solid`), dan pemisahan **`Official Reneo`** vs **`Non-Official`**.
- **Live Customizer**: ubah ukuran pratinjau (`24`, `32`, `44`) dan warna ikon monokrom langsung di halaman galeri.
- **Ekspor Lengkap**: salin kode SVG, salin komponen **React JSX**, salin URL CDN langsung (`/api/icons/:slug.svg?color=...&size=...`), unduh `.SVG`, ekspor **PNG** (`64` hingga `512px`), dan unduh paket **`.ZIP`**.
- **Panel Admin (`/admin`)**: CRUD ikon (unggah file `.svg` atau tempel kode dengan sanitasi keamanan otomatis) dan manajemen kategori.
- **Koleksi Bawaan**: 64 ikon SVG siap pakai (brand Reneo, 24 ikon kustom Reneo Panel, 19 ikon aplikasi self-hosted, dan 16 ikon UI/server monokrom).

## Menjalankan Secara Lokal

```powershell
cd backend; npm install; npm run dev
cd ..\frontend; npm install; npm run dev
```

## Variabel Lingkungan

- `PORT` (default `5056`)
- `DATA_DIR` (default `/app/data`)
- `ADMIN_EMAIL` (default `admin@reneo.my.id`)
- `ADMIN_PASSWORD`
- `SESSION_SECRET`
- `CORS_ORIGIN` (default `*`)

Lihat filosofi identitas visual di [docs/FILOSOFI-LOGO.md](docs/FILOSOFI-LOGO.md).
