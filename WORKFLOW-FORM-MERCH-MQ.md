# WORKFLOW SISTEM PRE-ORDER MERCH MQ

**Versi:** 1.0
**Tanggal dokumen:** 8 Agustus 2026
**PO Buka:** 10 Agustus 2026, 00:00 WIB
**PO Tutup:** 27 Agustus 2026, 23:59 WIB
**Stack:** Google Form → Google Sheets → Google Apps Script → Fonnte (WhatsApp API)

---

## 0. RINGKASAN EKSEKUTIF

Sistem PO merch berbasis Google Form yang otomatis:

1. Menerima pesanan multi-item multi-varian dari satu pembeli
2. Memecah pesanan menjadi baris-per-item (unpivot) untuk rekap produksi
3. Menghitung total tagihan + kode unik transfer
4. Mengirim WhatsApp konfirmasi + instruksi pembayaran ke pembeli
5. Mengirim notifikasi ke admin
6. Menghanguskan order yang tidak dibayar dalam 24 jam
7. Menyajikan rekap produksi per SKU secara real-time

**Prinsip desain:** semua logika data-driven dari sheet `MASTER_PRODUK`. Menambah item baru = tambah baris di sheet + tambah pertanyaan di Form. Tidak perlu sentuh kode.

**Alasan memilih stack ini:** deadline 2 hari. Apps Script menempel langsung di spreadsheet, tanpa hosting, tanpa biaya, tanpa deploy. `UrlFetchApp` sudah cukup untuk memanggil Fonnte. n8n / Make / Zapier / backend Node hanya menambah lapisan yang bisa putus.

---

## 1. KATALOG PRODUK — 13 SKU

Semua kaos hanya tersedia **warna hitam**. Tidak ada varian warna.

| SKU | Nama Item | Ukuran | Harga (Rp) |
|---|---|---|---|
| `KP-S` | Kaos Lengan Pendek | S | 120.000 |
| `KP-M` | Kaos Lengan Pendek | M | 120.000 |
| `KP-L` | Kaos Lengan Pendek | L | 120.000 |
| `KP-XL` | Kaos Lengan Pendek | XL | 120.000 |
| `KP-XXL` | Kaos Lengan Pendek | XXL | 120.000 |
| `KJ-S` | Kaos Lengan Panjang | S | 125.000 |
| `KJ-M` | Kaos Lengan Panjang | M | 125.000 |
| `KJ-L` | Kaos Lengan Panjang | L | 125.000 |
| `KJ-XL` | Kaos Lengan Panjang | XL | 125.000 |
| `KJ-XXL` | Kaos Lengan Panjang | XXL | 125.000 |
| `TB-STD` | Tumbler | — | 75.000 |
| `KR-STD` | Korek | — | 10.000 |
| `KC-STD` | Keychain | — | 20.000 |

> **⚠ KEPUTUSAN TERTUNDA — HARGA XXL**
> Di industri konveksi Indonesia, XXL umumnya kena tambahan Rp 5.000–10.000 karena bahan lebih banyak. Di spec ini harga XXL disamakan dengan ukuran lain. Kalau vendor konveksi mengenakan tambahan, **cukup ubah angka di kolom `Harga` sheet `MASTER_PRODUK`** — script otomatis ikut. Tidak perlu ubah kode.

---

## 2. STRUKTUR GOOGLE FORM

**Judul:** `Pre-Order Merch MQ 2026`
**Setelan wajib:**

| Setelan | Nilai | Alasan |
|---|---|---|
| Kumpulkan alamat email | **OFF** | Memaksa login Google = penyebab drop-off nomor satu |
| Batasi 1 respons | **OFF** | Orang boleh pesan lebih dari sekali |
| Izinkan edit setelah kirim | **OFF** | Kalau ON, pembeli bisa ubah pesanan diam-diam setelah kamu cetak |
| Acak urutan pertanyaan | **OFF** | Merusak urutan kolom di spreadsheet |
| Kirim tanda terima respons | OFF | Sudah diganti WhatsApp |

---

### BAGIAN 1 — Informasi & Ketentuan

Tipe: deskripsi bagian (tanpa pertanyaan).

```
PRE-ORDER MERCH MQ 2026

Periode PO: 10 – 27 Agustus 2026
Produksi menyesuaikan jumlah pesanan. Setelah PO ditutup, tidak ada penambahan.

KETENTUAN PEMBAYARAN
• Pembayaran via transfer bank.
• Nomor rekening dikirim otomatis via WhatsApp setelah form ini dikirim.
• Batas pembayaran 1x24 jam sejak form dikirim.
• Lewat batas waktu, pesanan otomatis dibatalkan sistem.
• Transfer sesuai NOMINAL UNIK yang tertera di WhatsApp (ada 3 digit
  terakhir yang berbeda). Ini untuk mempercepat verifikasi.
• Kirim bukti transfer ke WhatsApp admin: [NOMOR ADMIN]

PENGAMBILAN
• Kirim via ekspedisi, atau
• Ambil langsung di lokasi

Pastikan ukuran sudah sesuai tabel di bawah. Kesalahan ukuran
di luar tanggung jawab panitia.
```

**Sisipkan gambar SIZE CHART di bagian ini.** Format tabel: Ukuran / Lebar Dada (cm) / Panjang Badan (cm), untuk S–XXL.

> Ini bukan opsional. Tanpa size chart, salah ukuran bukan kemungkinan — itu kepastian, dan biayanya kamu yang tanggung.

---

### BAGIAN 2 — Data Pemesan

| # | Pertanyaan | Tipe | Wajib | Validasi |
|---|---|---|---|---|
| 2.1 | `Nama Lengkap` | Jawaban singkat | ✅ | — |
| 2.2 | `Nomor WhatsApp Aktif` | Jawaban singkat | ✅ | Regex: `^(\+62\|62\|0)8[0-9\s\-]{7,15}$` <br>Pesan error: *"Masukkan nomor WhatsApp aktif, contoh: 081234567890"* |
| 2.3 | `Asal Daerah / Kelompok` | Jawaban singkat *(atau dropdown jika daftar daerah sudah fix)* | ✅ | — |

> **Catatan teknis 2.2:** Regex Google Form kadang rewel dengan spasi. Kalau menyulitkan pengisi, longgarkan validasi — script tetap menormalkan nomor apa pun formatnya (lihat `normalisasiWA_`). Lebih baik data masuk lalu dibersihkan, daripada orang gagal submit.

---

### BAGIAN 3 — Pesanan

**3.1 — Kaos Lengan Pendek Hitam (Rp 120.000)**
Tipe: **Kisi-kisi pilihan ganda** (Multiple choice grid)

- Baris: `S` `M` `L` `XL` `XXL`
- Kolom: `0` `1` `2` `3` `4` `5`
- Wajib: ❌ (biar bisa pesan tumbler saja)
- Batasi satu respons per kolom: **OFF**

**3.2 — Kaos Lengan Panjang Hitam (Rp 125.000)**
Struktur identik dengan 3.1.

