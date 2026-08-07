# PROMPT UNTUK ANTIGRAVITY IDE

> Tempel seluruh blok di bawah ini sebagai pesan pertama di Antigravity, dan lampirkan file `WORKFLOW-FORM-MERCH-MQ.md`.

---

Halo. Saya perlu bantuan membangun sistem pre-order merchandise. Spec lengkapnya ada di file `WORKFLOW-FORM-MERCH-MQ.md` yang saya lampirkan — **baca seluruhnya dulu sebelum menulis kode apa pun.** File itu adalah sumber kebenaran tunggal; kalau ada yang tidak jelas, tanya saya, jangan berasumsi.

## Konteks

- **Deadline keras: PO buka 10 Agustus 2026.** Hari ini 8 Agustus. Saya punya 2 hari.
- Stack sudah dikunci: Google Form → Google Sheets → Google Apps Script → Fonnte (WhatsApp API). **Jangan usulkan stack lain.** Tidak perlu Node, tidak perlu Next.js, tidak perlu database, tidak perlu n8n/Make/Zapier. Alasannya ada di §0 spec.
- Endpoint dan perilaku API Fonnte di §5.3 sudah diverifikasi langsung dari dokumentasi resmi. Pakai apa adanya, jangan ditulis ulang dari ingatan.

## Yang saya minta

### 1. `bootstrap.gs` — prioritas utama

Sebuah Apps Script yang **membangun seluruh sistem secara otomatis** ketika dijalankan sekali. Saya tidak mau mengklik-klik UI Google Form selama 2 jam.

Script ini harus:

**a. Membuat Google Form via `FormApp`**, persis sesuai §2 spec:
- Semua bagian, pertanyaan, tipe, dan urutannya
- 2 pertanyaan tipe **grid** (`addGridItem`) dengan baris S/M/L/XL/XXL dan kolom 0–5
- 3 dropdown untuk Tumbler / Korek / Keychain
- **Branching** di "Metode Pengambilan" (`createChoice` dengan `PageNavigationType` / `setGoToPage`) → Kirim membuka bagian alamat, Ambil melewatinya
- Setelan wajib: `setCollectEmail(false)`, `setAllowResponseEdits(false)`, `setShuffleQuestions(false)`
- Teks deskripsi & pesan konfirmasi persis seperti di spec

**b. Membuat spreadsheet + 7 tab** sesuai §3, lengkap dengan header setiap tab.

**c. Menghubungkan Form ke Spreadsheet** via `form.setDestination()`.

**d. Mengisi `MASTER_PRODUK`** dengan 13 baris SKU dari §1 — dan yang paling penting: **hitung nilai kolom `Header_Form` secara terprogram** dari objek Form yang baru dibuat, bukan diketik manual sebagai string literal.

Ini titik paling rawan di seluruh sistem. Google Forms memberi nama kolom grid dengan pola `<Judul Pertanyaan> [<Label Baris>]`. Kalau spasi atau tanda kurungnya meleset satu karakter, item tidak terbaca dan pesanan hilang diam-diam. Turunkan nilainya dari `item.getTitle()` + label baris, sehingga judul dan header selalu sinkron secara struktural.

**e. Menulis semua rumus** — `ARRAYFORMULA` di `ORDER_LINES!K1:L1`, blok `REKAP_PRODUKSI`, blok `DASHBOARD`. Deteksi locale spreadsheet dan gunakan pemisah argumen yang benar (`;` untuk Indonesia, `,` untuk US) — jangan hardcode salah satu.

**f. Memformat sheet**: freeze baris header, format Rupiah pada kolom uang, format tanggal, lebar kolom wajar, protected range pada `MASTER_PRODUK` dan `REKAP_PRODUKSI`.

**g. Di akhir, mencetak ke log**: URL Form (publik + edit) dan URL Spreadsheet.

### 2. `Code.gs` — logika operasional

Ambil dari §4 spec. Boleh kamu rapikan, tapi **jangan ubah perilakunya**. Pertahankan secara utuh:
- `normalisasiWA_()` — semua varian format nomor Indonesia
- Pengecekan response Fonnte pada `status` **dan** `Status` (dokumentasi mereka tidak konsisten soal kapitalisasi — kalau hanya cek satu, kegagalan akan terbaca sebagai keberhasilan)
- `LockService` + pengecekan idempotensi lewat kolom `Row_Form`
- Pemisahan `prosesBaris_(rowNum)` dari `onFormSubmit(e)`, supaya bisa dipanggil ulang saat recovery
- Semua fungsi menu admin
- `cekExpired()` dengan reminder H-3 jam dan penghangusan otomatis

### 3. `tests.gs` — 7 skenario dari §7

Fungsi yang menyuntikkan data uji ke `Form Responses 1`, memanggil `prosesBaris_()`, lalu memverifikasi hasilnya di `ORDERS` dan `ORDER_LINES`. Ditambah `resetDataUji()` yang mengosongkan `ORDERS`, `ORDER_LINES`, `LOG_WA` dan mereset `ORDER_COUNTER` ke 0.

Skenario 1 (multi-varian) dan 6 (expired) yang paling kritis — pastikan keduanya benar-benar diuji, bukan sekadar dipanggil.

### 4. `README.md`

Langkah setup singkat: jalankan `bootstrap` → isi Script Properties → jalankan `pasangTrigger` → jalankan tes → reset data uji.

## Aturan

1. **Tulis dulu, jelaskan belakangan.** Saya butuh file yang bisa jalan, bukan uraian panjang.
2. **Kode harus lolos `clasp push` tanpa error sintaks.** Pakai gaya ES5/ES6 yang didukung V8 runtime Apps Script — hindari fitur yang tidak tersedia di sana.
3. **Jangan pernah menaruh token di dalam kode.** Semua rahasia lewat `PropertiesService`.
4. **Setiap fungsi yang menyentuh data harus idempoten.** Dijalankan dua kali tidak boleh menghasilkan order ganda.
5. Kalau ada bagian spec yang menurutmu keliru atau bakal bermasalah, **bilang sebelum menulis kodenya.** Saya lebih suka didebat di awal daripada menemukan masalahnya saat pembeli pertama sudah masuk.

## Yang sengaja belum diputuskan

Jangan diisi asumsi. Biarkan sebagai konstanta yang mudah diubah:

- **Ongkir** — belum jelas ditanggung pembeli atau panitia. Kolom `Ongkir` default 0, diisi manual. Siapkan strukturnya supaya kalau nanti saya pilih ongkir flat per zona, tinggal tambah tabel tarif.
- **Nomor rekening** — placeholder, saya isi lewat Script Properties.
- **Harga XXL** — sementara sama dengan ukuran lain, bisa berubah kalau konveksi mengenakan tambahan. Cukup diubah dari `MASTER_PRODUK`.
- **Size chart & desain kaos** — gambar menyusul, sediakan tempatnya di Form.

## Urutan kerja

Kerjakan `bootstrap.gs` sampai tuntas dulu. Setelah saya jalankan dan Form + Sheet betul-betul terbentuk, baru lanjut ke `Code.gs`. Jangan kerjakan semuanya sekaligus lalu menyerahkan tumpukan file yang belum pernah dijalankan.

Mulai dengan membaca spec dan mengonfirmasi ke saya: ada berapa SKU, berapa pertanyaan di Form, dan berapa tab di spreadsheet. Kalau tiga angka itu cocok dengan spec, saya tahu kamu sudah membacanya.
