/*************************************************************
 * SISTEM PO MERCH MQ 2026 — LOGIKA OPERASIONAL (Code.gs)
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
    FONNTE_TOKEN   : 'GCASAboTL7iPJj3NpQkj',
    ADMIN_WA       : '6283199861947',
    NOTIF_REKAP_WA : '6283830463179,6281358385254',
    CS_WA          : '0895330478397',
    NAMA_BANK      : 'BCA',
    NOMOR_REKENING : '7710399993',
    ATAS_NAMA      : 'Abidatul Faricha Ch',
    BATAS_JAM      : '24',
    PAKAI_KODE_UNIK: 'TIDAK',
    ORDER_COUNTER  : '0',
    NOTIF_ADMIN    : 'YA'
  });
  alertOrLog_('Konfigurasi tersimpan. Ganti nilainya di Project Settings → Script Properties.');
}

function alertOrLog_(pesan) {
  try {
    SpreadsheetApp.getActive().toast(pesan, 'MERCH MQ', 5);
  } catch (e) {}
  Logger.log('INFO: ' + pesan);
}

function P_(k, def) {
  const v = PropertiesService.getScriptProperties().getProperty(k);
  return (v === null || v === '') ? (def || '') : v;
}

// ====== MENU ADMIN ======
function onOpen() {
  try {
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
  } catch (e) {
    Logger.log('INFO: onOpen UI skipped in standalone context');
  }
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
    const data = shOrders.getRange(2, 18, last - 1, 3).getValues(); // R:T (R=Kode_Unik, S=Total_Transfer, T=Status_Bayar)
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

function getSS_() {
  const active = SpreadsheetApp.getActive();
  if (active) return active;
  const id = P_('SPREADSHEET_ID', '1MKSkGoOuGqG8NVKm3Ubs3o_LwJQ0vcqCxJLbJHJpak8');
  if (id) return SpreadsheetApp.openById(id);
  throw new Error('SPREADSHEET_ID tidak terkonfigurasi');
}

function getRealLastRow_(sheet, colIndex) {
  const col = colIndex || 1;
  const last = Math.max(sheet.getLastRow(), 100);
  const values = sheet.getRange(1, col, last, 1).getValues();
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i][0] !== null && String(values[i][0]).trim() !== '') return i + 1;
  }
  return 1;
}

function logWA_(orderId, target, jenis, status, info) {
  const sh = getSS_().getSheetByName(SH.LOG);
  if (!sh) return;
  sh.appendRow([new Date(), orderId || '', target || '', jenis || '', status, String(info).slice(0, 500)]);
}

// ====== HANDLER WEB APP (DOPOST) ======

function doPost(e) {
  const lock = LockService.getScriptLock();
  try { lock.waitLock(30000); } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Server sibuk, coba beberapa saat lagi' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  try {
    const ss     = getSS_();
    const shProd = ss.getSheetByName(SH.PRODUK);
    const shOrd  = ss.getSheetByName(SH.ORDERS);
    const shLine = ss.getSheetByName(SH.LINES);

    let postData = {};
    try {
      postData = JSON.parse(e.postData.contents);
    } catch (err) {
      postData = e.parameter || {};
    }

    const timestamp = new Date();
    const nama      = String(postData.nama || '').trim();
    const waInput   = String(postData.waInput || '').trim();
    const waNormal  = normalisasiWA_(waInput);
    const daerah    = String(postData.daerah || '').trim();
    const metodeRaw = String(postData.metode || 'KIRIM');
    const metode    = metodeRaw.toUpperCase().indexOf('AMBIL') >= 0 ? 'AMBIL' : 'KIRIM';
    const catatan   = String(postData.catatan || '').trim();

    // Baca MASTER_PRODUK
    const prod = shProd.getRange(2, 1, Math.max(shProd.getLastRow() - 1, 1), 6).getValues();
    const prodMap = {};
    prod.forEach(function(p) { prodMap[String(p[0]).trim()] = p; });

    const lines = [];
    let totalQty = 0, subtotal = 0;

    (postData.items || []).forEach(function(it) {
      let p = prodMap[it.sku];
      if (!p && it.sku && it.sku.indexOf('BD-') === 0) {
        const isKP = it.sku.indexOf('BD-KP') === 0;
        const size = it.sku.replace(/^BD-K[PJ]-/, '');
        p = [it.sku, 'Paket Bundling (' + (isKP ? 'Kaos Pendek' : 'Kaos Panjang') + ' + Tumbler 750ml + Korek + Keychain + Goodie Bag)', size, 200000, '', 'YA'];
      }
      if (!p || String(p[5]).toUpperCase() !== 'YA') return;
      const qty = parseInt(it.qty, 10);
      if (!qty || qty <= 0) return;

      const namaItem = String(p[1]).trim();
      const ukuran   = String(p[2]).trim();
      const harga    = Number(p[3]) || 0;
      const sub      = qty * harga;

      lines.push({ sku: it.sku, nama: namaItem, ukuran: ukuran, qty: qty, harga: harga, sub: sub });
      totalQty += qty;
      subtotal += sub;
    });

    if (lines.length === 0) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Pesanan kosong. Silakan pilih minimal 1 item.' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Buat order
    const orderId  = generateOrderId_();
    const kodeUnik = kodeUnikBaru_(shOrd);
    const totalTf  = subtotal + kodeUnik;
    const batas    = new Date(timestamp.getTime() + parseInt(P_('BATAS_JAM', '24'), 10) * 3600 * 1000);

    // Tulis ke ORDERS
    shOrd.appendRow([
      orderId, timestamp, nama, waInput, waNormal, daerah, metode,
      metode === 'KIRIM' ? String(postData.penerima || '')  : '',
      metode === 'KIRIM' ? String(postData.hpPenerima || '') : '',
      metode === 'KIRIM' ? String(postData.provinsi || '')   : '',
      metode === 'KIRIM' ? String(postData.kota || '')       : '',
      metode === 'KIRIM' ? String(postData.kecamatan || '')  : '',
      metode === 'KIRIM' ? String(postData.alamat || '')     : '',
      metode === 'KIRIM' ? String(postData.kodePos || '')    : '',
      totalQty, subtotal, 0, kodeUnik, totalTf,
      'BELUM_BAYAR', batas, '', 'VALID', catatan, '', 'WEB'
    ]);

    // Tulis ke ORDER_LINES
    const barisLine = lines.map(function(l, i) {
      return [
        orderId + '-L' + (i + 1), orderId, timestamp, nama,
        l.sku, l.nama, l.ukuran, l.qty, l.harga, l.sub
      ];
    });
    const nextLineRow = getRealLastRow_(shLine, 1) + 1;
    shLine.getRange(nextLineRow, 1, barisLine.length, 10).setValues(barisLine);

    // Kirim WA
    const pesan = pesanOrderMasuk_({
      orderId: orderId, nama: nama, lines: lines, totalQty: totalQty,
      subtotal: subtotal, kodeUnik: kodeUnik, totalTf: totalTf,
      metode: metode, batas: batas
    });
    kirimWA_(waNormal, pesan, orderId, 'ORDER_MASUK');

    if (P_('NOTIF_ADMIN', 'YA') === 'YA') {
      const adm = '🔔 ORDER BARU (WEB)\n\n' + orderId + '\n' + nama + ' — ' + daerah +
                  '\n' + totalQty + ' pcs • ' + rupiah_(totalTf) +
                  '\n' + (metode === 'KIRIM' ? 'Kirim ke ' + String(postData.kota || '') : 'Ambil di lokasi');
      kirimWA_(P_('NOTIF_REKAP_WA', '6283830463179,6281358385254'), adm, orderId, 'ADMIN');
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      orderId: orderId,
      totalTf: totalTf,
      kodeUnik: kodeUnik,
      message: 'Pesanan berhasil dibuat!'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
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
    const ss     = getSS_();
    const shResp = ss.getSheetByName(SH.RESP);
    const shProd = ss.getSheetByName(SH.PRODUK);
    const shOrd  = ss.getSheetByName(SH.ORDERS);
    const shLine = ss.getSheetByName(SH.LINES);

    // --- cegah proses ganda ---
    const lastOrd = shOrd.getLastRow();
    if (lastOrd > 1) {
      const rowsForm = shOrd.getRange(2, 26, lastOrd - 1, 1).getValues(); // kolom Z: Row_Form
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
    const daerah    = String(get('Asal Daerah') || get('Asal Daerah / Kelompok')).trim();
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
    const nextLineRow = getRealLastRow_(shLine, 1) + 1;
    shLine.getRange(nextLineRow, 1, barisLine.length, 10).setValues(barisLine);

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
      kirimWA_(P_('NOTIF_REKAP_WA', '6283830463179,6281358385254'), adm, orderId, 'ADMIN');
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
  t += '\nSetelah transfer, *kirim bukti ke chat CS ini (' + P_('CS_WA', '0895330478397') + ')* untuk konfirmasi pengiriman & informasi lanjutan.\n';
  t += '\nPengambilan: ' + (o.metode === 'KIRIM' ? 'Dikirim via ekspedisi (detail resi & estimasi dikonfirmasi via CS WA)' : 'Ambil di lokasi (jadwal penyerahan dikonfirmasi via CS WA)') + '\n';
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
  const currentStatus = String(a.sh.getRange(a.row, 20).getValue()).toUpperCase();
  if (currentStatus === 'EXPIRED' || currentStatus === 'BATAL') {
    try {
      const ui = SpreadsheetApp.getUi();
      if (ui.alert('⚠️ PERINGATAN', 'Order ini berstatus ' + currentStatus + '. Yakin ingin mengubahnya menjadi LUNAS?', ui.ButtonSet.YES_NO) !== ui.Button.YES) {
        return;
      }
    } catch (e) {}
  }

  a.sh.getRange(a.row, 20).setValue('LUNAS');      // T: Status_Bayar
  a.sh.getRange(a.row, 22).setValue(new Date());   // V: Tgl_Verifikasi
  const d = a.sh.getRange(a.row, 1, 1, 26).getValues()[0];
  const pesan = '*PEMBAYARAN TERVERIFIKASI* ✅\n\nOrder ' + d[0] + '\na.n. ' + d[2] +
                '\n' + d[14] + ' pcs • ' + rupiah_(d[18]) +
                '\n\nPesananmu telah masuk daftar produksi. Untuk informasi kelanjutan pengiriman & resi, silakan hubungi CS WA (' + P_('CS_WA', '0895330478397') + ').\n\nTerima kasih 🙏';
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
  try {
    const ui = SpreadsheetApp.getUi();
    if (ui.alert('Batalkan order ini?', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  } catch (e) {}

  a.sh.getRange(a.row, 20).setValue('BATAL');      // T: Status_Bayar
  a.sh.getRange(a.row, 23).setValue('BATAL');      // W: Status_Order
  SpreadsheetApp.getActive().toast('Order dibatalkan (Status Bayar & Order → BATAL).');
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
  const sh = getSS_().getSheetByName(SH.LOG);
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
  alertOrLog_('Berhasil kirim ulang: ' + n);
}

function tesFonnte() {
  const ok = kirimWA_(P_('ADMIN_WA'), '🧪 Tes koneksi Fonnte — ' +
    Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy HH:mm') + ' WIB', 'TES', 'TES');
  alertOrLog_(ok
    ? 'Berhasil. Cek WhatsApp admin.'
    : 'GAGAL. Buka tab LOG_WA, baca kolom Respons_API.');
}

// ====== TRIGGER TERJADWAL ======

/** Jalan tiap jam: hanguskan order lewat batas, kirim reminder H-3 jam */
function cekExpired() {
  const sh = getSS_().getSheetByName(SH.ORDERS);
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

/** Broadcast rekap penjualan tiap 12 jam ke akun utama (083830463179) */
function notifRekap12Jam() {
  const ss = getSS_();
  const shOrd = ss.getSheetByName(SH.ORDERS);
  if (!shOrd || shOrd.getLastRow() < 2) return;

  const last = shOrd.getLastRow();
  const data = shOrd.getRange(2, 1, last - 1, 26).getValues();

  let totalOrder = 0, lunasCount = 0, pendingCount = 0, totalPcs = 0, totalOmzet = 0;

  data.forEach(function(d) {
    if (d[22] === 'VALID') { // W: Status_Order
      totalOrder++;
      if (d[19] === 'LUNAS') { // T: Status_Bayar
        lunasCount++;
        totalOmzet += (Number(d[18]) || 0); // S: Total_Transfer
        totalPcs += (Number(d[14]) || 0);   // O: Total_Qty
      } else if (d[19] === 'BELUM_BAYAR' || d[19] === 'MENUNGGU_VERIFIKASI') {
        pendingCount++;
      }
    }
  });

  const target = P_('NOTIF_REKAP_WA', '6283830463179,6281358385254');
  const pesan = '📊 *UPDATE PENJUALAN MERCH MQ (12 JAM)*\n\n' +
                '• Total Order Valid: ' + totalOrder + '\n' +
                '• Lunas: ' + lunasCount + ' order (' + totalPcs + ' pcs)\n' +
                '• Belum Lunas: ' + pendingCount + ' order\n' +
                '• Omzet Lunas: ' + rupiah_(totalOmzet) + '\n\n' +
                'Waktu update: ' + Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy HH:mm') + ' WIB';

  kirimWA_(target, pesan, 'REKAP_12H', 'ADMIN');
}

/** Health check harian — memastikan device WA masih tersambung */
function healthCheck() {
  kirimWA_(P_('ADMIN_WA', '6283199861947'),
    '☀️ Sistem PO Merch MQ aktif.\nSisa hari PO: ' +
    Math.max(0, Math.ceil((new Date(2026, 7, 27) - new Date()) / 86400000)) + ' hari.',
    'HEALTH', 'TES');
}

/** Trigger installable saat admin mengetik LUNAS / centang Checkbox di Spreadsheet */
function onEditTrigger(e) {
  if (!e || !e.range) return;
  const sh = e.range.getSheet();
  if (sh.getName() !== SH.ORDERS) return;

  const col = e.range.getColumn();
  const row = e.range.getRow();
  if (row < 2) return;

  const val = String(e.value).trim().toUpperCase();

  // Jika Kolom T (Status_Bayar) diubah
  if (col === 20) {
    if (val === 'LUNAS' || val === 'TRUE' || val === 'YA') {
      sh.getRange(row, 20).setValue('LUNAS');
      sh.getRange(row, 22).setValue(new Date()); // V: Tgl_Verifikasi

      const d = sh.getRange(row, 1, 1, 26).getValues()[0];
      const waSent = String(sh.getRange(row, 25).getValue()); // Y: Catatan_Admin

      if (waSent !== 'NOTIF_LUNAS_TERKIRIM') {
        const pesan = '*PEMBAYARAN TERVERIFIKASI* ✅\n\nOrder ' + d[0] + '\na.n. ' + d[2] +
                      '\n' + d[14] + ' pcs • ' + rupiah_(d[18]) +
                      '\n\nPesananmu telah masuk daftar produksi. Untuk informasi kelanjutan pengiriman & resi, silakan hubungi CS WA (' + P_('CS_WA', '0895330478397') + ').\n\nTerima kasih 🙏';
        if (kirimWA_(d[4], pesan, d[0], 'LUNAS')) {
          sh.getRange(row, 25).setValue('NOTIF_LUNAS_TERKIRIM');
        }
      }
    } else if (val === 'BATAL') {
      sh.getRange(row, 20).setValue('BATAL');
      sh.getRange(row, 23).setValue('BATAL');
    } else if (val === 'EXPIRED') {
      sh.getRange(row, 20).setValue('EXPIRED');
    } else if (val.indexOf('MENUNGGU') >= 0) {
      sh.getRange(row, 20).setValue('MENUNGGU_VERIFIKASI');
    } else if (val.indexOf('BELUM') >= 0) {
      sh.getRange(row, 20).setValue('BELUM_BAYAR');
    }
  }
}

/** Pasang semua trigger. Jalankan sekali. */
function pasangTrigger() {
  const ss = getSS_();
  ScriptApp.getProjectTriggers().forEach(function(t) { ScriptApp.deleteTrigger(t); });

  ScriptApp.newTrigger('onOpen').forSpreadsheet(ss).onOpen().create();
  ScriptApp.newTrigger('onFormSubmit').forSpreadsheet(ss).onFormSubmit().create();
  ScriptApp.newTrigger('onEditTrigger').forSpreadsheet(ss).onEdit().create();
  ScriptApp.newTrigger('cekExpired').timeBased().everyHours(1).create();
  ScriptApp.newTrigger('notifRekap12Jam').timeBased().everyHours(12).create();
  ScriptApp.newTrigger('healthCheck').timeBased().atHour(8).everyDays(1).inTimezone(TZ).create();

  alertOrLog_('6 trigger terpasang:\n• onOpen (Menu Admin)\n• onFormSubmit\n• onEdit (auto WA saat LUNAS)\n• cekExpired (tiap jam)\n• notifRekap12Jam (tiap 12 jam)\n• healthCheck (tiap 08:00)');
}