**3.3 — Tumbler (Rp 75.000)** → Dropdown: `0` `1` `2` `3` `4` `5`
**3.4 — Korek (Rp 10.000)** → Dropdown: `0` `1` `2` `3` `4` `5` `10`
**3.5 — Keychain (Rp 20.000)** → Dropdown: `0` `1` `2` `3` `4` `5` `10`

> **Kenapa grid, bukan checkbox + jumlah terpisah?**
> Grid menghasilkan satu kolom per ukuran di spreadsheet, langsung siap di-SUM. Checkbox menghasilkan satu kolom berisi teks gabungan yang harus di-parse — rapuh dan bikin rekap salah.
>
> **Judul pertanyaan grid harus PERSIS sama** dengan isi kolom `Header_Form` di `MASTER_PRODUK`. Ini kunci mapping-nya. Salah satu huruf saja, item tidak terbaca.

---

### BAGIAN 4 — Metode Pengambilan

| # | Pertanyaan | Tipe | Wajib |
|---|---|---|---|
| 4.1 | `Metode Pengambilan` | Pilihan ganda | ✅ |

Opsi:
- `Kirim via Ekspedisi` → **Buka Bagian 5**
- `Ambil di Lokasi` → **Buka Bagian 6**

Aktifkan: *"Buka bagian berdasarkan jawaban"* pada pertanyaan ini.

---

### BAGIAN 5 — Alamat Pengiriman

Semua wajib. Setelah bagian ini → **Lanjut ke Bagian 6**.

| # | Pertanyaan | Tipe |
|---|---|---|
| 5.1 | `Nama Penerima` | Jawaban singkat |
| 5.2 | `No HP Penerima` | Jawaban singkat |
| 5.3 | `Provinsi` | Jawaban singkat |
| 5.4 | `Kota / Kabupaten` | Jawaban singkat |
| 5.5 | `Kecamatan` | Jawaban singkat |
| 5.6 | `Alamat Lengkap (Jalan, RT/RW, No. Rumah, Patokan)` | Paragraf |
| 5.7 | `Kode Pos` | Jawaban singkat |

> **Alamat sengaja dipecah, bukan satu kotak bebas.** Satu kotak bebas = admin menghabiskan waktu menerjemahkan alamat yang ditulis sambil ngantuk, lalu paket nyasar. Kolom terpisah juga bikin sortir per kota untuk kirim kolektif jadi sepele.

---

### BAGIAN 6 — Penutup

| # | Pertanyaan | Tipe | Wajib |
|---|---|---|---|
| 6.1 | `Catatan (opsional)` | Paragraf | ❌ |

**Pesan konfirmasi Form:**
```
Pesanan diterima. ✅

Detail pesanan + nomor rekening + nominal transfer sedang dikirim
ke WhatsApp kamu (maksimal 2 menit).

⏰ Batas pembayaran: 1x24 jam sejak sekarang.
Lewat batas, pesanan otomatis dibatalkan.

Belum menerima WhatsApp setelah 5 menit? Hubungi admin: [NOMOR ADMIN]
```

---

## 3. STRUKTUR SPREADSHEET — 7 TAB

Nama file: `DB PO MERCH MQ 2026`

| Tab | Fungsi | Diisi oleh |
|---|---|---|
| `Form Responses 1` | Data mentah | Google Form (jangan pernah diedit manual) |
| `MASTER_PRODUK` | Katalog + mapping SKU ↔ kolom Form | Manual, sekali di awal |
| `ORDERS` | 1 baris per pemesan | Script |
| `ORDER_LINES` | 1 baris per item | Script |
| `REKAP_PRODUKSI` | Matriks produksi | Rumus |
| `DASHBOARD` | Ringkasan angka | Rumus |
| `LOG_WA` | Riwayat kirim WhatsApp | Script |

---

### 3.1 `MASTER_PRODUK`

Header di baris 1. **Ini otak konfigurasi sistem.**

| A `SKU` | B `Nama_Item` | C `Ukuran` | D `Harga` | E `Header_Form` | F `Aktif` |
|---|---|---|---|---|---|
| KP-S | Kaos Lengan Pendek | S | 120000 | `Kaos Lengan Pendek Hitam (Rp 120.000) [S]` | YA |
| KP-M | Kaos Lengan Pendek | M | 120000 | `Kaos Lengan Pendek Hitam (Rp 120.000) [M]` | YA |
| KP-L | Kaos Lengan Pendek | L | 120000 | `Kaos Lengan Pendek Hitam (Rp 120.000) [L]` | YA |
| KP-XL | Kaos Lengan Pendek | XL | 120000 | `Kaos Lengan Pendek Hitam (Rp 120.000) [XL]` | YA |
| KP-XXL | Kaos Lengan Pendek | XXL | 120000 | `Kaos Lengan Pendek Hitam (Rp 120.000) [XXL]` | YA |
| KJ-S | Kaos Lengan Panjang | S | 125000 | `Kaos Lengan Panjang Hitam (Rp 125.000) [S]` | YA |
| KJ-M | Kaos Lengan Panjang | M | 125000 | `Kaos Lengan Panjang Hitam (Rp 125.000) [M]` | YA |
| KJ-L | Kaos Lengan Panjang | L | 125000 | `Kaos Lengan Panjang Hitam (Rp 125.000) [L]` | YA |
| KJ-XL | Kaos Lengan Panjang | XL | 125000 | `Kaos Lengan Panjang Hitam (Rp 125.000) [XL]` | YA |
| KJ-XXL | Kaos Lengan Panjang | XXL | 125000 | `Kaos Lengan Panjang Hitam (Rp 125.000) [XXL]` | YA |
| TB-STD | Tumbler | — | 75000 | `Tumbler (Rp 75.000)` | YA |
| KR-STD | Korek | — | 10000 | `Korek (Rp 10.000)` | YA |
| KC-STD | Keychain | — | 20000 | `Keychain (Rp 20.000)` | YA |

> **🔴 LANGKAH KRITIS.** Setelah Form dibuat dan **satu tes submit** dilakukan, buka `Form Responses 1`, salin **teks header kolom apa adanya** ke kolom `Header_Form`. Jangan diketik ulang dari ingatan. Google Forms menambahkan `[S]`, `[M]` dst. secara otomatis pada grid — spasi dan tanda kurungnya harus sama persis.

---

### 3.2 `ORDERS` — 1 baris per pemesan

