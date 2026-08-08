/*************************************************************
 * SISTEM PO MERCH MQ 2026 — UNIT & E2E TESTS (tests.gs)
 * Menjalankan skenario pengujian 1-7 dari §7 Spec
 *************************************************************/

/**
 * Reset seluruh data uji di ORDERS, ORDER_LINES, LOG_WA
 * dan mengembalikan ORDER_COUNTER ke 0
 */
function resetDataUji() {
  const ss = getSS_();
  
  // Kosongkan ORDERS (sisakan header)
  const shOrd = ss.getSheetByName(SH.ORDERS);
  if (shOrd) {
    const lastRealOrd = getRealLastRow_(shOrd, 1);
    if (lastRealOrd > 1) {
      shOrd.getRange(2, 1, lastRealOrd - 1, shOrd.getLastColumn()).clearContent();
    }
  }

  // Kosongkan ORDER_LINES (sisakan header & rumus K1:L1)
  const shLine = ss.getSheetByName(SH.LINES);
  if (shLine) {
    const lastRealLine = getRealLastRow_(shLine, 1);
    if (lastRealLine > 1) {
      shLine.getRange(2, 1, lastRealLine - 1, 10).clearContent();
    }
  }

  // Kosongkan LOG_WA (sisakan header)
  const shLog = ss.getSheetByName(SH.LOG);
  if (shLog) {
    const lastRealLog = getRealLastRow_(shLog, 1);
    if (lastRealLog > 1) {
      shLog.getRange(2, 1, lastRealLog - 1, shLog.getLastColumn()).clearContent();
    }
  }

  // Reset counter
  PropertiesService.getScriptProperties().setProperty('ORDER_COUNTER', '0');

  alertOrLog_('🧹 Data uji berhasil direset! Counter order kembali ke 0.');
}

/**
 * Helper menyuntikkan baris simulasi ke Form Responses 1
 */
function suntikFormResponse_(dataObj) {
  const ss = SpreadsheetApp.getActive();
  const shResp = ss.getSheetByName(SH.RESP);
  const H = headerMap_(shResp);
  
  const lastCol = shResp.getLastColumn();
  const row = new Array(lastCol).fill('');

  // Isikan data sesuai header
  Object.keys(dataObj).forEach(function(key) {
    if (H[key] !== undefined) {
      row[H[key]] = dataObj[key];
    }
  });

  shResp.appendRow(row);
  return shResp.getLastRow();
}

/**
 * SKENARIO 1: Multi-varian
 * 1 Kaos Lengan Pendek M, 1 Kaos Lengan Pendek XL, 1 Kaos Lengan Panjang L, 1 Tumbler
 */
function testSkenario1_MultiVarian() {
  Logger.log('\n--- Running Skenario 1: Multi-Varian ---');
  resetDataUji();

  const shProd = SpreadsheetApp.getActive().getSheetByName(SH.PRODUK);
  const mapHeader = {};
  shProd.getRange(2, 1, shProd.getLastRow() - 1, 6).getValues().forEach(function(r) {
    mapHeader[r[0]] = r[4]; // SKU -> Header_Form
  });

  const payload = {
    'Timestamp': new Date(),
    'Nama Lengkap': 'Budi Santoso',
    'Nomor WhatsApp Aktif': '081234567890',
    'Asal Daerah': 'Jakarta Selatan',
    'Metode Pengambilan': 'Kirim via Ekspedisi',
    'Nama Penerima': 'Budi Santoso',
    'No HP Penerima': '081234567890',
    'Provinsi': 'DKI Jakarta',
    'Kota / Kabupaten': 'Jakarta Selatan',
    'Kecamatan': 'Kebayoran Baru',
    'Alamat Lengkap (Jalan, RT/RW, No. Rumah, Patokan)': 'Jl. Sudirman No. 123',
    'Kode Pos': '12190',
    'Catatan (opsional)': 'Tolong dipacking kayu'
  };

  payload[mapHeader['KP-M']] = '1';
  payload[mapHeader['KP-XL']] = '1';
  payload[mapHeader['KJ-L']] = '1';
  payload[mapHeader['TB-STD']] = '1';

  const rowNum = suntikFormResponse_(payload);
  prosesBaris_(rowNum);

  // Verifikasi
  const shOrd = SpreadsheetApp.getActive().getSheetByName(SH.ORDERS);
  const shLine = SpreadsheetApp.getActive().getSheetByName(SH.LINES);

  const ordRows = getRealLastRow_(shOrd, 1) - 1;
  const lineRows = getRealLastRow_(shLine, 1) - 1;

  Logger.log('Hasil Skenario 1:');
  Logger.log('- Baris ORDERS      : ' + ordRows + ' (Ekspektasi: 1)');
  Logger.log('- Baris ORDER_LINES : ' + lineRows + ' (Ekspektasi: 4)');

  if (ordRows === 1 && lineRows === 4) {
    Logger.log('✅ SKENARIO 1 LULUS!');
  } else {
    Logger.log('❌ SKENARIO 1 GAGAL!');
  }
}

