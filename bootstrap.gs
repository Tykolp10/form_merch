/**
 * ============================================================================
 * BOOTSTRAP SCRIPT — PRE-ORDER MERCH MQ 2026
 * ============================================================================
 * Menjalankan fungsi `bootstrapSystem()` ini SEKALI untuk membuat otomatis:
 * 1. Google Form lengkap dengan section, branching, grid, & validation
 * 2. Google Spreadsheet dengan 7 tab, header, formatting, & rumus
 * 3. Mengisi MASTER_PRODUK dengan Header_Form yang didapatkan terprogram dari Form
 * 4. Menghubungkan Google Form ke Spreadsheet
 * ============================================================================
 */

function bootstrapSystem() {
  Logger.log('=== MEMULAI BOOTSTRAP SISTEM PO MERCH MQ 2026 ===');

  // --------------------------------------------------------------------------
  // 1. MEMBUAT GOOGLE FORM
  // --------------------------------------------------------------------------
  const form = FormApp.create('Pre-Order Merch MQ 2026');
  form.setCollectEmail(false);
  form.setAllowResponseEdits(false);
  form.setShuffleQuestions(false);

  // Set Confirmation Message
  form.setConfirmationMessage(
    'Pesanan diterima. ✅\n\n' +
    'Detail pesanan + nomor rekening + nominal transfer sedang dikirim ke WhatsApp kamu (maksimal 2 menit).\n\n' +
    '⏰ Batas pembayaran: 1x24 jam sejak sekarang.\n' +
    'Lewat batas, pesanan otomatis dibatalkan.\n\n' +
    'Belum menerima WhatsApp setelah 5 menit? Hubungi Admin CS: 0895330478397'
  );

  // BAGIAN 1 — Informasi & Ketentuan
  form.setTitle('Pre-Order Merch MQ 2026');
  form.setDescription(
    'PRE-ORDER MERCH MQ 2026\n\n' +
    'Periode PO: 10 – 27 Agustus 2026\n' +
    'Produksi menyesuaikan jumlah pesanan. Setelah PO ditutup, tidak ada penambahan.\n\n' +
    '📐 SIZE CHART KAOS (Lebar Dada x Panjang Badan):\n' +
    '• S   : 47 cm x 67 cm\n' +
    '• M   : 49 cm x 70 cm\n' +
    '• L   : 52 cm x 73 cm\n' +
    '• XL  : 55 cm x 75 cm\n' +
    '• XXL : 58 cm x 78 cm\n' +
    '*(Toleransi ukuran ±1-2 cm)*\n\n' +
    'KETENTUAN PEMBAYARAN\n' +
    '• Pembayaran via transfer bank.\n' +
    '• Nomor rekening dikirim otomatis via WhatsApp setelah form ini dikirim.\n' +
    '• Batas pembayaran 1x24 jam sejak form dikirim.\n' +
    '• Lewat batas waktu, pesanan otomatis dibatalkan sistem.\n' +
    '• Transfer sesuai NOMINAL UNIK yang tertera di WhatsApp (ada 3 digit terakhir yang berbeda). Ini untuk mempercepat verifikasi.\n' +
    '• Kirim bukti transfer ke WhatsApp Admin CS: 0895330478397\n\n' +
    'PENGAMBILAN & ONGKIR\n' +
    '• Kirim via ekspedisi (ongkir akan diinformasikan oleh admin saat pengiriman/resi), atau\n' +
    '• Ambil langsung di lokasi\n\n' +
    'Pastikan ukuran sudah sesuai tabel di atas. Kesalahan ukuran di luar tanggung jawab panitia.'
  );

  // BAGIAN 2 — Data Pemesan
  const sec2 = form.addPageBreakItem().setTitle('BAGIAN 2 — Data Pemesan');
  
  const qNama = form.addTextItem().setTitle('Nama Lengkap').setRequired(true);
  
  const qWA = form.addTextItem().setTitle('Nomor WhatsApp Aktif').setRequired(true);
  const waRegex = FormApp.createTextValidation()
    .requireTextMatchesPattern('^(\\+62|62|0)8[0-9\\s\\-]{7,15}$')
    .setHelpText('Masukkan nomor WhatsApp aktif, contoh: 081234567890')
    .build();
  qWA.setValidation(waRegex);

  const qDaerah = form.addTextItem().setTitle('Asal Daerah').setRequired(true);

  // BAGIAN 3 — Pesanan
  const sec3 = form.addPageBreakItem().setTitle('BAGIAN 3 — Pesanan');

  // 3.1 Grid Kaos Pendek
  const gridPendek = form.addGridItem();
  gridPendek.setTitle('Kaos Lengan Pendek Hitam (Rp 120.000)')
    .setRows(['S', 'M', 'L', 'XL', 'XXL'])
    .setColumns(['0', '1', '2', '3', '4', '5'])
    .setRequired(false);

  // 3.2 Grid Kaos Panjang
  const gridPanjang = form.addGridItem();
  gridPanjang.setTitle('Kaos Lengan Panjang Hitam (Rp 125.000)')
    .setRows(['Anak XS', 'Anak S', 'Anak M', 'Anak L', 'Anak XL', 'S', 'M', 'L', 'XL', 'XXL'])
    .setColumns(['0', '1', '2', '3', '4', '5'])
    .setRequired(false);

  // 3.3 Tumbler
  const dropTumbler = form.addListItem();
  dropTumbler.setTitle('Tumbler (Rp 85.000)')
    .setChoiceValues(['0', '1', '2', '3', '4', '5'])
    .setRequired(false);

  // 3.4 Korek
  const dropKorek = form.addListItem();
  dropKorek.setTitle('Korek (Rp 10.000)')
    .setChoiceValues(['0', '1', '2', '3', '4', '5', '10'])
    .setRequired(false);

  // 3.5 Keychain
  const dropKeychain = form.addListItem();
  dropKeychain.setTitle('Keychain (Rp 20.000)')
    .setChoiceValues(['0', '1', '2', '3', '4', '5', '10'])
    .setRequired(false);

  // BAGIAN 4 — Metode Pengambilan
  const sec4 = form.addPageBreakItem().setTitle('BAGIAN 4 — Metode Pengambilan');
  const qMetode = form.addMultipleChoiceItem().setTitle('Metode Pengambilan').setRequired(true);

  // BAGIAN 5 — Alamat Pengiriman
  const sec5 = form.addPageBreakItem().setTitle('BAGIAN 5 — Alamat Pengiriman');
  form.addTextItem().setTitle('Nama Penerima').setRequired(true);
  form.addTextItem().setTitle('No HP Penerima').setRequired(true);
  form.addTextItem().setTitle('Provinsi').setRequired(true);
  form.addTextItem().setTitle('Kota / Kabupaten').setRequired(true);
  form.addTextItem().setTitle('Kecamatan').setRequired(true);
  form.addParagraphTextItem().setTitle('Alamat Lengkap (Jalan, RT/RW, No. Rumah, Patokan)').setRequired(true);
  form.addTextItem().setTitle('Kode Pos').setRequired(true);

  // BAGIAN 6 — Penutup
  const sec6 = form.addPageBreakItem().setTitle('BAGIAN 6 — Penutup');
  form.addParagraphTextItem().setTitle('Catatan (opsional)').setRequired(false);

  // Set Navigasi Branching
  qMetode.setChoices([
    qMetode.createChoice('Kirim via Ekspedisi', FormApp.PageNavigationType.CONTINUE),
    qMetode.createChoice('Ambil di Lokasi', sec6)
  ]);
  sec5.setGoToPage(sec6);

  Logger.log('Form berhasil dibuat: ' + form.getEditUrl());

  // --------------------------------------------------------------------------
  // 2. MEMBUAT SPREADSHEET & TAB
  // --------------------------------------------------------------------------
  const ss = SpreadsheetApp.create('DB PO MERCH MQ 2026');
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId());
  
  // Hubungkan Form ke Spreadsheet
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  // Buat/Kelola 7 Tab Wajib
  const tabNames = ['Form Responses 1', 'MASTER_PRODUK', 'ORDERS', 'ORDER_LINES', 'REKAP_PRODUKSI', 'DASHBOARD', 'LOG_WA'];
  const sheets = {};

  // Rename sheet pertama ke Form Responses 1 jika belum
  const firstSheet = ss.getSheets()[0];
  firstSheet.setName('Form Responses 1');
  sheets['Form Responses 1'] = firstSheet;

  tabNames.slice(1).forEach(function(name) {
    let sh = ss.getSheetByName(name);
    if (!sh) {
      sh = ss.insertSheet(name);
    }
    sheets[name] = sh;
  });

  // --------------------------------------------------------------------------
  // 3. MENGISI TAB MASTER_PRODUK (DENGAN HEADER_FORM DITURUNKAN SECARA TERPROGRAM)
  // --------------------------------------------------------------------------
  const shProd = sheets['MASTER_PRODUK'];
  shProd.clear();
  
  const headerProd = ['SKU', 'Nama_Item', 'Ukuran', 'Harga', 'Header_Form', 'Aktif'];
  shProd.appendRow(headerProd);

  // Helper untuk mendapatkan Header_Form dari item FormApp
  const titleGridPendek  = gridPendek.getTitle();
  const titleGridPanjang = gridPanjang.getTitle();
  const titleTumbler     = dropTumbler.getTitle();
  const titleKorek       = dropKorek.getTitle();
  const titleKeychain    = dropKeychain.getTitle();

  const katalogData = [
    // SKU, Nama_Item, Ukuran, Harga, Header_Form, Aktif
    ['KP-S',   'Kaos Lengan Pendek',  'S',   120000, titleGridPendek + ' [S]',   'YA'],
    ['KP-M',   'Kaos Lengan Pendek',  'M',   120000, titleGridPendek + ' [M]',   'YA'],
    ['KP-L',   'Kaos Lengan Pendek',  'L',   120000, titleGridPendek + ' [L]',   'YA'],
    ['KP-XL',  'Kaos Lengan Pendek',  'XL',  120000, titleGridPendek + ' [XL]',  'YA'],
    ['KP-XXL', 'Kaos Lengan Pendek',  'XXL', 120000, titleGridPendek + ' [XXL]', 'YA'],
    ['KP-2XL', 'Kaos Lengan Pendek',  '2XL', 120000, titleGridPendek + ' [2XL]', 'YA'],
    ['KP-3XL', 'Kaos Lengan Pendek',  '3XL', 120000, titleGridPendek + ' [3XL]', 'YA'],
    ['KJ-AK-XS',  'Kaos Lengan Panjang', 'Anak XS',  85000, titleGridPanjang + ' [Anak XS]', 'YA'],
    ['KJ-AK-S',   'Kaos Lengan Panjang', 'Anak S',   85000, titleGridPanjang + ' [Anak S]',  'YA'],
    ['KJ-AK-M',   'Kaos Lengan Panjang', 'Anak M',   85000, titleGridPanjang + ' [Anak M]',  'YA'],
    ['KJ-AK-L',   'Kaos Lengan Panjang', 'Anak L',   85000, titleGridPanjang + ' [Anak L]',  'YA'],
    ['KJ-AK-XL',  'Kaos Lengan Panjang', 'Anak XL',  85000, titleGridPanjang + ' [Anak XL]', 'YA'],
    ['KJ-S',   'Kaos Lengan Panjang', 'S',   125000, titleGridPanjang + ' [S]',   'YA'],
    ['KJ-M',   'Kaos Lengan Panjang', 'M',   125000, titleGridPanjang + ' [M]',   'YA'],
    ['KJ-L',   'Kaos Lengan Panjang', 'L',   125000, titleGridPanjang + ' [L]',   'YA'],
    ['KJ-XL',  'Kaos Lengan Panjang', 'XL',  125000, titleGridPanjang + ' [XL]',  'YA'],
    ['KJ-XXL', 'Kaos Lengan Panjang', 'XXL', 125000, titleGridPanjang + ' [XXL]', 'YA'],
    ['KJ-2XL', 'Kaos Lengan Panjang', '2XL', 125000, titleGridPanjang + ' [2XL]', 'YA'],
    ['KJ-3XL', 'Kaos Lengan Panjang', '3XL', 125000, titleGridPanjang + ' [3XL]', 'YA'],
    ['TB-STD', 'Tumbler',            '—',   85000,  titleTumbler,                'YA'],
    ['KR-STD', 'Korek',              '—',   10000,  titleKorek,                  'YA'],
    ['KC-STD', 'Keychain',           '—',   20000,  titleKeychain,               'YA'],
    ['BD-KP-S',   'Paket Bundling (Kaos Pendek + Tumbler 750ml + Korek + Keychain + Goodie Bag)', 'S',   210000, 'Paket Bundling Pendek [S]',   'YA'],
    ['BD-KP-M',   'Paket Bundling (Kaos Pendek + Tumbler 750ml + Korek + Keychain + Goodie Bag)', 'M',   210000, 'Paket Bundling Pendek [M]',   'YA'],
    ['BD-KP-L',   'Paket Bundling (Kaos Pendek + Tumbler 750ml + Korek + Keychain + Goodie Bag)', 'L',   210000, 'Paket Bundling Pendek [L]',   'YA'],
    ['BD-KP-XL',  'Paket Bundling (Kaos Pendek + Tumbler 750ml + Korek + Keychain + Goodie Bag)', 'XL',  210000, 'Paket Bundling Pendek [XL]',  'YA'],
    ['BD-KP-XXL', 'Paket Bundling (Kaos Pendek + Tumbler 750ml + Korek + Keychain + Goodie Bag)', 'XXL', 210000, 'Paket Bundling Pendek [XXL]', 'YA'],
    ['BD-KP-2XL', 'Paket Bundling (Kaos Pendek + Tumbler 750ml + Korek + Keychain + Goodie Bag)', '2XL', 210000, 'Paket Bundling Pendek [2XL]', 'YA'],
    ['BD-KP-3XL', 'Paket Bundling (Kaos Pendek + Tumbler 750ml + Korek + Keychain + Goodie Bag)', '3XL', 210000, 'Paket Bundling Pendek [3XL]', 'YA'],
    ['BD-KJ-S',   'Paket Bundling (Kaos Panjang + Tumbler 750ml + Korek + Keychain + Goodie Bag)', 'S',   210000, 'Paket Bundling Panjang [S]',   'YA'],
    ['BD-KJ-M',   'Paket Bundling (Kaos Panjang + Tumbler 750ml + Korek + Keychain + Goodie Bag)', 'M',   210000, 'Paket Bundling Panjang [M]',   'YA'],
    ['BD-KJ-L',   'Paket Bundling (Kaos Panjang + Tumbler 750ml + Korek + Keychain + Goodie Bag)', 'L',   210000, 'Paket Bundling Panjang [L]',   'YA'],
    ['BD-KJ-XL',  'Paket Bundling (Kaos Panjang + Tumbler 750ml + Korek + Keychain + Goodie Bag)', 'XL',  210000, 'Paket Bundling Panjang [XL]',  'YA'],
    ['BD-KJ-XXL', 'Paket Bundling (Kaos Panjang + Tumbler 750ml + Korek + Keychain + Goodie Bag)', 'XXL', 210000, 'Paket Bundling Panjang [XXL]', 'YA'],
    ['BD-KJ-2XL', 'Paket Bundling (Kaos Panjang + Tumbler 750ml + Korek + Keychain + Goodie Bag)', '2XL', 210000, 'Paket Bundling Panjang [2XL]', 'YA'],
    ['BD-KJ-3XL', 'Paket Bundling (Kaos Panjang + Tumbler 750ml + Korek + Keychain + Goodie Bag)', '3XL', 210000, 'Paket Bundling Panjang [3XL]', 'YA']
  ];

  shProd.getRange(2, 1, katalogData.length, 6).setValues(katalogData);
  shProd.getRange(2, 4, katalogData.length, 1).setNumberFormat('Rp #,##0');

  // --------------------------------------------------------------------------
  // 4. MENGISI TAB ORDERS & ORDER_LINES
  // --------------------------------------------------------------------------
  const shOrd = sheets['ORDERS'];
  shOrd.clear();
  const headerOrd = [
    'Order_ID', 'Timestamp', 'Nama', 'WA_Input', 'WA_Normal', 'Asal_Daerah', 'Metode_Ambil',
    'Nama_Penerima', 'HP_Penerima', 'Provinsi', 'Kota', 'Kecamatan', 'Alamat', 'Kode_Pos',
    'Total_Qty', 'Subtotal', 'Ongkir', 'Kode_Unik', 'Total_Transfer', 'Status_Bayar',
    'Batas_Bayar', 'Tgl_Verifikasi', 'Status_Order', 'Catatan_Pembeli', 'Catatan_Admin', 'Row_Form'
  ];
  shOrd.appendRow(headerOrd);

  const shLines = sheets['ORDER_LINES'];
  shLines.clear();
  const headerLines = [
    'Line_ID', 'Order_ID', 'Timestamp', 'Nama', 'SKU', 'Nama_Item', 'Ukuran', 'Qty',
    'Harga_Satuan', 'Subtotal_Line', 'Status_Bayar', 'Status_Order'
  ];
  shLines.appendRow(headerLines);

  // Rumus ArrayFormula di K1 & L1 ORDER_LINES
  shLines.getRange('K1').setFormula('={"Status_Bayar"; ARRAYFORMULA(IF(B2:B="","",IFERROR(VLOOKUP(B2:B,ORDERS!$A:$T,20,FALSE),"")))}');
  shLines.getRange('L1').setFormula('={"Status_Order"; ARRAYFORMULA(IF(B2:B="","",IFERROR(VLOOKUP(B2:B,ORDERS!$A:$W,23,FALSE),"")))}');

  // --------------------------------------------------------------------------
  // 5. MENGISI TAB REKAP_PRODUKSI
  // --------------------------------------------------------------------------
  const shRekap = sheets['REKAP_PRODUKSI'];
  shRekap.clear();

  // Blok 1 — Matriks Kaos (Lunas)
  shRekap.getRange('A1:G1').setValues([['MODEL', 'S', 'M', 'L', 'XL', 'XXL', 'TOTAL']]);
  shRekap.getRange('A2:A3').setValues([['Kaos Lengan Pendek'], ['Kaos Lengan Panjang']]);

  for (let r = 2; r <= 3; r++) {
    const cols = ['B', 'C', 'D', 'E', 'F'];
    cols.forEach(function(col, i) {
      shRekap.getRange(col + r).setFormula(
        '=SUMIFS(ORDER_LINES!$H:$H, ORDER_LINES!$F:$F, $A' + r + ', ORDER_LINES!$G:$G, ' + col + '$1, ORDER_LINES!$L:$L, "VALID", ORDER_LINES!$K:$K, "LUNAS")'
      );
    });
    shRekap.getRange('G' + r).setFormula('=SUM(B' + r + ':F' + r + ')');
  }

  // Blok 2 — Non-Kaos (Lunas)
  shRekap.getRange('A5:B5').setValues([['ITEM NON-KAOS', 'TOTAL LUNAS']]);
  shRekap.getRange('A6:A8').setValues([['Tumbler'], ['Korek'], ['Keychain']]);
  for (let r = 6; r <= 8; r++) {
    shRekap.getRange('B' + r).setFormula(
      '=SUMIFS(ORDER_LINES!$H:$H, ORDER_LINES!$F:$F, $A' + r + ', ORDER_LINES!$L:$L, "VALID", ORDER_LINES!$K:$K, "LUNAS")'
    );
  }

  // Blok 3 — Proyeksi (Valid / Termasuk Unpaid)
  shRekap.getRange('A11:G11').setValues([['PROYEKSI (TERMASUK UNPAID)', 'S', 'M', 'L', 'XL', 'XXL', 'TOTAL']]);
  shRekap.getRange('A12:A13').setValues([['Kaos Lengan Pendek'], ['Kaos Lengan Panjang']]);

  for (let r = 12; r <= 13; r++) {
    const cols = ['B', 'C', 'D', 'E', 'F'];
    cols.forEach(function(col, i) {
      shRekap.getRange(col + r).setFormula(
        '=SUMIFS(ORDER_LINES!$H:$H, ORDER_LINES!$F:$F, $A' + r + ', ORDER_LINES!$G:$G, ' + col + '$11, ORDER_LINES!$L:$L, "VALID")'
      );
    });
    shRekap.getRange('G' + r).setFormula('=SUM(B' + r + ':F' + r + ')');
  }

  shRekap.getRange('A15:B15').setValues([['ITEM NON-KAOS', 'TOTAL PROYEKSI']]);
  shRekap.getRange('A16:A18').setValues([['Tumbler'], ['Korek'], ['Keychain']]);
  for (let r = 16; r <= 18; r++) {
    shRekap.getRange('B' + r).setFormula(
      '=SUMIFS(ORDER_LINES!$H:$H, ORDER_LINES!$F:$F, $A' + (r - 10) + ', ORDER_LINES!$L:$L, "VALID")'
    );
  }

  // --------------------------------------------------------------------------
  // 6. MENGISI TAB DASHBOARD & LOG_WA
  // --------------------------------------------------------------------------
  const shDash = sheets['DASHBOARD'];
  shDash.clear();

  const metrics = [
    ['METRIK', 'NILAI'],
    ['Total Order Masuk', '=COUNTA(ORDERS!A2:A)'],
    ['Order VALID', '=COUNTIF(ORDERS!W:W,"VALID")'],
    ['Sudah LUNAS', '=COUNTIFS(ORDERS!T:T,"LUNAS",ORDERS!W:W,"VALID")'],
    ['Menunggu Verifikasi', '=COUNTIFS(ORDERS!T:T,"MENUNGGU_VERIFIKASI",ORDERS!W:W,"VALID")'],
    ['Belum Bayar', '=COUNTIFS(ORDERS!T:T,"BELUM_BAYAR",ORDERS!W:W,"VALID")'],
    ['Expired', '=COUNTIF(ORDERS!T:T,"EXPIRED")'],
    ['Omzet Terkonfirmasi', '=SUMIFS(ORDERS!S:S,ORDERS!T:T,"LUNAS",ORDERS!W:W,"VALID")'],
    ['Potensi Omzet', '=SUMIFS(ORDERS!S:S,ORDERS!W:W,"VALID")'],
    ['Total Pcs (Lunas)', '=SUMIFS(ORDER_LINES!H:H,ORDER_LINES!K:K,"LUNAS",ORDER_LINES!L:L,"VALID")'],
    ['Order Kirim', '=COUNTIFS(ORDERS!G:G,"KIRIM",ORDERS!W:W,"VALID")'],
    ['Order Ambil di Lokasi', '=COUNTIFS(ORDERS!G:G,"AMBIL",ORDERS!W:W,"VALID")']
  ];

  shDash.getRange(1, 1, metrics.length, 2).setValues(metrics);
  shDash.getRange('B9:B10').setNumberFormat('Rp #,##0');

  // Tabel Rekap Daerah di Dashboard
  shDash.getRange('A15').setFormula(
    '=QUERY(ORDERS!A2:W, "SELECT F, COUNT(A), SUM(O) WHERE W=\'VALID\' AND T=\'LUNAS\' GROUP BY F ORDER BY COUNT(A) DESC LABEL F \'Daerah\', COUNT(A) \'Jml Order\', SUM(O) \'Total Pcs\'", 0)'
  );

  // LOG_WA Header
  const shLog = sheets['LOG_WA'];
  shLog.clear();
  shLog.appendRow(['Waktu', 'Order_ID', 'Target', 'Jenis', 'Status', 'Respons_API']);

  // --------------------------------------------------------------------------
  // 7. FORMATTING SPREADSHEET
  // --------------------------------------------------------------------------
  Object.keys(sheets).forEach(function(key) {
    const sh = sheets[key];
    sh.setFrozenRows(1);
  });

  // Protect range MASTER_PRODUK dan REKAP_PRODUKSI
  const protProd = shProd.protect().setDescription('Katalog Produk — Jangan Ubah Header');
  const protRekap = shRekap.protect().setDescription('Rumus Rekap Produksi');
  
  // Set user sebagai satu-satunya editor jika didukung
  const me = Session.getEffectiveUser();
  protProd.addEditor(me);
  protRekap.addEditor(me);

  // --------------------------------------------------------------------------
  // LOG OUTPUT URL
  // --------------------------------------------------------------------------
  Logger.log('\n==================================================');
  Logger.log('✅ BOOTSTRAP SUKSES SELESAI!');
  Logger.log('==================================================');
  Logger.log('📌 GOOGLE FORM (Edit URL)      : ' + form.getEditUrl());
  Logger.log('📌 GOOGLE FORM (Public URL)    : ' + form.getPublishedUrl());
  Logger.log('📌 SPREADSHEET (DB PO MERCH)   : ' + ss.getUrl());
  Logger.log('==================================================\n');
}