| Kol | Nama | Isi |
|---|---|---|
| A | `Order_ID` | `MQ-260810-001` |
| B | `Timestamp` | Waktu submit |
| C | `Nama` | Nama pemesan |
| D | `WA_Input` | Nomor apa adanya dari form |
| E | `WA_Normal` | `628xxx` hasil normalisasi |
| F | `Asal_Daerah` | |
| G | `Metode_Ambil` | `KIRIM` / `AMBIL` |
| H | `Nama_Penerima` | |
| I | `HP_Penerima` | |
| J | `Provinsi` | |
| K | `Kota` | |
| L | `Kecamatan` | |
| M | `Alamat` | |
| N | `Kode_Pos` | |
| O | `Total_Qty` | Total pcs |
| P | `Subtotal` | Rupiah sebelum kode unik |
| Q | `Ongkir` | **Diisi admin manual** (lihat catatan §9) |
| R | `Kode_Unik` | 3 digit, 100–999 |
| S | `Total_Transfer` | `Subtotal + Ongkir + Kode_Unik` |
| T | `Status_Bayar` | `BELUM_BAYAR` / `MENUNGGU_VERIFIKASI` / `LUNAS` / `EXPIRED` |
| U | `Batas_Bayar` | Timestamp + 24 jam |
| V | `Tgl_Verifikasi` | Diisi saat admin klik menu "Tandai LUNAS" |
| W | `Status_Order` | `VALID` / `DUPLIKAT` / `BATAL` |
| X | `Catatan_Pembeli` | |
| Y | `Catatan_Admin` | |
| Z | `Row_Form` | Nomor baris asal di `Form Responses 1` |

**Kenapa ada dua kolom status?** `Status_Bayar` mengurus uang. `Status_Order` mengurus keabsahan (duplikat, dibatalkan manual). Digabung jadi satu kolom akan bikin rekap ambigu ketika ada order lunas tapi ternyata duplikat.

---

### 3.3 `ORDER_LINES` — 1 baris per item ⭐

**Ini jantung sistem.** Di sinilah case "1 orang beli 3 kaos varian beda" terurai.

| Kol | Nama | Sumber |
|---|---|---|
| A | `Line_ID` | Script — `MQ-260810-001-L1` |
| B | `Order_ID` | Script |
| C | `Timestamp` | Script |
| D | `Nama` | Script |
| E | `SKU` | Script |
| F | `Nama_Item` | Script |
| G | `Ukuran` | Script |
| H | `Qty` | Script |
| I | `Harga_Satuan` | Script |
| J | `Subtotal_Line` | Script (`Qty × Harga`) |
| K | `Status_Bayar` | **Rumus** (lookup) |
| L | `Status_Order` | **Rumus** (lookup) |

**Rumus di sel K1 dan L1** (script hanya menulis kolom A–J, tidak pernah menyentuh K–L):

```
K1:  ={"Status_Bayar"; ARRAYFORMULA(IF(B2:B="";"";IFERROR(VLOOKUP(B2:B;ORDERS!$A:$T;20;FALSE);"")))}

L1:  ={"Status_Order"; ARRAYFORMULA(IF(B2:B="";"";IFERROR(VLOOKUP(B2:B;ORDERS!$A:$W;23;FALSE);"")))}
```

> **⚠ LOCALE.** Rumus di atas memakai `;` (locale Indonesia). Kalau spreadsheet-mu berlokal English (US), ganti semua `;` menjadi `,`. Cek di *File → Settings → Locale*. Ini gotcha klasik yang bikin orang stuck 30 menit.

**Contoh isi — case yang kamu sebutkan:**
Budi memesan 3 kaos varian berbeda + 1 tumbler.

| Line_ID | Order_ID | Nama | SKU | Nama_Item | Ukuran | Qty | Harga | Subtotal |
|---|---|---|---|---|---|---|---|---|
| MQ-260810-007-L1 | MQ-260810-007 | Budi | KP-M | Kaos Lengan Pendek | M | 1 | 120000 | 120000 |
| MQ-260810-007-L2 | MQ-260810-007 | Budi | KP-XL | Kaos Lengan Pendek | XL | 1 | 120000 | 120000 |
| MQ-260810-007-L3 | MQ-260810-007 | Budi | KJ-L | Kaos Lengan Panjang | L | 1 | 125000 | 125000 |
| MQ-260810-007-L4 | MQ-260810-007 | Budi | TB-STD | Tumbler | — | 1 | 75000 | 75000 |

Satu submit → 1 baris di `ORDERS`, 4 baris di `ORDER_LINES`. Kalau Budi ambil 2 pcs ukuran M, `Qty` jadi 2 — tetap satu baris.

---

### 3.4 `REKAP_PRODUKSI`

**Blok 1 — Matriks Kaos (untuk konveksi)**

Layout mulai A1:

|  | A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|---|
| 1 | **MODEL** | **S** | **M** | **L** | **XL** | **XXL** | **TOTAL** |
| 2 | Kaos Lengan Pendek | | | | | | |
| 3 | Kaos Lengan Panjang | | | | | | |

Rumus di **B2**, lalu drag ke `B2:F3`:

```
=SUMIFS(ORDER_LINES!$H:$H; ORDER_LINES!$F:$F; $A2; ORDER_LINES!$G:$G; B$1; ORDER_LINES!$L:$L; "VALID"; ORDER_LINES!$K:$K; "LUNAS")
```

Rumus di **G2**: `=SUM(B2:F2)`

**Blok 2 — Non-Kaos** (mulai A6)

| A | B |
|---|---|
| Tumbler | `=SUMIFS(ORDER_LINES!$H:$H; ORDER_LINES!$F:$F; $A6; ORDER_LINES!$L:$L; "VALID"; ORDER_LINES!$K:$K; "LUNAS")` |
| Korek | *(idem)* |
| Keychain | *(idem)* |

**Blok 3 — Proyeksi** (mulai A11)
Sama persis dengan Blok 1 & 2, tapi **tanpa filter `Status_Bayar`** — hanya `Status_Order = "VALID"`.

Gunanya: melihat potensi maksimal kalau semua yang pending akhirnya bayar. Blok 1 = angka yang kamu kirim ke konveksi. Blok 3 = angka untuk negosiasi kuantitas.

> **Kunci rekapnya:** semua SUMIFS **wajib** memfilter `Status_Order = VALID`. Tanpa itu, order duplikat, batal, dan expired ikut terhitung — dan kamu memproduksi kaos untuk pesanan yang tidak pernah ada.

---

### 3.5 `DASHBOARD`

| Metrik | Rumus |
|---|---|
| Total Order Masuk | `=COUNTA(ORDERS!A2:A)` |
| Order VALID | `=COUNTIF(ORDERS!W:W;"VALID")` |
| Sudah LUNAS | `=COUNTIFS(ORDERS!T:T;"LUNAS";ORDERS!W:W;"VALID")` |
| Menunggu Verifikasi | `=COUNTIFS(ORDERS!T:T;"MENUNGGU_VERIFIKASI";ORDERS!W:W;"VALID")` |
| Belum Bayar | `=COUNTIFS(ORDERS!T:T;"BELUM_BAYAR";ORDERS!W:W;"VALID")` |
| Expired | `=COUNTIF(ORDERS!T:T;"EXPIRED")` |
| **Omzet Terkonfirmasi** | `=SUMIFS(ORDERS!S:S;ORDERS!T:T;"LUNAS";ORDERS!W:W;"VALID")` |
| Potensi Omzet | `=SUMIFS(ORDERS!S:S;ORDERS!W:W;"VALID")` |
| Total Pcs (Lunas) | `=SUMIFS(ORDER_LINES!H:H;ORDER_LINES!K:K;"LUNAS";ORDER_LINES!L:L;"VALID")` |
| Order Kirim | `=COUNTIFS(ORDERS!G:G;"KIRIM";ORDERS!W:W;"VALID")` |
| Order Ambil di Lokasi | `=COUNTIFS(ORDERS!G:G;"AMBIL";ORDERS!W:W;"VALID")` |
| Sisa Hari PO | `=DATEDIF(TODAY();DATE(2026;8;27);"D")` |