/**
 * SKENARIO 6: Expired Handling
 */
function testSkenario6_Expired() {
  Logger.log('\n--- Running Skenario 6: Expired ---');
  testSkenario1_MultiVarian(); // Pakai data dari skenario 1

  const shOrd = SpreadsheetApp.getActive().getSheetByName(SH.ORDERS);
  // Set Batas_Bayar (Kolom U / Col 21) ke masa lalu (2 jam yang lalu)
  const pastDate = new Date(new Date().getTime() - 2 * 3600 * 1000);
  shOrd.getRange(2, 21).setValue(pastDate);

  // Jalankan cekExpired
  cekExpired();

  // Verifikasi Status_Bayar (Kolom T / Col 20)
  const statusBayar = shOrd.getRange(2, 20).getValue();
  Logger.log('Hasil Skenario 6:');
  Logger.log('- Status_Bayar : ' + statusBayar + ' (Ekspektasi: EXPIRED)');

  if (statusBayar === 'EXPIRED') {
    Logger.log('✅ SKENARIO 6 LULUS!');
  } else {
    Logger.log('❌ SKENARIO 6 GAGAL!');
  }
}

/**
 * Simulasi Pengiriman Order Langsung dari Web Store
 * Menguji bahwa 1 Order di ORDERS akan menghasilkan 3 baris rincian di ORDER_LINES
 */
function tesSimulasiWebStore() {
  Logger.log('\n--- Running Simulasi Web Store ---');
  
  const mockWebPayload = {
    postData: {
      contents: JSON.stringify({
        nama: 'Ahmad Fauzi (Tes Web)',
        waInput: '081234567890',
        daerah: 'Surabaya',
        metode: 'KIRIM',
        penerima: 'Ahmad Fauzi',
        hpPenerima: '081234567890',
        provinsi: 'Jawa Timur',
        kota: 'Surabaya',
        kecamatan: 'Gubeng',
        alamat: 'Jl. Pemuda No. 45',
        kodePos: '60271',
        catatan: 'Simulasi Order dari Web Store',
        items: [
          { sku: 'KP-M', qty: 2 },  // 2 Kaos Pendek M
          { sku: 'KJ-XL', qty: 1 }, // 1 Kaos Panjang XL
          { sku: 'TB-STD', qty: 1 } // 1 Tumbler
        ]
      })
    }
  };

  const response = doPost(mockWebPayload);
  Logger.log('Respons Web Store: ' + response.getContent());

  alertOrLog_('🧪 Simulasi Web Store Selesai!\nCek tab ORDERS (1 baris baru) dan tab ORDER_LINES (3 baris rincian baru).');
}

/**
 * Jalankan Seluruh Skenario Pengujian
 */
function jalankanSemuaPengujian() {
  testSkenario1_MultiVarian();
  testSkenario6_Expired();
  simulasiMultiPersonaDanDaerah();
  alertOrLog_('Pengujian selesai. Cek Apps Script Execution Logs.');
}

/**
 * SIMULASI G-STACK: Multi-Persona & Geografis Berbeda (Papua, Aceh, Bali, Kalimantan, Sulawesi)
 * Menguji daya tahan sistem terhadap berbagai variasi format nomor HP, pesanan borongan vs eceran,
 * serta metode pengiriman (Ekspedisi vs Ambil di Lokasi).
 */
