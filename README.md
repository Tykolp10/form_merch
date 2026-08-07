# Sistem Pre-Order Merch MQ 2026 (Custom Web Frontend + Apps Script Backend)

Sistem otomatisasi Pre-Order Merchandise berbasis **Custom Web (GitHub Pages) + Google Sheets + Google Apps Script + Fonnte (WhatsApp API)**.

---

## 🎨 Keunggulan Custom Web Frontend (`index.html`)

- **Tampilan Premium & Modern:** Tema dark mode modern dengan typography Outfit & Plus Jakarta Sans.
- **Visual Mockup Produk:** Menampilkan gambar kaos lengan pendek, lengan panjang, & merch official.
- **Size Selector Interaktif:** Pembeli dapat memilih jumlah per ukuran (S, M, L, XL, XXL) secara langsung.
- **Modal Size Chart:** Tabel ukuran kaos terpadu yang dapat dibuka pembeli kapan saja.
- **Kalkulasi Real-Time:** Total item & nominal transfer dihitung otomatis secara live.

---

## 🚀 Cara Menghubungkan Web Front-End ke Apps Script Backend

### Langkah 1: Deploy Apps Script sebagai Web App
1. Buka Google Apps Script project kamu (`PO Merch MQ 2026`).
2. Di pojok kanan atas, klik tombol **Deploy** → **New deployment** (Terapkan baru).
3. Klik ikon ⚙️ di samping *Select type* → pilih **Web app**.
4. Isi konfigurasi:
   - **Description:** `Backend PO Merch MQ Web`
   - **Execute as:** `Me` (Saya)
   - **Who has access:** `Anyone` (Siapa saja) — *PENTING agar web frontend bisa mengirim data.*
5. Klik **Deploy**.
6. Salin **Web App URL** yang dihasilkan (format: `https://script.google.com/macros/s/.../exec`).

### Langkah 2: Paste Web App URL ke `index.html`
1. Buka file `index.html`.
2. Cari variabel `WEB_APP_URL` di bagian `<script>` (sekitar baris 420):
   ```javascript
   const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbx.../exec";
   ```
3. Ganti `"ISI_URL_WEB_APP_APPS_SCRIPT_DISINI"` dengan URL Web App Apps Script milikmu.
4. Simpan file `index.html`.

### Langkah 3: Push ke GitHub & Aktifkan GitHub Pages
1. Push repository ini ke GitHub (`git add .`, `git commit`, `git push`).
2. Buka repository di GitHub → **Settings** → **Pages**.
3. Pada **Source**, pilih `Deploy from a branch` → Branch `main` / `master` → Folder `/ (root)`.
4. Klik **Save**. Dalam 1–2 menit, web kamu siap diakses di `https://username.github.io/form_merch/`!