**Rekap per daerah** (tabel dinamis):
```
=QUERY(ORDERS!A2:W; "SELECT F, COUNT(A), SUM(O) WHERE W='VALID' AND T='LUNAS' GROUP BY F ORDER BY COUNT(A) DESC LABEL F 'Daerah', COUNT(A) 'Jml Order', SUM(O) 'Total Pcs'"; 0)
```

---

### 3.6 `LOG_WA`

| A `Waktu` | B `Order_ID` | C `Target` | D `Jenis` | E `Status` | F `Respons_API` |
|---|---|---|---|---|---|

Jenis: `ORDER_MASUK` / `REMINDER` / `EXPIRED` / `LUNAS` / `ADMIN` / `TES`

Log ini bukan formalitas. Kalau device WA di Fonnte ke-logout, script tetap jalan dan API tetap membalas — pesan tidak terkirim **tanpa error yang kelihatan**. Log ini satu-satunya cara kamu tahu.

---

## 4. GOOGLE APPS SCRIPT

Buka spreadsheet → **Extensions → Apps Script** → hapus isi `Code.gs` → tempel seluruh kode di bawah.

```javascript
/*************************************************************
 * SISTEM PO MERCH MQ 2026
 * Google Form -> Sheets -> Apps Script -> Fonnte (WhatsApp)
 *************************************************************/

const SH = {
  RESP:   'Form Responses 1',
  PRODUK: 'MASTER_PRODUK',
  ORDERS: 'ORDERS',
  LINES:  'ORDER_LINES',
  LOG:    'LOG_WA'
};

const TZ = 'Asia/Jakarta';

// ====== KONFIGURASI AWAL — JALANKAN SEKALI ======
function setupProperties() {
  PropertiesService.getScriptProperties().setProperties({
    FONNTE_TOKEN   : 'ISI_TOKEN_FONNTE_DISINI',
    ADMIN_WA       : '628xxxxxxxxxx',
    NAMA_BANK      : 'BCA',
    NOMOR_REKENING : '1234567890',
    ATAS_NAMA      : 'Nama Pemilik Rekening',
    BATAS_JAM      : '24',
    PAKAI_KODE_UNIK: 'YA',
    ORDER_COUNTER  : '0',
    NOTIF_ADMIN    : 'YA'
  });
  SpreadsheetApp.getUi().alert('Konfigurasi tersimpan. Ganti nilainya di Project Settings → Script Properties.');
}

function P_(k, def) {
  const v = PropertiesService.getScriptProperties().getProperty(k);
  return (v === null || v === '') ? (def || '') : v;
}

// ====== MENU ADMIN ======
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('⚙️ ADMIN MERCH')
    .addItem('✅ Tandai LUNAS (baris terpilih)', 'tandaiLunas')
    .addItem('🕐 Tandai MENUNGGU VERIFIKASI', 'tandaiMenunggu')
    .addSeparator()
    .addItem('❌ Batalkan Order', 'batalkanOrder')
    .addItem('👥 Tandai DUPLIKAT', 'tandaiDuplikat')
    .addSeparator()
    .addItem('🔄 Proses ulang baris Form', 'prosesUlangDialog')
    .addItem('📤 Kirim ulang WA yang gagal', 'kirimUlangGagal')
    .addSeparator()
    .addItem('🧪 Tes koneksi Fonnte', 'tesFonnte')
    .addItem('⏰ Pasang trigger otomatis', 'pasangTrigger')
    .addToUi();
}

// ====== UTILITAS ======

/** Normalisasi nomor WA ke format 628xxxxxxxxx */
function normalisasiWA_(raw) {
  if (!raw) return '';
  let s = String(raw).replace(/\D/g, '');   // sisakan digit saja
  s = s.replace(/^0+/, '');                 // buang semua nol di depan
  if (s.indexOf('62') === 0) {
    // sudah benar
  } else if (s.indexOf('8') === 0) {
    s = '62' + s;
  } else {
    return '';
  }
  if (s.length < 11 || s.length > 15) return '';
  return s;
}

/** Peta header -> index kolom (0-based) */
function headerMap_(sheet) {
  const h = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const m = {};
  h.forEach(function(v, i) { m[String(v).trim()] = i; });
  return m;
}

/** Order ID berurutan: MQ-YYMMDD-001 */
function generateOrderId_() {
  const props = PropertiesService.getScriptProperties();
  const n = parseInt(props.getProperty('ORDER_COUNTER') || '0', 10) + 1;
  props.setProperty('ORDER_COUNTER', String(n));
  const tgl = Utilities.formatDate(new Date(), TZ, 'yyMMdd');
  return 'MQ-' + tgl + '-' + ('000' + n).slice(-3);
}

/** Kode unik 3 digit yang belum dipakai order aktif */
function kodeUnikBaru_(shOrders) {
  if (P_('PAKAI_KODE_UNIK', 'YA') !== 'YA') return 0;
  const last = shOrders.getLastRow();
  const dipakai = {};
  if (last > 1) {
    const data = shOrders.getRange(2, 18, last - 1, 3).getValues(); // R:T
    data.forEach(function(r) {
      if (r[2] === 'BELUM_BAYAR' || r[2] === 'MENUNGGU_VERIFIKASI') dipakai[r[0]] = true;
    });
  }
  for (let i = 0; i < 900; i++) {
    const k = 100 + Math.floor(Math.random() * 900);
    if (!dipakai[k]) return k;
  }
  return 100;
}

function rupiah_(n) {
  return 'Rp ' + Number(n).toLocaleString('id-ID');
}

// ====== FONNTE ======

function kirimWA_(target, pesan, orderId, jenis) {
  const token = P_('FONNTE_TOKEN');
  let ok = false, info = '';

  if (!token || token === 'ISI_TOKEN_FONNTE_DISINI') {
    info = 'FONNTE_TOKEN belum diisi';
  } else if (!target) {
    info = 'Nomor tujuan kosong / tidak valid';
  } else {
    try {
      const res = UrlFetchApp.fetch('https://api.fonnte.com/send', {
        method: 'post',
        headers: { 'Authorization': token },   // tanpa "Bearer"
        payload: {
          target: String(target),
          message: pesan,
          countryCode: '62'
        },
        muteHttpExceptions: true
      });
      const teks = res.getContentText();
      let body = {};
      try { body = JSON.parse(teks); } catch (e) {}
      // Fonnte tidak konsisten: kadang "status", kadang "Status"
      ok = (body.status === true) || (body.Status === true);
      info = ok ? (body.detail || 'terkirim') : (body.reason || teks);
    } catch (err) {
      info = 'ERROR: ' + err.message;
    }
  }

  logWA_(orderId, target, jenis, ok ? 'BERHASIL' : 'GAGAL', info);
  return ok;
}

function logWA_(orderId, target, jenis, status, info) {
  const sh = SpreadsheetApp.getActive().getSheetByName(SH.LOG);
  if (!sh) return;
  sh.appendRow([new Date(), orderId || '', target || '', jenis || '', status, String(info).slice(0, 500)]);
}

// ====== HANDLER UTAMA ======

function onFormSubmit(e) {
  if (!e || !e.range) return;
  prosesBaris_(e.range.getRow());
}

/**
 * Memproses satu baris Form Responses.
 * Dipisah dari trigger supaya bisa dipanggil ulang manual saat recovery.
 */
function prosesBaris_(rowNum) {
  const lock = LockService.getScriptLock();
  try { lock.waitLock(30000); } catch (err) { return; }

  try {
    const ss     = SpreadsheetApp.getActive();
    const shResp = ss.getSheetByName(SH.RESP);
    const shProd = ss.getSheetByName(SH.PRODUK);
    const shOrd  = ss.getSheetByName(SH.ORDERS);
    const shLine = ss.getSheetByName(SH.LINES);

    // --- cegah proses ganda ---
    const lastOrd = shOrd.getLastRow();
    if (lastOrd > 1) {
      const rowsForm = shOrd.getRange(2, 26, lastOrd - 1, 1).getValues(); // kolom Z
      for (let i = 0; i < rowsForm.length; i++) {
        if (Number(rowsForm[i][0]) === Number(rowNum)) return; // sudah diproses
      }
    }

    const H   = headerMap_(shResp);
    const row = shResp.getRange(rowNum, 1, 1, shResp.getLastColumn()).getValues()[0];
    const get = function(nama) {
      return (H[nama] === undefined) ? '' : row[H[nama]];
    };

    // --- identitas ---
    const timestamp = get('Timestamp') || new Date();
    const nama      = String(get('Nama Lengkap')).trim();
    const waInput   = String(get('Nomor WhatsApp Aktif')).trim();
    const waNormal  = normalisasiWA_(waInput);
    const daerah    = String(get('Asal Daerah / Kelompok')).trim();
    const catatan   = String(get('Catatan (opsional)')).trim();

    // --- pengambilan ---
    const metodeRaw = String(get('Metode Pengambilan'));
    const metode    = metodeRaw.toUpperCase().indexOf('AMBIL') >= 0 ? 'AMBIL' : 'KIRIM';

    // --- baca produk dari MASTER_PRODUK ---
    const prod = shProd.getRange(2, 1, Math.max(shProd.getLastRow() - 1, 1), 6).getValues();
    const lines = [];
    let totalQty = 0, subtotal = 0;

    prod.forEach(function(p) {
      const sku = String(p[0]).trim();
      if (!sku || String(p[5]).toUpperCase() !== 'YA') return;
      const namaItem = String(p[1]).trim();
      const ukuran   = String(p[2]).trim();
      const harga    = Number(p[3]) || 0;
      const header   = String(p[4]).trim();

      if (H[header] === undefined) return;              // kolom tidak ada di Form
      const qty = parseInt(row[H[header]], 10);
      if (!qty || qty <= 0) return;

      lines.push({ sku: sku, nama: namaItem, ukuran: ukuran, qty: qty, harga: harga, sub: qty * harga });
      totalQty += qty;
      subtotal += qty * harga;
    });

    if (lines.length === 0) return;   // form kosong, abaikan

    // --- buat order ---
    const orderId  = generateOrderId_();
    const kodeUnik = kodeUnikBaru_(shOrd);
    const totalTf  = subtotal + kodeUnik;
    const batas    = new Date(new Date(timestamp).getTime() + parseInt(P_('BATAS_JAM', '24'), 10) * 3600 * 1000);

    shOrd.appendRow([
      orderId, timestamp, nama, waInput, waNormal, daerah, metode,
      metode === 'KIRIM' ? get('Nama Penerima')  : '',
      metode === 'KIRIM' ? get('No HP Penerima') : '',
      metode === 'KIRIM' ? get('Provinsi')       : '',
      metode === 'KIRIM' ? get('Kota / Kabupaten') : '',
      metode === 'KIRIM' ? get('Kecamatan')      : '',
      metode === 'KIRIM' ? get('Alamat Lengkap (Jalan, RT/RW, No. Rumah, Patokan)') : '',
      metode === 'KIRIM' ? get('Kode Pos')       : '',
      totalQty, subtotal, 0, kodeUnik, totalTf,
      'BELUM_BAYAR', batas, '', 'VALID', catatan, '', rowNum
    ]);

    // --- tulis ORDER_LINES ---
    const barisLine = lines.map(function(l, i) {
      return [
        orderId + '-L' + (i + 1), orderId, timestamp, nama,
        l.sku, l.nama, l.ukuran, l.qty, l.harga, l.sub
      ];
    });
    shLine.getRange(shLine.getLastRow() + 1, 1, barisLine.length, 10).setValues(barisLine);

    // --- kirim WhatsApp ---
    const pesan = pesanOrderMasuk_({
      orderId: orderId, nama: nama, lines: lines, totalQty: totalQty,
      subtotal: subtotal, kodeUnik: kodeUnik, totalTf: totalTf,
      metode: metode, batas: batas
    });
    kirimWA_(waNormal, pesan, orderId, 'ORDER_MASUK');

    if (P_('NOTIF_ADMIN', 'YA') === 'YA') {
      const adm = '🔔 ORDER BARU\n\n' + orderId + '\n' + nama + ' — ' + daerah +
                  '\n' + totalQty + ' pcs • ' + rupiah_(totalTf) +
                  '\n' + (metode === 'KIRIM' ? 'Kirim ke ' + get('Kota / Kabupaten') : 'Ambil di lokasi');
      kirimWA_(P_('ADMIN_WA'), adm, orderId, 'ADMIN');
    }

  } finally {
    lock.releaseLock();
  }
}

// ====== TEMPLATE PESAN ======

function pesanOrderMasuk_(o) {
  let t = '';
  t += '*PESANAN DITERIMA* ✅\n';
  t += 'Order ID: *' + o.orderId + '*\n\n';
  t += 'Halo ' + o.nama + ', terima kasih sudah memesan Merch MQ.\n\n';
  t += '*RINCIAN PESANAN*\n';
  o.lines.forEach(function(l) {
    const label = l.ukuran && l.ukuran !== '—' ? l.nama + ' ' + l.ukuran : l.nama;
    t += '• ' + label + ' × ' + l.qty + '  = ' + rupiah_(l.sub) + '\n';
  });
  t += '\nTotal item: ' + o.totalQty + ' pcs\n';
  t += 'Subtotal: ' + rupiah_(o.subtotal) + '\n';
  if (o.kodeUnik > 0) t += 'Kode unik: ' + o.kodeUnik + '\n';
  t += '\n*TOTAL TRANSFER*\n*' + rupiah_(o.totalTf) + '*\n';
  t += '\n⚠️ Transfer *sesuai nominal di atas sampai digit terakhir*. Kode unik ini yang membuat pembayaranmu langsung terverifikasi.\n';
  t += '\n*REKENING*\n';
  t += P_('NAMA_BANK') + '\n' + P_('NOMOR_REKENING') + '\na.n. ' + P_('ATAS_NAMA') + '\n';
  t += '\n⏰ *Batas pembayaran:*\n' + Utilities.formatDate(o.batas, TZ, 'EEEE, dd MMMM yyyy, HH:mm') + ' WIB\n';
  t += 'Lewat batas ini, pesanan otomatis dibatalkan.\n';
  t += '\nSetelah transfer, *kirim bukti ke chat ini*.\n';
  t += '\nPengambilan: ' + (o.metode === 'KIRIM' ? 'Dikirim via ekspedisi' : 'Ambil di lokasi') + '\n';
  return t;
}

// ====== AKSI ADMIN ======

function barisAktif_() {
  const sh = SpreadsheetApp.getActiveSheet();
  if (sh.getName() !== SH.ORDERS) {
    SpreadsheetApp.getUi().alert('Buka tab ORDERS dulu, lalu klik baris order yang dimaksud.');
    return null;
  }
  const r = sh.getActiveRange().getRow();
  if (r < 2) { SpreadsheetApp.getUi().alert('Pilih baris data, bukan header.'); return null; }
  return { sh: sh, row: r };
}

function tandaiLunas() {
  const a = barisAktif_(); if (!a) return;
  a.sh.getRange(a.row, 20).setValue('LUNAS');      // T
  a.sh.getRange(a.row, 21).setValue(new Date());   // U
  const d = a.sh.getRange(a.row, 1, 1, 26).getValues()[0];
  const pesan = '*PEMBAYARAN TERVERIFIKASI* ✅\n\nOrder ' + d[0] + '\na.n. ' + d[2] +
                '\n' + d[14] + ' pcs • ' + rupiah_(d[18]) +
                '\n\nPesananmu masuk daftar produksi. Info berikutnya akan kami kabari lewat chat ini.\n\nTerima kasih 🙏';
  kirimWA_(d[4], pesan, d[0], 'LUNAS');
  SpreadsheetApp.getActive().toast('Order ' + d[0] + ' → LUNAS');
}

function tandaiMenunggu() {
  const a = barisAktif_(); if (!a) return;
  a.sh.getRange(a.row, 20).setValue('MENUNGGU_VERIFIKASI');
  SpreadsheetApp.getActive().toast('Status → MENUNGGU_VERIFIKASI');
}

function batalkanOrder() {
  const a = barisAktif_(); if (!a) return;
  const ui = SpreadsheetApp.getUi();
  if (ui.alert('Batalkan order ini?', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  a.sh.getRange(a.row, 23).setValue('BATAL');      // W
  SpreadsheetApp.getActive().toast('Order dibatalkan.');
}

function tandaiDuplikat() {
  const a = barisAktif_(); if (!a) return;
  a.sh.getRange(a.row, 23).setValue('DUPLIKAT');
  SpreadsheetApp.getActive().toast('Ditandai DUPLIKAT.');
}

function prosesUlangDialog() {
  const ui = SpreadsheetApp.getUi();
  const res = ui.prompt('Proses ulang', 'Nomor baris di "Form Responses 1":', ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  const n = parseInt(res.getResponseText(), 10);
  if (!n || n < 2) { ui.alert('Nomor baris tidak valid.'); return; }
  prosesBaris_(n);
  ui.alert('Selesai. Cek tab ORDERS.');
}

function kirimUlangGagal() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SH.LOG);
  const last = sh.getLastRow();
  if (last < 2) return;
  const data = sh.getRange(2, 1, last - 1, 6).getValues();
  let n = 0;
  data.forEach(function(r, i) {
    if (r[4] !== 'GAGAL' || !r[2]) return;
    if (kirimWA_(r[2], '(kirim ulang) Silakan hubungi admin untuk detail order ' + r[1], r[1], 'ULANG')) {
      sh.getRange(i + 2, 5).setValue('GAGAL (sudah dikirim ulang)');
      n++;
    }
  });
  SpreadsheetApp.getUi().alert('Berhasil kirim ulang: ' + n);
}

function tesFonnte() {
  const ok = kirimWA_(P_('ADMIN_WA'), '🧪 Tes koneksi Fonnte — ' +
    Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy HH:mm') + ' WIB', 'TES', 'TES');
  SpreadsheetApp.getUi().alert(ok
    ? 'Berhasil. Cek WhatsApp admin.'
    : 'GAGAL. Buka tab LOG_WA, baca kolom Respons_API.');
}

// ====== TRIGGER TERJADWAL ======

/** Jalan tiap jam: hanguskan order lewat batas, kirim reminder H-3 jam */
function cekExpired() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SH.ORDERS);
  const last = sh.getLastRow();
  if (last < 2) return;

  const data = sh.getRange(2, 1, last - 1, 26).getValues();
  const now  = new Date();

  data.forEach(function(d, i) {
    const r = i + 2;
    if (d[22] !== 'VALID') return;          // W: Status_Order
    if (d[19] !== 'BELUM_BAYAR') return;    // T: Status_Bayar
    if (!d[20]) return;                     // U: Batas_Bayar

    const batas = new Date(d[20]);
    const sisaJam = (batas - now) / 3600000;

    if (sisaJam <= 0) {
      sh.getRange(r, 20).setValue('EXPIRED');
      kirimWA_(d[4],
        '⌛ *PESANAN DIBATALKAN*\n\nOrder ' + d[0] + ' dibatalkan otomatis karena melewati batas pembayaran.\n\n' +
        'Masih ingin memesan? Isi ulang form selama PO masih buka (sampai 27 Agustus 2026).',
        d[0], 'EXPIRED');

    } else if (sisaJam <= 3 && d[24] !== 'REMINDER_TERKIRIM') {
      kirimWA_(d[4],
        '⏰ *PENGINGAT PEMBAYARAN*\n\nOrder ' + d[0] + '\nTotal: *' + rupiah_(d[18]) + '*\n\n' +
        P_('NAMA_BANK') + ' ' + P_('NOMOR_REKENING') + '\na.n. ' + P_('ATAS_NAMA') + '\n\n' +
        'Batas ' + Utilities.formatDate(batas, TZ, 'HH:mm') + ' WIB (± ' + Math.ceil(sisaJam) + ' jam lagi).\n' +
        'Lewat itu pesanan otomatis batal.',
        d[0], 'REMINDER');
      sh.getRange(r, 25).setValue('REMINDER_TERKIRIM');  // Y: Catatan_Admin
    }
  });
}

/** Health check harian — memastikan device WA masih tersambung */
function healthCheck() {
  kirimWA_(P_('ADMIN_WA'),
    '☀️ Sistem PO Merch MQ aktif.\nSisa hari PO: ' +
    Math.max(0, Math.ceil((new Date(2026, 7, 27) - new Date()) / 86400000)) + ' hari.',
    'HEALTH', 'TES');
}

/** Pasang semua trigger. Jalankan sekali. */
function pasangTrigger() {
  const ss = SpreadsheetApp.getActive();
  ScriptApp.getProjectTriggers().forEach(function(t) { ScriptApp.deleteTrigger(t); });

  ScriptApp.newTrigger('onFormSubmit').forSpreadsheet(ss).onFormSubmit().create();
  ScriptApp.newTrigger('cekExpired').timeBased().everyHours(1).create();
  ScriptApp.newTrigger('healthCheck').timeBased().atHour(8).everyDays(1).inTimezone(TZ).create();

  SpreadsheetApp.getUi().alert('3 trigger terpasang:\n• onFormSubmit\n• cekExpired (tiap jam)\n• healthCheck (tiap 08:00)');
}
```