function simulasiMultiPersonaDanDaerah() {
  Logger.log('\n=======================================================');
  Logger.log('🚀 SIMULASI G-STACK: MULTI-PERSONA & DAERAH BERBEDA');
  Logger.log('=======================================================\n');

  const daftarPersona = [
    {
      deskripsi: '1. Tokoh Adat / Pembeli Jumlah Besar (Jayapura, Papua)',
      payload: {
        nama: 'Yohanes Wenda',
        waInput: '081298765432',
        daerah: 'Jayapura - Papua',
        metode: 'KIRIM',
        penerima: 'Yohanes Wenda',
        hpPenerima: '081298765432',
        provinsi: 'Papua',
        kota: 'Kota Jayapura',
        kecamatan: 'Abepura',
        alamat: 'Jl. Raya Abepura No. 88, Distrik Abepura',
        kodePos: '99351',
        catatan: 'Mohon dipacking kayu / bubble wrap tebal untuk pengiriman ke Papua.',
        items: [
          { sku: 'KP-L', qty: 5 },   // 5 Kaos Pendek L
          { sku: 'KJ-XXL', qty: 5 }, // 5 Kaos Panjang XXL
          { sku: 'TB-STD', qty: 3 }  // 3 Tumbler
        ]
      }
    },
    {
      deskripsi: '2. Jamaah / Pengajian (Banda Aceh, Aceh) — Format WA +62',
      payload: {
        nama: 'Cut Teuku Aris',
        waInput: '+62 852-1122-3344',
        daerah: 'Banda Aceh - Aceh',
        metode: 'KIRIM',
        penerima: 'Cut Teuku Aris',
        hpPenerima: '085211223344',
        provinsi: 'Aceh',
        kota: 'Banda Aceh',
        kecamatan: 'Syiah Kuala',
        alamat: 'Jl. T. Nyak Arief No. 14, Kopelma Darussalam',
        kodePos: '23111',
        catatan: 'Tolong konfirmasi resi ekspedisi via WA jika sudah dikirim.',
        items: [
          { sku: 'KJ-M', qty: 2 },  // 2 Kaos Panjang M
          { sku: 'KJ-L', qty: 2 }   // 2 Kaos Panjang L
        ]
      }
    },
    {
      deskripsi: '3. Mahasiswa / Kolektor (Denpasar, Bali) — Format WA 8xxx tanpa 0',
      payload: {
        nama: 'I Gusti Ngurah Made Wira',
        waInput: '89512345678',
        daerah: 'Denpasar - Bali',
        metode: 'KIRIM',
        penerima: 'I Gusti Ngurah Made Wira',
        hpPenerima: '089512345678',
        provinsi: 'Bali',
        kota: 'Denpasar',
        kecamatan: 'Denpasar Barat',
        alamat: 'Jl. Teuku Umar No. 200, Dauh Puri Kauh',
        kodePos: '80113',
        catatan: 'Kirim saat jam kerja kantor ya kak.',
        items: [
          { sku: 'KP-S', qty: 1 },
          { sku: 'KR-STD', qty: 2 },
          { sku: 'KC-STD', qty: 2 }
        ]
      }
    },
    {
      deskripsi: '4. Ambil di Lokasi (Pontianak, Kalimantan Barat)',
      payload: {
        nama: 'Siti Nurhaliza',
        waInput: '081377889900',
        daerah: 'Pontianak - Kalimantan Barat',
        metode: 'AMBIL',
        catatan: 'Nanti diambil langsung saat booth PO dibuka.',
        items: [
          { sku: 'KP-M', qty: 1 },
          { sku: 'TB-STD', qty: 1 }
        ]
      }
    },
    {
      deskripsi: '5. Pengusaha Muda (Makassar, Sulawesi Selatan)',
      payload: {
        nama: 'Daeng Andi Sultan',
        waInput: '628114455667',
        daerah: 'Makassar - Sulawesi Selatan',
        metode: 'KIRIM',
        penerima: 'Daeng Andi Sultan',
        hpPenerima: '08114455667',
        provinsi: 'Sulawesi Selatan',
        kota: 'Makassar',
        kecamatan: 'Panakkukang',
        alamat: 'Jl. AP Pettarani No. 55, Tamamaung',
        kodePos: '90231',
        catatan: 'Mantap merchandise-nya, diprioritaskan ya admin!',
        items: [
          { sku: 'KP-XL', qty: 3 },
          { sku: 'KJ-XL', qty: 2 },
          { sku: 'TB-STD', qty: 1 },
          { sku: 'KR-STD', qty: 1 }
        ]
      }
    },
    {
      deskripsi: '6. Pembeli Paket Bundling Hemat (Surabaya, Jawa Timur)',
      payload: {
        nama: 'Rahmat Hidayat',
        waInput: '081233445566',
        daerah: 'Surabaya - Jawa Timur',
        metode: 'KIRIM',
        penerima: 'Rahmat Hidayat',
        hpPenerima: '081233445566',
        provinsi: 'Jawa Timur',
        kota: 'Surabaya',
        kecamatan: 'Tegalsari',
        alamat: 'Jl. Basuki Rahmat No. 12',
        kodePos: '60261',
        catatan: 'Paket bundling hemat 200rb.',
        items: [
          { sku: 'BD-KP-L', qty: 1 } // 1 Paket Bundling Kaos Pendek L (Rp 200.000)
        ]
      }
    }
  ];

  let totalBerhasil = 0;

  daftarPersona.forEach(function(item, idx) {
    Logger.log('\n--- [' + (idx + 1) + '/' + daftarPersona.length + '] ' + item.deskripsi + ' ---');
    
    const eMock = {
      postData: {
        contents: JSON.stringify(item.payload)
      }
    };

    try {
      const response = doPost(eMock);
      const resData = JSON.parse(response.getContent());

      if (resData.status === 'success') {
        totalBerhasil++;
        Logger.log('✅ SUKSES | Order ID: ' + resData.orderId + ' | Total: Rp ' + Number(resData.totalTf).toLocaleString('id-ID'));
      } else {
        Logger.log('❌ GAGAL  | Message: ' + resData.message);
      }
    } catch (err) {
      Logger.log('💥 ERROR EXCEPTION: ' + err.message);
    }
  });

  Logger.log('\n=======================================================');
  Logger.log('📊 HASIL SIMULASI: ' + totalBerhasil + '/' + daftarPersona.length + ' ORDER BERHASIL DIBUAT!');
  Logger.log('=======================================================\n');
}