---

## 5. SETUP FONNTE

### 5.1 Ambil token

1. Login [fonnte.com](https://fonnte.com) → menu **Device**
2. Pastikan device **berstatus `connected`** (QR sudah discan)
3. Salin **Token Device** (bukan Account Token)

### 5.2 Simpan token dengan aman

**Jangan tulis token di dalam kode.** Kalau spreadsheet ini nanti kamu share ke tim, tokennya ikut terbaca.

1. Apps Script → ⚙️ **Project Settings**
2. Scroll ke **Script Properties** → **Add script property**
3. Isi:

| Property | Value |
|---|---|
| `FONNTE_TOKEN` | token device dari dashboard |
| `ADMIN_WA` | `628xxxxxxxxxx` |
| `NAMA_BANK` | `BCA` |
| `NOMOR_REKENING` | `1234567890` |
| `ATAS_NAMA` | nama pemilik rekening |
| `BATAS_JAM` | `24` |
| `PAKAI_KODE_UNIK` | `YA` |
| `ORDER_COUNTER` | `0` |
| `NOTIF_ADMIN` | `YA` |

Alternatif: jalankan fungsi `setupProperties()` sekali, lalu edit nilainya lewat Project Settings.

### 5.3 Spesifikasi API (terverifikasi dari docs.fonnte.com)

| Aspek | Nilai |
|---|---|
| Endpoint | `https://api.fonnte.com/send` |
| Method | `POST` |
| Header | `Authorization: <TOKEN>` — **tanpa** `Bearer` |
| `target` | **wajib string**, bukan angka. Multi-target dipisah koma |
| `message` | maks 60.000 karakter, mendukung emoji |
| `countryCode` | default `62`, mengganti angka 0 di depan |
| Sukses | `{"status": true, "detail": "success! message in queue", ...}` |
| Gagal | `{"status": false, "reason": "...", ...}` |

**Tiga jebakan yang bikin Fonnte gagal diam-diam:**

1. **Format nomor.** Fonnte butuh `628xxx`. Orang mengisi form dengan `08xx`, `+62 8xx`, `62-8xx`, pakai spasi. Fungsi `normalisasiWA_()` menangani semuanya. Ini penyebab nomor satu keluhan "kok WA-nya nggak masuk".

2. **Response inkonsisten.** Dokumentasi Fonnte kadang menulis `"status"` (huruf kecil), kadang `"Status"` (huruf besar) untuk kasus error. Kode di atas mengecek keduanya. Kalau hanya cek satu, kegagalan akan terbaca sebagai keberhasilan.

3. **Device ke-logout.** Script tetap jalan, API tetap membalas, pesan tidak terkirim. Tidak ada error yang kelihatan. Karena itu ada `LOG_WA` + `healthCheck()` harian + menu "Kirim ulang WA yang gagal".

**Estimasi kuota:** 1 order = 2 pesan (pembeli + admin). Ditambah reminder & konfirmasi lunas, hitung **~4 pesan per order**. 200 order ≈ 800 pesan. Pastikan kuota paket Fonnte-mu cukup sebelum PO dibuka — kalau habis di tengah jalan, API mengembalikan `"insufficient quota"` dan konfirmasi pembeli berhenti tanpa pemberitahuan.

---

## 6. URUTAN SETUP (2 JAM)

### Tahap 1 — Form (30 menit)
- [ ] Buat Google Form sesuai §2
- [ ] Upload gambar size chart
- [ ] Atur branching Bagian 4 → 5/6
- [ ] Matikan "kumpulkan email" & "izinkan edit"
- [ ] Tulis pesan konfirmasi

### Tahap 2 — Spreadsheet (30 menit)
- [ ] Responses → **Link to Sheets** → beri nama `DB PO MERCH MQ 2026`
- [ ] **Submit 1x sebagai tes** — isi semua field
- [ ] Buat 6 tab tambahan: `MASTER_PRODUK`, `ORDERS`, `ORDER_LINES`, `REKAP_PRODUKSI`, `DASHBOARD`, `LOG_WA`
- [ ] Isi header tiap tab sesuai §3
- [ ] Isi 13 baris `MASTER_PRODUK`
- [ ] 🔴 **Salin header kolom grid dari `Form Responses 1` ke kolom `Header_Form`** — copy-paste, jangan diketik
- [ ] Pasang rumus `ARRAYFORMULA` di `ORDER_LINES!K1` & `L1`
- [ ] Pasang rumus `REKAP_PRODUKSI` & `DASHBOARD`
- [ ] Cek locale rumus (`;` vs `,`)

### Tahap 3 — Script (30 menit)
- [ ] Extensions → Apps Script → tempel kode §4
- [ ] Isi Script Properties (§5.2)
- [ ] Run `setupProperties` → **Authorize** (klik *Advanced → Go to project*)
- [ ] Run `pasangTrigger`
- [ ] Refresh spreadsheet → menu **⚙️ ADMIN MERCH** muncul
- [ ] Menu → **🧪 Tes koneksi Fonnte** → WA admin harus masuk

### Tahap 4 — Tes end-to-end (30 menit)
- [ ] Jalankan 5 skenario §7
- [ ] Kosongkan `ORDERS`, `ORDER_LINES`, `LOG_WA` (sisakan header)
- [ ] Reset `ORDER_COUNTER` → `0`
- [ ] Hapus baris tes di `Form Responses 1`
- [ ] Protect range: tab `MASTER_PRODUK` & `REKAP_PRODUKSI`
- [ ] Kunci form sampai 10 Agustus

---

## 7. SKENARIO TES WAJIB

| # | Skenario | Hasil yang benar |
|---|---|---|
| 1 | **Multi-varian** — 1 kaos pendek M, 1 kaos pendek XL, 1 kaos panjang L, 1 tumbler | `ORDERS` +1 baris • `ORDER_LINES` +4 baris • Subtotal `440.000` • WA masuk dengan 4 item terurai |
| 2 | **Qty > 1** — 3 kaos pendek L | `ORDER_LINES` **1 baris** dengan `Qty=3`, subtotal `360.000` |
| 3 | **Non-kaos saja** — 2 korek | 1 baris, `20.000`, tidak error walau grid kaos kosong |
| 4 | **Ambil di lokasi** | Kolom H–N kosong, `Metode_Ambil = AMBIL`, WA menulis "Ambil di lokasi" |
| 5 | **Nomor berantakan** — isi `+62 812-3456-7890` | `WA_Normal` = `6281234567890`, WA tetap terkirim |
| 6 | **Expired** — set `Batas_Bayar` ke masa lalu, run `cekExpired` manual | `Status_Bayar → EXPIRED`, WA pembatalan terkirim, `REKAP_PRODUKSI` **berkurang** |
| 7 | **Verifikasi lunas** — pilih baris, menu → Tandai LUNAS | `Status_Bayar → LUNAS`, `Tgl_Verifikasi` terisi, WA konfirmasi terkirim, angka `REKAP_PRODUKSI` **naik** |

Skenario 1 dan 6 yang paling penting. Skenario 1 membuktikan unpivot bekerja. Skenario 6 membuktikan rekap produksimu tidak gembung oleh order fiktif.

---

## 8. TROUBLESHOOTING

| Gejala | Penyebab | Solusi |
|---|---|---|
| `ORDERS` tidak terisi | Trigger belum terpasang | Menu → **Pasang trigger otomatis** |
| Item tidak masuk `ORDER_LINES` | `Header_Form` tidak persis sama | Copy-paste ulang header dari `Form Responses 1`. Cek spasi ganda & tanda kurung |
| WA tidak terkirim, `LOG_WA` kosong | Script berhenti sebelum kirim | Apps Script → **Executions**, baca error terakhir |
| `LOG_WA` = GAGAL, reason `token invalid` | Token salah / pakai Account Token | Ambil **Token Device**, bukan Account Token |
| `reason: target invalid` | Nomor tidak lolos normalisasi | Cek kolom `WA_Normal` di `ORDERS`. Kalau kosong, nomor memang tidak valid |
| `reason: insufficient quota` | Kuota Fonnte habis | Top up. Setelah itu menu → **Kirim ulang WA yang gagal** |
| `status: true` tapi WA tidak sampai | Device ke-logout dari WhatsApp | Scan ulang QR di dashboard Fonnte, lalu kirim ulang |
| Rumus `#ERROR!` / `#N/A` | Locale `;` vs `,` | File → Settings → Locale, atau ganti semua pemisah argumen |
| `REKAP_PRODUKSI` lebih besar dari kenyataan | Filter status tidak lengkap | Pastikan setiap SUMIFS memfilter `Status_Order = VALID` **dan** `Status_Bayar = LUNAS` |
| Order terproses dua kali | Trigger dobel | Run `pasangTrigger` (fungsi ini menghapus semua trigger lama dulu) |
| `Exceeded maximum execution time` | Terlalu banyak order sekaligus | Naikkan timeout `waitLock` ke 60000, atau proses ulang manual |

---

## 9. YANG MASIH MENGGANTUNG

**1. Ongkir — perlu keputusan.**
Kamu menulis "ongkir ditanggung", dan itu bisa dibaca dua arah: ditanggung pembeli, atau ditanggung panitia (gratis ongkir). Dua-duanya masuk akal untuk merch komunitas.

Di spec ini `Ongkir` = kolom Q di `ORDERS`, **default 0**, diisi admin manual setelah cek tarif ekspedisi.

- Kalau **panitia yang menanggung** → biarkan 0, tidak ada yang perlu diubah.
- Kalau **pembeli yang membayar** → ada masalah alur: pembeli sudah terlanjur dapat nominal transfer sebelum ongkir dihitung. Solusinya salah satu dari:
  - Ongkir flat (misal Rp 25.000 dalam Jawa, Rp 45.000 luar Jawa) → bisa dihitung otomatis dari kolom `Provinsi`, tinggal tambah tabel tarif di `MASTER_PRODUK`
  - Ongkir ditagih terpisah lewat WA setelah admin cek tarif → alur dua tahap, lebih repot tapi akurat

Kalau kamu pilih ongkir flat per zona, kabari — penyesuaian kodenya kecil, sekitar 15 baris.

**2. Nomor rekening** masih placeholder. Isi di Script Properties sebelum 10 Agustus. Sistem tetap jalan tanpa itu, tapi pembeli menerima WA berisi rekening kosong.

**3. Desain kaos** menyusul — tidak memblokir. Kalau nanti mau ditampilkan di form, cukup upload gambar di Bagian 1 dan Bagian 3.

**4. Size chart** belum ada. Ini yang paling mendesak dari tiga poin di atas, karena langsung berdampak ke biaya retur/tukar ukuran.

**5. Privasi.** Spreadsheet ini berisi alamat dan nomor HP orang. Batasi akses ke admin inti saja, dan pasang protected range pada `MASTER_PRODUK` + `REKAP_PRODUKSI` supaya rumus tidak tersenggol saat ada yang scroll sambil mengedit.

---

## 10. RITME OPERASIONAL HARIAN

**Pagi (10 menit)**
1. Cek WA health check jam 08:00 — kalau tidak masuk, device Fonnte bermasalah
2. Buka `DASHBOARD`, catat angka
3. Cek mutasi bank, cocokkan dengan `Total_Transfer` (3 digit terakhir = kode unik)
4. Untuk setiap yang cocok: pilih baris di `ORDERS` → menu → **Tandai LUNAS**

**Sore (5 menit)**
5. Cek `LOG_WA`, filter `GAGAL` → menu → **Kirim ulang WA yang gagal**
6. Cek order berstatus `MENUNGGU_VERIFIKASI` yang menggantung > 12 jam

**H-3 sebelum tutup (24 Agustus)**
7. Broadcast pengingat "PO tutup 27 Agustus"

**H+1 setelah tutup (28 Agustus)**
8. Run `cekExpired` manual untuk membersihkan sisa
9. Kunci Form (Responses → **Not accepting responses**)
10. Kunci semua tab, export `REKAP_PRODUKSI` → kirim ke konveksi
11. Export `ORDERS` (filter `LUNAS` + `VALID`) → jadikan packing list

---

## 11. PENGEMBANGAN LANJUTAN (BUKAN SEKARANG)

Jangan dikerjakan sebelum 10 Agustus. Catat untuk PO periode berikutnya:

| Fitur | Nilai | Kompleksitas |
|---|---|---|
| Form web sendiri (keranjang belanja, total live, stok habis auto-disable) | Tinggi | Sedang — GitHub Pages + Apps Script Web App |
| Auto-verifikasi mutasi bank via API | Tinggi | Tinggi — butuh Moota/BRIAPI |
| Upload bukti transfer langsung di form | Sedang | Rendah, **tapi memaksa login Google** |
| Halaman cek status order (input Order ID) | Sedang | Rendah |
| Generate PDF invoice per order | Rendah | Rendah |
| Sinkron resi ekspedisi + notif otomatis | Sedang | Sedang |

Karena struktur datanya sudah bersih (`ORDERS` + `ORDER_LINES` terpisah), semua fitur di atas tinggal menempel. Input layer bisa diganti tanpa membongkar backend.

---

*Dokumen ini adalah spec eksekusi. Setiap blok kode siap tempel. Setiap rumus siap salin.*
