/**
 * functions/repositories/mockRepository.js
 *
 * Implementasi repository SEMENTARA (in-memory), dipakai selama development
 * sebelum GoogleSheetsRepository yang sesungguhnya dipasang.
 *
 * PRD section 63: backend sebaiknya punya abstraction repositories/*.
 * Endpoint di functions/api/*.js hanya bicara ke interface ini — begitu
 * googleSheetsRepository.js siap, tinggal ganti satu baris import di setiap
 * endpoint. Kontrak /api/... TIDAK berubah (PRD section 4 & 78).
 *
 * CATATAN PENTING: data di sini hidup di memori proses Worker. Di `wrangler
 * pages dev` lokal ini cukup stabil untuk development, tapi di Cloudflare
 * edge yang sesungguhnya setiap isolate bisa punya salinan sendiri —
 * artinya data TIDAK persisten lintas request secara andal. Ini alasan
 * utama kenapa PRD mewajibkan adapter Google Sheets/Supabase yang
 * sesungguhnya untuk data yang harus tahan lama (section 62-64).
 */

// ---------------------------------------------------------------------------
// Data awal (mencerminkan skenario di PRD section 75)
// ---------------------------------------------------------------------------

let products = [
  { ID_Barang: "BRG-001", Barcode: "899123456", Nama_Barang: "Aqua Galon", Tipe_Komoditi: "Air Minum", Stok_Awal: 5, Aktif: true },
  { ID_Barang: "BRG-002", Barcode: "899123456", Nama_Barang: "Vit Galon", Tipe_Komoditi: "Air Minum", Stok_Awal: 3, Aktif: true },
  { ID_Barang: "BRG-003", Barcode: "", Nama_Barang: "Galon Isi Ulang", Tipe_Komoditi: "Air Minum", Stok_Awal: 20, Aktif: true },
  { ID_Barang: "BRG-004", Barcode: "899777001", Nama_Barang: "Aqua 1500 ml", Tipe_Komoditi: "Air Minum", Stok_Awal: 2, Aktif: true },
  // BRG-005 s.d. BRG-060 diimpor dari list_master_barang.xlsx (harga per kategori: Retail/Sub Agen/User).
  // Stok_Awal diset 0 karena file sumber cuma berisi nama+harga, tidak ada kolom stok -- isi lewat
  // modul Stok Masuk / Penyesuaian Stok setelah ini.
  { ID_Barang: "BRG-005", Barcode: "", Nama_Barang: "Le Mineral Galon", Tipe_Komoditi: "Air Minum", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-006", Barcode: "", Nama_Barang: "Tulus Galon", Tipe_Komoditi: "Air Minum", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-007", Barcode: "", Nama_Barang: "Nestle Galon", Tipe_Komoditi: "Air Minum", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-008", Barcode: "", Nama_Barang: "Aqua 600 ml", Tipe_Komoditi: "Air Minum", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-009", Barcode: "", Nama_Barang: "Aqua 330 ml", Tipe_Komoditi: "Air Minum", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-010", Barcode: "", Nama_Barang: "Aqua Gelas 220 ml", Tipe_Komoditi: "Air Minum", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-011", Barcode: "", Nama_Barang: "Aqua 200 ml Cube", Tipe_Komoditi: "Air Minum", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-012", Barcode: "", Nama_Barang: "Vit 550 ml", Tipe_Komoditi: "Air Minum", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-013", Barcode: "", Nama_Barang: "Vit 1500 ml", Tipe_Komoditi: "Air Minum", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-014", Barcode: "", Nama_Barang: "Vit 220 ml Moksa", Tipe_Komoditi: "Air Minum", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-015", Barcode: "", Nama_Barang: "Vit Gelas 220 ml", Tipe_Komoditi: "Air Minum", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-016", Barcode: "", Nama_Barang: "Le Mineral 600 ml", Tipe_Komoditi: "Air Minum", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-017", Barcode: "", Nama_Barang: "Le Mineral 1500 ml", Tipe_Komoditi: "Air Minum", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-018", Barcode: "", Nama_Barang: "Le Mineral 330 ml", Tipe_Komoditi: "Air Minum", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-019", Barcode: "", Nama_Barang: "Teh Pucuk", Tipe_Komoditi: "Minuman", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-020", Barcode: "", Nama_Barang: "Sui 600 ml", Tipe_Komoditi: "Air Minum", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-021", Barcode: "", Nama_Barang: "Sui 1500 ml", Tipe_Komoditi: "Air Minum", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-022", Barcode: "", Nama_Barang: "Sui 220 Botol", Tipe_Komoditi: "Air Minum", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-023", Barcode: "", Nama_Barang: "Sui Gelas 220 ml", Tipe_Komoditi: "Air Minum", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-024", Barcode: "", Nama_Barang: "Quavit 1500 ml", Tipe_Komoditi: "Air Minum", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-025", Barcode: "", Nama_Barang: "Vola 220 ML/Gelas", Tipe_Komoditi: "Air Minum", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-026", Barcode: "", Nama_Barang: "Teh Gelas", Tipe_Komoditi: "Minuman", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-027", Barcode: "", Nama_Barang: "Panther", Tipe_Komoditi: "Minuman", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-028", Barcode: "", Nama_Barang: "Granita", Tipe_Komoditi: "Minuman", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-029", Barcode: "", Nama_Barang: "Ale-ale", Tipe_Komoditi: "Minuman", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-030", Barcode: "", Nama_Barang: "Teh Rio", Tipe_Komoditi: "Minuman", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-031", Barcode: "", Nama_Barang: "Oki Jd Big", Tipe_Komoditi: "Minuman", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-032", Barcode: "", Nama_Barang: "Olala", Tipe_Komoditi: "Minuman", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-033", Barcode: "", Nama_Barang: "Kopi Nongkrong", Tipe_Komoditi: "Minuman", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-034", Barcode: "", Nama_Barang: "Golda", Tipe_Komoditi: "Minuman", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-035", Barcode: "", Nama_Barang: "Milku", Tipe_Komoditi: "Minuman", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-036", Barcode: "", Nama_Barang: "Floridina", Tipe_Komoditi: "Minuman", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-037", Barcode: "", Nama_Barang: "Good Day", Tipe_Komoditi: "Minuman", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-038", Barcode: "", Nama_Barang: "Mizone", Tipe_Komoditi: "Minuman", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-039", Barcode: "", Nama_Barang: "Pocari Botol 500 ml", Tipe_Komoditi: "Minuman", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-040", Barcode: "", Nama_Barang: "Pocari Botol 350 ml", Tipe_Komoditi: "Minuman", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-041", Barcode: "", Nama_Barang: "Pocari Ken 330 ml", Tipe_Komoditi: "Minuman", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-042", Barcode: "", Nama_Barang: "Larutan Kaleng 330 ml", Tipe_Komoditi: "Minuman", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-043", Barcode: "", Nama_Barang: "Nipis Madu", Tipe_Komoditi: "Minuman", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-044", Barcode: "", Nama_Barang: "Sprite/Cola/Fanta", Tipe_Komoditi: "Minuman", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-045", Barcode: "", Nama_Barang: "Isoplus", Tipe_Komoditi: "Minuman", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-046", Barcode: "", Nama_Barang: "Gas 12 kg", Tipe_Komoditi: "Gas", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-047", Barcode: "", Nama_Barang: "Gas 3 kg", Tipe_Komoditi: "Gas", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-048", Barcode: "", Nama_Barang: "You C Orange", Tipe_Komoditi: "Minuman", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-049", Barcode: "", Nama_Barang: "Water Orange Botol", Tipe_Komoditi: "Minuman", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-050", Barcode: "", Nama_Barang: "Susu Ultra 125 ml", Tipe_Komoditi: "Susu", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-051", Barcode: "", Nama_Barang: "Susu Ultra 200 ml", Tipe_Komoditi: "Susu", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-052", Barcode: "", Nama_Barang: "Susu Ultra 250 ml", Tipe_Komoditi: "Susu", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-053", Barcode: "", Nama_Barang: "Galon Kosong Aqua", Tipe_Komoditi: "Air Minum", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-054", Barcode: "", Nama_Barang: "Teh Botol Sosro Pet 350 ml", Tipe_Komoditi: "Minuman", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-055", Barcode: "", Nama_Barang: "Fruit Tea Pet", Tipe_Komoditi: "Minuman", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-056", Barcode: "", Nama_Barang: "Es Tee Pet 390 ml", Tipe_Komoditi: "Minuman", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-057", Barcode: "", Nama_Barang: "Es Tee Kotak", Tipe_Komoditi: "Minuman", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-058", Barcode: "", Nama_Barang: "Teh Kotak Ultra", Tipe_Komoditi: "Minuman", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-059", Barcode: "", Nama_Barang: "Batavia 600 ml", Tipe_Komoditi: "Air Minum", Stok_Awal: 0, Aktif: true },
  { ID_Barang: "BRG-060", Barcode: "", Nama_Barang: "Batavia Gelas", Tipe_Komoditi: "Air Minum", Stok_Awal: 0, Aktif: true },
];

let prices = [
  { ID_Harga: "HRG-0001", ID_Barang: "BRG-001", Kategori_Pelanggan: "Retail", Harga_Default: 18500, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0002", ID_Barang: "BRG-001", Kategori_Pelanggan: "Sub Agen", Harga_Default: 18000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0003", ID_Barang: "BRG-001", Kategori_Pelanggan: "User", Harga_Default: 19000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0004", ID_Barang: "BRG-004", Kategori_Pelanggan: "Retail", Harga_Default: 52000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0005", ID_Barang: "BRG-004", Kategori_Pelanggan: "Sub Agen", Harga_Default: 50000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0006", ID_Barang: "BRG-004", Kategori_Pelanggan: "User", Harga_Default: 52000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0007", ID_Barang: "BRG-003", Kategori_Pelanggan: "Retail", Harga_Default: 15000, Boleh_Edit_Harga: true, Aktif: true },
  // BRG-001/BRG-004 di atas diupdate & BRG-002 (Vit Galon) di bawah dilengkapi mengikuti
  // list_master_barang.xlsx (sebelumnya belum punya baris harga sama sekali di seed ini).
  { ID_Harga: "HRG-0008", ID_Barang: "BRG-002", Kategori_Pelanggan: "Retail", Harga_Default: 15000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0009", ID_Barang: "BRG-002", Kategori_Pelanggan: "Sub Agen", Harga_Default: 14000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0010", ID_Barang: "BRG-002", Kategori_Pelanggan: "User", Harga_Default: 15000, Boleh_Edit_Harga: false, Aktif: true },
  // HRG-0011 s.d. HRG-0178: harga 3 kategori (Retail/Sub Agen/User) untuk BRG-005 s.d. BRG-060.
  { ID_Harga: "HRG-0011", ID_Barang: "BRG-005", Kategori_Pelanggan: "Retail", Harga_Default: 19000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0012", ID_Barang: "BRG-005", Kategori_Pelanggan: "Sub Agen", Harga_Default: 19000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0013", ID_Barang: "BRG-005", Kategori_Pelanggan: "User", Harga_Default: 20000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0014", ID_Barang: "BRG-006", Kategori_Pelanggan: "Retail", Harga_Default: 18000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0015", ID_Barang: "BRG-006", Kategori_Pelanggan: "Sub Agen", Harga_Default: 16500, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0016", ID_Barang: "BRG-006", Kategori_Pelanggan: "User", Harga_Default: 18000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0017", ID_Barang: "BRG-007", Kategori_Pelanggan: "Retail", Harga_Default: 19000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0018", ID_Barang: "BRG-007", Kategori_Pelanggan: "Sub Agen", Harga_Default: 19000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0019", ID_Barang: "BRG-007", Kategori_Pelanggan: "User", Harga_Default: 20000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0020", ID_Barang: "BRG-008", Kategori_Pelanggan: "Retail", Harga_Default: 47000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0021", ID_Barang: "BRG-008", Kategori_Pelanggan: "Sub Agen", Harga_Default: 45000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0022", ID_Barang: "BRG-008", Kategori_Pelanggan: "User", Harga_Default: 47000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0023", ID_Barang: "BRG-009", Kategori_Pelanggan: "Retail", Harga_Default: 40000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0024", ID_Barang: "BRG-009", Kategori_Pelanggan: "Sub Agen", Harga_Default: 36500, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0025", ID_Barang: "BRG-009", Kategori_Pelanggan: "User", Harga_Default: 40000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0026", ID_Barang: "BRG-010", Kategori_Pelanggan: "Retail", Harga_Default: 35000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0027", ID_Barang: "BRG-010", Kategori_Pelanggan: "Sub Agen", Harga_Default: 34000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0028", ID_Barang: "BRG-010", Kategori_Pelanggan: "User", Harga_Default: 36000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0029", ID_Barang: "BRG-011", Kategori_Pelanggan: "Retail", Harga_Default: 25000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0030", ID_Barang: "BRG-011", Kategori_Pelanggan: "Sub Agen", Harga_Default: 23000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0031", ID_Barang: "BRG-011", Kategori_Pelanggan: "User", Harga_Default: 25000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0032", ID_Barang: "BRG-012", Kategori_Pelanggan: "Retail", Harga_Default: 32000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0033", ID_Barang: "BRG-012", Kategori_Pelanggan: "Sub Agen", Harga_Default: 31500, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0034", ID_Barang: "BRG-012", Kategori_Pelanggan: "User", Harga_Default: 33000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0035", ID_Barang: "BRG-013", Kategori_Pelanggan: "Retail", Harga_Default: 33000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0036", ID_Barang: "BRG-013", Kategori_Pelanggan: "Sub Agen", Harga_Default: 32500, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0037", ID_Barang: "BRG-013", Kategori_Pelanggan: "User", Harga_Default: 34000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0038", ID_Barang: "BRG-014", Kategori_Pelanggan: "Retail", Harga_Default: 22000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0039", ID_Barang: "BRG-014", Kategori_Pelanggan: "Sub Agen", Harga_Default: 20000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0040", ID_Barang: "BRG-014", Kategori_Pelanggan: "User", Harga_Default: 22000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0041", ID_Barang: "BRG-015", Kategori_Pelanggan: "Retail", Harga_Default: 23000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0042", ID_Barang: "BRG-015", Kategori_Pelanggan: "Sub Agen", Harga_Default: 22000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0043", ID_Barang: "BRG-015", Kategori_Pelanggan: "User", Harga_Default: 23000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0044", ID_Barang: "BRG-016", Kategori_Pelanggan: "Retail", Harga_Default: 47000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0045", ID_Barang: "BRG-016", Kategori_Pelanggan: "Sub Agen", Harga_Default: 45000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0046", ID_Barang: "BRG-016", Kategori_Pelanggan: "User", Harga_Default: 47000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0047", ID_Barang: "BRG-017", Kategori_Pelanggan: "Retail", Harga_Default: 52000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0048", ID_Barang: "BRG-017", Kategori_Pelanggan: "Sub Agen", Harga_Default: 50000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0049", ID_Barang: "BRG-017", Kategori_Pelanggan: "User", Harga_Default: 52000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0050", ID_Barang: "BRG-018", Kategori_Pelanggan: "Retail", Harga_Default: 40000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0051", ID_Barang: "BRG-018", Kategori_Pelanggan: "Sub Agen", Harga_Default: 36500, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0052", ID_Barang: "BRG-018", Kategori_Pelanggan: "User", Harga_Default: 40000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0053", ID_Barang: "BRG-019", Kategori_Pelanggan: "Retail", Harga_Default: 64000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0054", ID_Barang: "BRG-019", Kategori_Pelanggan: "Sub Agen", Harga_Default: 62000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0055", ID_Barang: "BRG-019", Kategori_Pelanggan: "User", Harga_Default: 65000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0056", ID_Barang: "BRG-020", Kategori_Pelanggan: "Retail", Harga_Default: 25000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0057", ID_Barang: "BRG-020", Kategori_Pelanggan: "Sub Agen", Harga_Default: 24000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0058", ID_Barang: "BRG-020", Kategori_Pelanggan: "User", Harga_Default: 25000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0059", ID_Barang: "BRG-021", Kategori_Pelanggan: "Retail", Harga_Default: 29000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0060", ID_Barang: "BRG-021", Kategori_Pelanggan: "Sub Agen", Harga_Default: 28000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0061", ID_Barang: "BRG-021", Kategori_Pelanggan: "User", Harga_Default: 29000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0062", ID_Barang: "BRG-022", Kategori_Pelanggan: "Retail", Harga_Default: 20000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0063", ID_Barang: "BRG-022", Kategori_Pelanggan: "Sub Agen", Harga_Default: 18000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0064", ID_Barang: "BRG-022", Kategori_Pelanggan: "User", Harga_Default: 20000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0065", ID_Barang: "BRG-023", Kategori_Pelanggan: "Retail", Harga_Default: 17000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0066", ID_Barang: "BRG-023", Kategori_Pelanggan: "Sub Agen", Harga_Default: 16000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0067", ID_Barang: "BRG-023", Kategori_Pelanggan: "User", Harga_Default: 17000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0068", ID_Barang: "BRG-024", Kategori_Pelanggan: "Retail", Harga_Default: 29000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0069", ID_Barang: "BRG-024", Kategori_Pelanggan: "Sub Agen", Harga_Default: 27000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0070", ID_Barang: "BRG-024", Kategori_Pelanggan: "User", Harga_Default: 29000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0071", ID_Barang: "BRG-025", Kategori_Pelanggan: "Retail", Harga_Default: 17000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0072", ID_Barang: "BRG-025", Kategori_Pelanggan: "Sub Agen", Harga_Default: 16000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0073", ID_Barang: "BRG-025", Kategori_Pelanggan: "User", Harga_Default: 17000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0074", ID_Barang: "BRG-026", Kategori_Pelanggan: "Retail", Harga_Default: 20000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0075", ID_Barang: "BRG-026", Kategori_Pelanggan: "Sub Agen", Harga_Default: 19000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0076", ID_Barang: "BRG-026", Kategori_Pelanggan: "User", Harga_Default: 20000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0077", ID_Barang: "BRG-027", Kategori_Pelanggan: "Retail", Harga_Default: 20000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0078", ID_Barang: "BRG-027", Kategori_Pelanggan: "Sub Agen", Harga_Default: 19500, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0079", ID_Barang: "BRG-027", Kategori_Pelanggan: "User", Harga_Default: 20000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0080", ID_Barang: "BRG-028", Kategori_Pelanggan: "Retail", Harga_Default: 37000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0081", ID_Barang: "BRG-028", Kategori_Pelanggan: "Sub Agen", Harga_Default: 36000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0082", ID_Barang: "BRG-028", Kategori_Pelanggan: "User", Harga_Default: 37000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0083", ID_Barang: "BRG-029", Kategori_Pelanggan: "Retail", Harga_Default: 22000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0084", ID_Barang: "BRG-029", Kategori_Pelanggan: "Sub Agen", Harga_Default: 20500, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0085", ID_Barang: "BRG-029", Kategori_Pelanggan: "User", Harga_Default: 22000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0086", ID_Barang: "BRG-030", Kategori_Pelanggan: "Retail", Harga_Default: 20000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0087", ID_Barang: "BRG-030", Kategori_Pelanggan: "Sub Agen", Harga_Default: 19500, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0088", ID_Barang: "BRG-030", Kategori_Pelanggan: "User", Harga_Default: 20000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0089", ID_Barang: "BRG-031", Kategori_Pelanggan: "Retail", Harga_Default: 39000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0090", ID_Barang: "BRG-031", Kategori_Pelanggan: "Sub Agen", Harga_Default: 37500, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0091", ID_Barang: "BRG-031", Kategori_Pelanggan: "User", Harga_Default: 39000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0092", ID_Barang: "BRG-032", Kategori_Pelanggan: "Retail", Harga_Default: 21000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0093", ID_Barang: "BRG-032", Kategori_Pelanggan: "Sub Agen", Harga_Default: 20000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0094", ID_Barang: "BRG-032", Kategori_Pelanggan: "User", Harga_Default: 21000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0095", ID_Barang: "BRG-033", Kategori_Pelanggan: "Retail", Harga_Default: 21000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0096", ID_Barang: "BRG-033", Kategori_Pelanggan: "Sub Agen", Harga_Default: 20000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0097", ID_Barang: "BRG-033", Kategori_Pelanggan: "User", Harga_Default: 21000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0098", ID_Barang: "BRG-034", Kategori_Pelanggan: "Retail", Harga_Default: 35000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0099", ID_Barang: "BRG-034", Kategori_Pelanggan: "Sub Agen", Harga_Default: 34500, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0100", ID_Barang: "BRG-034", Kategori_Pelanggan: "User", Harga_Default: 35000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0101", ID_Barang: "BRG-035", Kategori_Pelanggan: "Retail", Harga_Default: 35000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0102", ID_Barang: "BRG-035", Kategori_Pelanggan: "Sub Agen", Harga_Default: 34500, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0103", ID_Barang: "BRG-035", Kategori_Pelanggan: "User", Harga_Default: 35000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0104", ID_Barang: "BRG-036", Kategori_Pelanggan: "Retail", Harga_Default: 35000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0105", ID_Barang: "BRG-036", Kategori_Pelanggan: "Sub Agen", Harga_Default: 32000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0106", ID_Barang: "BRG-036", Kategori_Pelanggan: "User", Harga_Default: 35000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0107", ID_Barang: "BRG-037", Kategori_Pelanggan: "Retail", Harga_Default: 130000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0108", ID_Barang: "BRG-037", Kategori_Pelanggan: "Sub Agen", Harga_Default: 125000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0109", ID_Barang: "BRG-037", Kategori_Pelanggan: "User", Harga_Default: 130000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0110", ID_Barang: "BRG-038", Kategori_Pelanggan: "Retail", Harga_Default: 49500, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0111", ID_Barang: "BRG-038", Kategori_Pelanggan: "Sub Agen", Harga_Default: 49000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0112", ID_Barang: "BRG-038", Kategori_Pelanggan: "User", Harga_Default: 50000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0113", ID_Barang: "BRG-039", Kategori_Pelanggan: "Retail", Harga_Default: 165000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0114", ID_Barang: "BRG-039", Kategori_Pelanggan: "Sub Agen", Harga_Default: 160000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0115", ID_Barang: "BRG-039", Kategori_Pelanggan: "User", Harga_Default: 165000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0116", ID_Barang: "BRG-040", Kategori_Pelanggan: "Retail", Harga_Default: 140000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0117", ID_Barang: "BRG-040", Kategori_Pelanggan: "Sub Agen", Harga_Default: 135000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0118", ID_Barang: "BRG-040", Kategori_Pelanggan: "User", Harga_Default: 140000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0119", ID_Barang: "BRG-041", Kategori_Pelanggan: "Retail", Harga_Default: 130000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0120", ID_Barang: "BRG-041", Kategori_Pelanggan: "Sub Agen", Harga_Default: 125000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0121", ID_Barang: "BRG-041", Kategori_Pelanggan: "User", Harga_Default: 130000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0122", ID_Barang: "BRG-042", Kategori_Pelanggan: "Retail", Harga_Default: 140000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0123", ID_Barang: "BRG-042", Kategori_Pelanggan: "Sub Agen", Harga_Default: 137500, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0124", ID_Barang: "BRG-042", Kategori_Pelanggan: "User", Harga_Default: 140000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0125", ID_Barang: "BRG-043", Kategori_Pelanggan: "Retail", Harga_Default: 42000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0126", ID_Barang: "BRG-043", Kategori_Pelanggan: "Sub Agen", Harga_Default: 39000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0127", ID_Barang: "BRG-043", Kategori_Pelanggan: "User", Harga_Default: 42000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0128", ID_Barang: "BRG-044", Kategori_Pelanggan: "Retail", Harga_Default: 52000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0129", ID_Barang: "BRG-044", Kategori_Pelanggan: "Sub Agen", Harga_Default: 49000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0130", ID_Barang: "BRG-044", Kategori_Pelanggan: "User", Harga_Default: 52000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0131", ID_Barang: "BRG-045", Kategori_Pelanggan: "Retail", Harga_Default: 35000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0132", ID_Barang: "BRG-045", Kategori_Pelanggan: "Sub Agen", Harga_Default: 32000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0133", ID_Barang: "BRG-045", Kategori_Pelanggan: "User", Harga_Default: 35000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0134", ID_Barang: "BRG-046", Kategori_Pelanggan: "Retail", Harga_Default: 230000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0135", ID_Barang: "BRG-046", Kategori_Pelanggan: "Sub Agen", Harga_Default: 230000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0136", ID_Barang: "BRG-046", Kategori_Pelanggan: "User", Harga_Default: 260000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0137", ID_Barang: "BRG-047", Kategori_Pelanggan: "Retail", Harga_Default: 20000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0138", ID_Barang: "BRG-047", Kategori_Pelanggan: "Sub Agen", Harga_Default: 20000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0139", ID_Barang: "BRG-047", Kategori_Pelanggan: "User", Harga_Default: 20000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0140", ID_Barang: "BRG-048", Kategori_Pelanggan: "Retail", Harga_Default: 175000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0141", ID_Barang: "BRG-048", Kategori_Pelanggan: "Sub Agen", Harga_Default: 175000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0142", ID_Barang: "BRG-048", Kategori_Pelanggan: "User", Harga_Default: 175000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0143", ID_Barang: "BRG-049", Kategori_Pelanggan: "Retail", Harga_Default: 165000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0144", ID_Barang: "BRG-049", Kategori_Pelanggan: "Sub Agen", Harga_Default: 165000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0145", ID_Barang: "BRG-049", Kategori_Pelanggan: "User", Harga_Default: 165000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0146", ID_Barang: "BRG-050", Kategori_Pelanggan: "Retail", Harga_Default: 130000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0147", ID_Barang: "BRG-050", Kategori_Pelanggan: "Sub Agen", Harga_Default: 125000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0148", ID_Barang: "BRG-050", Kategori_Pelanggan: "User", Harga_Default: 130000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0149", ID_Barang: "BRG-051", Kategori_Pelanggan: "Retail", Harga_Default: 125000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0150", ID_Barang: "BRG-051", Kategori_Pelanggan: "Sub Agen", Harga_Default: 125000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0151", ID_Barang: "BRG-051", Kategori_Pelanggan: "User", Harga_Default: 125000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0152", ID_Barang: "BRG-052", Kategori_Pelanggan: "Retail", Harga_Default: 160000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0153", ID_Barang: "BRG-052", Kategori_Pelanggan: "Sub Agen", Harga_Default: 155000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0154", ID_Barang: "BRG-052", Kategori_Pelanggan: "User", Harga_Default: 160000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0155", ID_Barang: "BRG-053", Kategori_Pelanggan: "Retail", Harga_Default: 45000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0156", ID_Barang: "BRG-053", Kategori_Pelanggan: "Sub Agen", Harga_Default: 45000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0157", ID_Barang: "BRG-053", Kategori_Pelanggan: "User", Harga_Default: 45000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0158", ID_Barang: "BRG-054", Kategori_Pelanggan: "Retail", Harga_Default: 50000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0159", ID_Barang: "BRG-054", Kategori_Pelanggan: "Sub Agen", Harga_Default: 50000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0160", ID_Barang: "BRG-054", Kategori_Pelanggan: "User", Harga_Default: 50000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0161", ID_Barang: "BRG-055", Kategori_Pelanggan: "Retail", Harga_Default: 50000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0162", ID_Barang: "BRG-055", Kategori_Pelanggan: "Sub Agen", Harga_Default: 50000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0163", ID_Barang: "BRG-055", Kategori_Pelanggan: "User", Harga_Default: 50000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0164", ID_Barang: "BRG-056", Kategori_Pelanggan: "Retail", Harga_Default: 35000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0165", ID_Barang: "BRG-056", Kategori_Pelanggan: "Sub Agen", Harga_Default: 35000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0166", ID_Barang: "BRG-056", Kategori_Pelanggan: "User", Harga_Default: 35000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0167", ID_Barang: "BRG-057", Kategori_Pelanggan: "Retail", Harga_Default: 45000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0168", ID_Barang: "BRG-057", Kategori_Pelanggan: "Sub Agen", Harga_Default: 45000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0169", ID_Barang: "BRG-057", Kategori_Pelanggan: "User", Harga_Default: 45000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0170", ID_Barang: "BRG-058", Kategori_Pelanggan: "Retail", Harga_Default: 85000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0171", ID_Barang: "BRG-058", Kategori_Pelanggan: "Sub Agen", Harga_Default: 80000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0172", ID_Barang: "BRG-058", Kategori_Pelanggan: "User", Harga_Default: 85000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0173", ID_Barang: "BRG-059", Kategori_Pelanggan: "Retail", Harga_Default: 25000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0174", ID_Barang: "BRG-059", Kategori_Pelanggan: "Sub Agen", Harga_Default: 23000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0175", ID_Barang: "BRG-059", Kategori_Pelanggan: "User", Harga_Default: 25000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0176", ID_Barang: "BRG-060", Kategori_Pelanggan: "Retail", Harga_Default: 17000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0177", ID_Barang: "BRG-060", Kategori_Pelanggan: "Sub Agen", Harga_Default: 16000, Boleh_Edit_Harga: false, Aktif: true },
  { ID_Harga: "HRG-0178", ID_Barang: "BRG-060", Kategori_Pelanggan: "User", Harga_Default: 17000, Boleh_Edit_Harga: false, Aktif: true },
];

let customers = [
  { ID_Customer: "CUST-001", Nama_Customer: "Arif", No_HP: "", Email: "", Kategori_Pelanggan: "Retail", Alamat: "", Catatan: "", Aktif: true },
  { ID_Customer: "CUST-002", Nama_Customer: "Budi", No_HP: "", Email: "", Kategori_Pelanggan: "Retail", Alamat: "", Catatan: "", Aktif: true },
];

let suppliers = [
  { ID_Supplier: "SUP-001", Nama_Supplier: "CV Sumber Makmur", No_HP: "", Email: "email@supplier.com", Alamat: "", Catatan: "", Aktif: true },
];

// ---------- Stok_Masuk / Stock_Adjustment — PRD section 26-30, 39-43 ----------
// Seed menunjukkan bahwa Stok Saat Ini (section 41) sudah beda dari Stok_Awal
// proxy yang dipakai sementara di Phase 3, tanpa mengubah Master_Barang.Stok_Awal
// itu sendiri (section 27, 42 — histori stok tidak boleh ditimpa).
const _fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString();
const _twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
let stockMasuk = [
  {
    ID_Stok_Masuk: "MSK-0001",
    Tanggal: _fiveDaysAgo.slice(0, 10),
    ID_Barang: "BRG-001",
    Qty_Dus_Masuk: 10,
    ID_Supplier: "SUP-001",
    Harga_Beli: 15000,
    Catatan: "",
    Created_At: _fiveDaysAgo,
  },
];
let stockAdjustments = [
  {
    ID_Adjustment: "ADJ-0001",
    Tanggal: _twoDaysAgo.slice(0, 10),
    ID_Barang: "BRG-003",
    Qty_Penyesuaian: -1,
    Alasan: "Galon retak saat penyimpanan",
    Created_At: _twoDaysAgo,
  },
];

// ---------- Penjualan / Detail_Penjualan — PRD section 31-38 ----------
// Seed mencerminkan skenario 1 & 2 di PRD section 75: barang normal (harga
// default kategori) + Galon Isi Ulang dengan manual price override.
const _today = new Date().toISOString();
const _threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
const _tenDaysAgo = new Date(Date.now() - 10 * 86400000).toISOString();
let sales = [
  {
    ID_Trx: "TRX-0001",
    Tanggal: _today.slice(0, 10),
    ID_Customer: "CUST-001",
    Total: 89000,
    Status_Bayar: "Lunas",
    Metode_Bayar: "Cash",
    Catatan: "",
    Created_At: _today,
    Updated_At: _today,
  },
  // Dalam 7 hari terakhir -> ikut masuk default "Penjualan periode tertentu"
  // (PRD section 44) di dashboard, beda dari TRX-0003 di bawah yang sengaja
  // di luar jendela default supaya filter tanggal punya sesuatu untuk diuji.
  {
    ID_Trx: "TRX-0002",
    Tanggal: _threeDaysAgo.slice(0, 10),
    ID_Customer: "CUST-002",
    Total: 30000,
    Status_Bayar: "Lunas",
    Metode_Bayar: "Cash",
    Catatan: "",
    Created_At: _threeDaysAgo,
    Updated_At: _threeDaysAgo,
  },
  // Di luar jendela default 7 hari terakhir.
  {
    ID_Trx: "TRX-0003",
    Tanggal: _tenDaysAgo.slice(0, 10),
    ID_Customer: "CUST-001",
    Total: 15000,
    Status_Bayar: "Lunas",
    Metode_Bayar: "Transfer",
    Catatan: "",
    Created_At: _tenDaysAgo,
    Updated_At: _tenDaysAgo,
  },
];
let saleDetails = [
  { ID_Detail: "DTL-0001", ID_Trx: "TRX-0001", ID_Barang: "BRG-004", Kategori_Pelanggan: "Retail", Qty: 1, Harga_Satuan: 52000, Subtotal: 52000 },
  { ID_Detail: "DTL-0002", ID_Trx: "TRX-0001", ID_Barang: "BRG-001", Kategori_Pelanggan: "Retail", Qty: 1, Harga_Satuan: 20000, Subtotal: 20000 },
  { ID_Detail: "DTL-0003", ID_Trx: "TRX-0001", ID_Barang: "BRG-003", Kategori_Pelanggan: "Retail", Qty: 1, Harga_Satuan: 17000, Subtotal: 17000 },
  { ID_Detail: "DTL-0004", ID_Trx: "TRX-0002", ID_Barang: "BRG-003", Kategori_Pelanggan: "Retail", Qty: 2, Harga_Satuan: 15000, Subtotal: 30000 },
  { ID_Detail: "DTL-0005", ID_Trx: "TRX-0003", ID_Barang: "BRG-003", Kategori_Pelanggan: "Retail", Qty: 1, Harga_Satuan: 15000, Subtotal: 15000 },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/** "YYYY-MM-DD" N hari sebelum hari ini (n=0 -> hari ini). */
function daysAgoStr(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/** Validasi longgar format tanggal "YYYY-MM-DD" (dipakai filter periode dashboard). */
function isValidDateStr(str) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(str || ""))) return false;
  return !isNaN(new Date(`${str}T00:00:00Z`).getTime());
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function nextId(prefix, list, idField, pad = 3) {
  let max = 0;
  for (const row of list) {
    const m = String(row[idField] || "").match(new RegExp(`^${prefix}-(\\d+)$`));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${prefix}-${String(max + 1).padStart(pad, "0")}`;
}

function paginate(list, { page = 1, limit = 50 }) {
  page = Math.max(1, parseInt(page, 10) || 1);
  limit = Math.max(1, Math.min(200, parseInt(limit, 10) || 50));
  const total = list.length;
  const start = (page - 1) * limit;
  const data = list.slice(start, start + limit);
  return { data, pagination: { page, limit, total } };
}

function matchesSearch(row, fields, search) {
  if (!search) return true;
  const needle = search.toLowerCase();
  return fields.some((f) => String(row[f] || "").toLowerCase().includes(needle));
}

class RepoError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Stok Saat Ini — PRD section 26, 41: Stok Awal + Stok Masuk - Penjualan + Adjustment.
// Satu-satunya tempat formula ini dihitung, dipakai baik oleh modul Stok
// maupun oleh Penjualan (pengganti proxy Stok_Awal yang dipakai di Phase 3).
// ---------------------------------------------------------------------------

function totalStokMasuk(productId) {
  return stockMasuk
    .filter((m) => m.ID_Barang === productId)
    .reduce((sum, m) => sum + m.Qty_Dus_Masuk, 0);
}

function totalPenjualan(productId) {
  return saleDetails
    .filter((d) => d.ID_Barang === productId)
    .reduce((sum, d) => sum + d.Qty, 0);
}

function totalAdjustment(productId) {
  return stockAdjustments
    .filter((a) => a.ID_Barang === productId)
    .reduce((sum, a) => sum + a.Qty_Penyesuaian, 0);
}

function computeCurrentStock(productId) {
  const product = products.find((p) => p.ID_Barang === productId);
  if (!product) return 0;
  return product.Stok_Awal + totalStokMasuk(productId) - totalPenjualan(productId) + totalAdjustment(productId);
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export const mockRepository = {
  async getDashboardSummary({ from, to } = {}) {
    // Phase 4: Total Stok & status rendah/habis sekarang memakai Stok Saat Ini
    // (section 41), bukan lagi proxy Master_Barang.Stok_Awal seperti Phase 3.
    const totalStokUnit = products.reduce((sum, p) => sum + computeCurrentStock(p.ID_Barang), 0);
    const today = todayStr();
    const salesToday = sales.filter((s) => s.Tanggal === today);
    const penjualanHariIni = salesToday.reduce((sum, s) => sum + s.Total, 0);
    const lowStockThreshold = 5;
    const stokRendah = products
      .filter((p) => p.Aktif)
      .map((p) => ({ nama: p.Nama_Barang, stok: computeCurrentStock(p.ID_Barang) }))
      .filter((p) => p.stok > 0 && p.stok <= lowStockThreshold);
    const stokHabis = products
      .filter((p) => p.Aktif)
      .map((p) => ({ nama: p.Nama_Barang, stok: computeCurrentStock(p.ID_Barang) }))
      .filter((p) => p.stok <= 0);

    // PRD section 44: "Penjualan periode tertentu", di atas "Penjualan hari
    // ini" yang sudah ada sejak Phase 1. `from`/`to` opsional — kalau caller
    // (dashboard.js) tidak mengirim keduanya, default ke 7 hari terakhir
    // termasuk hari ini, supaya kartu ini selalu punya nilai yang masuk akal
    // begitu dashboard dibuka pertama kali.
    let periodeFrom = from;
    let periodeTo = to;
    if (!periodeFrom && !periodeTo) {
      periodeFrom = daysAgoStr(6);
      periodeTo = today;
    } else {
      if (!periodeFrom || !periodeTo) {
        throw new RepoError(
          "VALIDATION_ERROR",
          "Tanggal awal dan akhir periode harus diisi bersamaan."
        );
      }
      if (!isValidDateStr(periodeFrom) || !isValidDateStr(periodeTo)) {
        throw new RepoError("VALIDATION_ERROR", "Format tanggal periode tidak valid.");
      }
      if (periodeFrom > periodeTo) {
        throw new RepoError("VALIDATION_ERROR", "Tanggal awal tidak boleh melebihi tanggal akhir.");
      }
    }
    const salesPeriode = sales.filter((s) => s.Tanggal >= periodeFrom && s.Tanggal <= periodeTo);

    return {
      totalBarang: products.filter((p) => p.Aktif).length,
      totalCustomer: customers.filter((c) => c.Aktif).length,
      totalSupplier: suppliers.filter((s) => s.Aktif).length,
      totalStok: totalStokUnit,
      penjualanHariIni,
      jumlahTransaksiHariIni: salesToday.length,
      penjualanPeriode: {
        from: periodeFrom,
        to: periodeTo,
        total: salesPeriode.reduce((sum, s) => sum + s.Total, 0),
        jumlahTransaksi: salesPeriode.length,
      },
      stokRendah,
      stokHabis,
    };
  },

  // ---------- Products (Master_Barang) — PRD section 9-13 ----------
  async listProducts({ page, limit, search, barcode } = {}) {
    let filtered;
    const barcodeNeedle = barcode !== undefined && barcode !== null ? String(barcode).trim() : "";
    if (barcodeNeedle) {
      // Lookup scanner (PRD section 13): EXACT match, bukan substring seperti
      // `search`. Barcode sengaja TIDAK unique (section 12) jadi hasilnya bisa
      // 0, 1, atau beberapa baris — kontrak 3 kondisi itu ditentukan di sini,
      // caller (functions/api/products/index.js -> components/scanner.js)
      // tinggal meneruskan apa adanya.
      filtered = products.filter((p) => String(p.Barcode || "").trim() === barcodeNeedle);
    } else {
      filtered = products.filter((p) => matchesSearch(p, ["Nama_Barang", "Barcode", "ID_Barang"], search));
    }
    // Stok_Saat_Ini ditambahkan sebagai field baru (section 41) — Stok_Awal
    // tetap dikirim apa adanya, itu histori yang tidak boleh berubah (section 27, 42).
    const enriched = filtered.map((p) => ({ ...p, Stok_Saat_Ini: computeCurrentStock(p.ID_Barang) }));
    return paginate(enriched, { page, limit });
  },

  async getProduct(id) {
    const row = products.find((p) => p.ID_Barang === id);
    if (!row) throw new RepoError("PRODUCT_NOT_FOUND", "Produk tidak ditemukan.");
    return { ...row, Stok_Saat_Ini: computeCurrentStock(id) };
  },

  async createProduct(input) {
    if (!input.Nama_Barang || !String(input.Nama_Barang).trim()) {
      throw new RepoError("VALIDATION_ERROR", "Nama barang wajib diisi.");
    }
    const row = {
      ID_Barang: nextId("BRG", products, "ID_Barang"),
      Barcode: input.Barcode ? String(input.Barcode).trim() : "",
      Nama_Barang: String(input.Nama_Barang).trim(),
      Tipe_Komoditi: input.Tipe_Komoditi ? String(input.Tipe_Komoditi).trim() : "",
      Stok_Awal: Number(input.Stok_Awal) || 0,
      Aktif: input.Aktif !== false,
    };
    products.push(row);
    return row;
  },

  async updateProduct(id, input) {
    const row = products.find((p) => p.ID_Barang === id);
    if (!row) throw new RepoError("PRODUCT_NOT_FOUND", "Produk tidak ditemukan.");
    if (input.Nama_Barang !== undefined && !String(input.Nama_Barang).trim()) {
      throw new RepoError("VALIDATION_ERROR", "Nama barang wajib diisi.");
    }
    if (input.Nama_Barang !== undefined) row.Nama_Barang = String(input.Nama_Barang).trim();
    if (input.Barcode !== undefined) row.Barcode = String(input.Barcode).trim();
    if (input.Tipe_Komoditi !== undefined) row.Tipe_Komoditi = String(input.Tipe_Komoditi).trim();
    if (input.Stok_Awal !== undefined) row.Stok_Awal = Number(input.Stok_Awal) || 0;
    if (input.Aktif !== undefined) row.Aktif = !!input.Aktif;
    return row;
  },

  // ---------- Harga_Barang — PRD section 14-19 ----------
  async listPricesForProduct(productId) {
    await this.getProduct(productId);
    return prices.filter((p) => p.ID_Barang === productId);
  },

  async upsertPrice(productId, input) {
    await this.getProduct(productId);
    if (!input.Kategori_Pelanggan || !String(input.Kategori_Pelanggan).trim()) {
      throw new RepoError("VALIDATION_ERROR", "Kategori pelanggan wajib diisi.");
    }
    const harga = Number(input.Harga_Default);
    if (isNaN(harga) || harga < 0) {
      throw new RepoError("VALIDATION_ERROR", "Harga tidak boleh kurang dari 0.");
    }
    const kategori = String(input.Kategori_Pelanggan).trim();
    let row = prices.find((p) => p.ID_Barang === productId && p.Kategori_Pelanggan === kategori);
    if (row) {
      row.Harga_Default = harga;
      row.Boleh_Edit_Harga = !!input.Boleh_Edit_Harga;
      row.Aktif = input.Aktif !== false;
    } else {
      row = {
        ID_Harga: nextId("HRG", prices, "ID_Harga", 4),
        ID_Barang: productId,
        Kategori_Pelanggan: kategori,
        Harga_Default: harga,
        Boleh_Edit_Harga: !!input.Boleh_Edit_Harga,
        Aktif: input.Aktif !== false,
      };
      prices.push(row);
    }
    return row;
  },

  async getPrice(productId, kategori) {
    return prices.find(
      (p) => p.ID_Barang === productId && p.Kategori_Pelanggan === kategori && p.Aktif
    ) || null;
  },

  async listKnownCategories() {
    const fromData = new Set(prices.map((p) => p.Kategori_Pelanggan));
    ["Retail", "Sub Agen", "User"].forEach((c) => fromData.add(c));
    return Array.from(fromData);
  },

  // ---------- Customer — PRD section 20-22 ----------
  async listCustomers({ page, limit, search } = {}) {
    const filtered = customers.filter((c) =>
      matchesSearch(c, ["Nama_Customer", "No_HP", "Email"], search)
    );
    return paginate(filtered, { page, limit });
  },

  async getCustomer(id) {
    const row = customers.find((c) => c.ID_Customer === id);
    if (!row) throw new RepoError("CUSTOMER_NOT_FOUND", "Customer tidak ditemukan.");
    return row;
  },

  async createCustomer(input) {
    if (!input.Nama_Customer || !String(input.Nama_Customer).trim()) {
      throw new RepoError("VALIDATION_ERROR", "Nama customer wajib diisi.");
    }
    if (!input.Kategori_Pelanggan || !String(input.Kategori_Pelanggan).trim()) {
      throw new RepoError("VALIDATION_ERROR", "Kategori pelanggan wajib diisi.");
    }
    if (input.Email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.Email)) {
      throw new RepoError("VALIDATION_ERROR", "Format email tidak valid.");
    }
    const row = {
      ID_Customer: nextId("CUST", customers, "ID_Customer"),
      Nama_Customer: String(input.Nama_Customer).trim(),
      No_HP: input.No_HP ? String(input.No_HP).trim() : "",
      Email: input.Email ? String(input.Email).trim() : "",
      Kategori_Pelanggan: String(input.Kategori_Pelanggan).trim(),
      Alamat: input.Alamat ? String(input.Alamat).trim() : "",
      Catatan: input.Catatan ? String(input.Catatan).trim() : "",
      Aktif: input.Aktif !== false,
    };
    customers.push(row);
    return row;
  },

  async updateCustomer(id, input) {
    const row = customers.find((c) => c.ID_Customer === id);
    if (!row) throw new RepoError("CUSTOMER_NOT_FOUND", "Customer tidak ditemukan.");
    if (input.Nama_Customer !== undefined && !String(input.Nama_Customer).trim()) {
      throw new RepoError("VALIDATION_ERROR", "Nama customer wajib diisi.");
    }
    if (input.Email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.Email)) {
      throw new RepoError("VALIDATION_ERROR", "Format email tidak valid.");
    }
    if (input.Nama_Customer !== undefined) row.Nama_Customer = String(input.Nama_Customer).trim();
    if (input.No_HP !== undefined) row.No_HP = String(input.No_HP).trim();
    if (input.Email !== undefined) row.Email = String(input.Email).trim();
    if (input.Kategori_Pelanggan !== undefined) row.Kategori_Pelanggan = String(input.Kategori_Pelanggan).trim();
    if (input.Alamat !== undefined) row.Alamat = String(input.Alamat).trim();
    if (input.Catatan !== undefined) row.Catatan = String(input.Catatan).trim();
    if (input.Aktif !== undefined) row.Aktif = !!input.Aktif;
    return row;
  },

  // ---------- Supplier — PRD section 23-25 ----------
  async listSuppliers({ page, limit, search } = {}) {
    const filtered = suppliers.filter((s) =>
      matchesSearch(s, ["Nama_Supplier", "No_HP", "Email"], search)
    );
    return paginate(filtered, { page, limit });
  },

  async getSupplier(id) {
    const row = suppliers.find((s) => s.ID_Supplier === id);
    if (!row) throw new RepoError("SUPPLIER_NOT_FOUND", "Supplier tidak ditemukan.");
    return row;
  },

  async createSupplier(input) {
    if (!input.Nama_Supplier || !String(input.Nama_Supplier).trim()) {
      throw new RepoError("VALIDATION_ERROR", "Nama supplier wajib diisi.");
    }
    if (input.Email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.Email)) {
      throw new RepoError("VALIDATION_ERROR", "Format email tidak valid.");
    }
    const row = {
      ID_Supplier: nextId("SUP", suppliers, "ID_Supplier"),
      Nama_Supplier: String(input.Nama_Supplier).trim(),
      No_HP: input.No_HP ? String(input.No_HP).trim() : "",
      Email: input.Email ? String(input.Email).trim() : "",
      Alamat: input.Alamat ? String(input.Alamat).trim() : "",
      Catatan: input.Catatan ? String(input.Catatan).trim() : "",
      Aktif: input.Aktif !== false,
    };
    suppliers.push(row);
    return row;
  },

  async updateSupplier(id, input) {
    const row = suppliers.find((s) => s.ID_Supplier === id);
    if (!row) throw new RepoError("SUPPLIER_NOT_FOUND", "Supplier tidak ditemukan.");
    if (input.Nama_Supplier !== undefined && !String(input.Nama_Supplier).trim()) {
      throw new RepoError("VALIDATION_ERROR", "Nama supplier wajib diisi.");
    }
    if (input.Email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.Email)) {
      throw new RepoError("VALIDATION_ERROR", "Format email tidak valid.");
    }
    if (input.Nama_Supplier !== undefined) row.Nama_Supplier = String(input.Nama_Supplier).trim();
    if (input.No_HP !== undefined) row.No_HP = String(input.No_HP).trim();
    if (input.Email !== undefined) row.Email = String(input.Email).trim();
    if (input.Alamat !== undefined) row.Alamat = String(input.Alamat).trim();
    if (input.Catatan !== undefined) row.Catatan = String(input.Catatan).trim();
    if (input.Aktif !== undefined) row.Aktif = !!input.Aktif;
    return row;
  },

  // ---------- Penjualan / Detail_Penjualan — PRD section 31-38 ----------

  async listSales({ page, limit, search } = {}) {
    const enriched = sales.map((s) => ({
      ...s,
      Nama_Customer: customers.find((c) => c.ID_Customer === s.ID_Customer)?.Nama_Customer || "-",
    }));
    // urutan terbaru dulu, memudahkan kasir melihat transaksi barusan (PRD section 31)
    enriched.sort((a, b) => (a.Created_At < b.Created_At ? 1 : -1));
    const filtered = enriched.filter((s) => matchesSearch(s, ["ID_Trx", "Nama_Customer"], search));
    return paginate(filtered, { page, limit });
  },

  async getSale(id) {
    const row = sales.find((s) => s.ID_Trx === id);
    if (!row) throw new RepoError("SALE_NOT_FOUND", "Transaksi tidak ditemukan.");
    const customer = customers.find((c) => c.ID_Customer === row.ID_Customer) || null;
    const items = saleDetails
      .filter((d) => d.ID_Trx === id)
      .map((d) => ({
        ...d,
        Nama_Barang: products.find((p) => p.ID_Barang === d.ID_Barang)?.Nama_Barang || d.ID_Barang,
      }));
    return { ...row, Nama_Customer: customer?.Nama_Customer || "-", Items: items };
  },

  /**
   * Alur (PRD section 34-35): pilih customer -> baca kategori -> untuk tiap
   * item ambil harga default sesuai kategori -> boleh override jika
   * Boleh_Edit_Harga true -> hitung subtotal & total -> kurangi stok.
   *
   * Seluruh validasi dilakukan SEBELUM ada perubahan apapun ke data (products/
   * sales/saleDetails), supaya tidak ada kondisi "Penjualan tersimpan tapi
   * Detail gagal" (PRD section 51 — transaction integrity).
   */
  async createSale(input) {
    const customer = customers.find((c) => c.ID_Customer === input.ID_Customer);
    if (!customer) throw new RepoError("VALIDATION_ERROR", "Customer tidak valid.");
    if (!customer.Aktif) throw new RepoError("VALIDATION_ERROR", "Customer tidak aktif.");

    const rawItems = Array.isArray(input.Items) ? input.Items : [];
    if (rawItems.length === 0) {
      throw new RepoError("VALIDATION_ERROR", "Transaksi harus memiliki minimal 1 barang.");
    }

    const statusOptions = ["Lunas", "Belum Lunas", "Sebagian"];
    const status = input.Status_Bayar || "Lunas";
    if (!statusOptions.includes(status)) {
      throw new RepoError("VALIDATION_ERROR", "Status pembayaran tidak valid.");
    }
    const metode = input.Metode_Bayar || "Cash";
    if (!String(metode).trim()) {
      throw new RepoError("VALIDATION_ERROR", "Metode pembayaran wajib diisi.");
    }

    // Tahap 1: validasi + hitung tiap baris, TANPA menulis apapun dulu.
    const resolvedItems = [];
    for (const raw of rawItems) {
      const product = products.find((p) => p.ID_Barang === raw.ID_Barang);
      if (!product) throw new RepoError("VALIDATION_ERROR", "Barang tidak valid.");
      if (!product.Aktif) {
        throw new RepoError("VALIDATION_ERROR", `${product.Nama_Barang} sudah nonaktif dan tidak bisa dijual.`);
      }

      const qty = Number(raw.Qty);
      if (!Number.isFinite(qty) || qty <= 0) {
        throw new RepoError("VALIDATION_ERROR", `Qty untuk ${product.Nama_Barang} harus lebih dari 0.`);
      }

      // Stok saat ini = Stok Awal + Stok Masuk - Penjualan + Adjustment (PRD
      // section 41). Menggantikan proxy Stok_Awal yang dipakai di Phase 3.
      const stokSaatIni = computeCurrentStock(product.ID_Barang);
      if (stokSaatIni < qty) {
        throw new RepoError(
          "INSUFFICIENT_STOCK",
          `Stok ${product.Nama_Barang} tidak cukup (tersisa ${stokSaatIni}).`
        );
      }

      const priceRow = prices.find(
        (p) => p.ID_Barang === product.ID_Barang && p.Kategori_Pelanggan === customer.Kategori_Pelanggan && p.Aktif
      );
      if (!priceRow) {
        throw new RepoError(
          "PRICE_NOT_FOUND",
          `Harga ${product.Nama_Barang} untuk kategori ${customer.Kategori_Pelanggan} belum diatur.`
        );
      }

      let hargaSatuan = priceRow.Harga_Default;
      const overrideSent = raw.Harga_Satuan !== undefined && raw.Harga_Satuan !== null && raw.Harga_Satuan !== "";
      if (overrideSent) {
        if (!priceRow.Boleh_Edit_Harga) {
          throw new RepoError(
            "VALIDATION_ERROR",
            `Harga ${product.Nama_Barang} tidak boleh diubah manual.`
          );
        }
        const overrideVal = Number(raw.Harga_Satuan);
        if (isNaN(overrideVal) || overrideVal < 0) {
          throw new RepoError("VALIDATION_ERROR", `Harga manual untuk ${product.Nama_Barang} tidak valid.`);
        }
        hargaSatuan = overrideVal;
      }

      resolvedItems.push({
        product,
        qty,
        hargaSatuan,
        subtotal: qty * hargaSatuan,
        kategori: customer.Kategori_Pelanggan,
      });
    }

    // Gabungkan qty untuk barang yang sama supaya stok berkurang benar
    // walau dikirim sebagai baris terpisah dari frontend.
    const stockNeeded = new Map();
    for (const item of resolvedItems) {
      stockNeeded.set(item.product.ID_Barang, (stockNeeded.get(item.product.ID_Barang) || 0) + item.qty);
    }
    for (const [productId, qtyNeeded] of stockNeeded) {
      const product = products.find((p) => p.ID_Barang === productId);
      const stokSaatIni = computeCurrentStock(productId);
      if (stokSaatIni < qtyNeeded) {
        throw new RepoError(
          "INSUFFICIENT_STOCK",
          `Stok ${product.Nama_Barang} tidak cukup (tersisa ${stokSaatIni}, dibutuhkan ${qtyNeeded}).`
        );
      }
    }

    // Tahap 2: semua valid, baru tulis Penjualan + Detail_Penjualan + kurangi stok.
    const now = new Date().toISOString();
    const total = resolvedItems.reduce((sum, item) => sum + item.subtotal, 0);
    const saleRow = {
      ID_Trx: nextId("TRX", sales, "ID_Trx", 4),
      Tanggal: todayStr(),
      ID_Customer: customer.ID_Customer,
      Total: total,
      Status_Bayar: status,
      Metode_Bayar: String(metode).trim(),
      Catatan: input.Catatan ? String(input.Catatan).trim() : "",
      Created_At: now,
      Updated_At: now,
    };
    sales.push(saleRow);

    const detailRows = [];
    for (const item of resolvedItems) {
      const detailRow = {
        ID_Detail: nextId("DTL", saleDetails, "ID_Detail", 4),
        ID_Trx: saleRow.ID_Trx,
        ID_Barang: item.product.ID_Barang,
        Kategori_Pelanggan: item.kategori,
        Qty: item.qty,
        Harga_Satuan: item.hargaSatuan,
        Subtotal: item.subtotal,
      };
      saleDetails.push(detailRow);
      detailRows.push({ ...detailRow, Nama_Barang: item.product.Nama_Barang });
    }

    // Stok berkurang otomatis setelah penjualan (PRD section 76 — Definition of
    // Done) — sejak Phase 4, ini terjadi secara implisit karena Stok Saat Ini
    // dihitung dari Stok Awal + Stok Masuk - Penjualan + Adjustment (section 41).
    // Master_Barang.Stok_Awal sendiri TIDAK diubah (section 42 — tidak mengedit
    // histori stok), Detail_Penjualan yang baru saja ditulis di atas sudah
    // cukup sebagai sumber pengurangan; stockNeeded di sini hanya dipakai untuk
    // validasi tahap 1.

    return { ...saleRow, Nama_Customer: customer.Nama_Customer, Items: detailRows };
  },

  // ---------- Stok — PRD section 26-30, 39-43 ----------

  /** GET /api/inventory — Stok Saat Ini per barang, dengan rincian sumbernya. */
  async listInventory({ page, limit, search } = {}) {
    const filtered = products.filter((p) =>
      matchesSearch(p, ["Nama_Barang", "Barcode", "ID_Barang"], search)
    );
    const enriched = filtered.map((p) => ({
      ID_Barang: p.ID_Barang,
      Nama_Barang: p.Nama_Barang,
      Aktif: p.Aktif,
      Stok_Awal: p.Stok_Awal,
      Total_Stok_Masuk: totalStokMasuk(p.ID_Barang),
      Total_Penjualan: totalPenjualan(p.ID_Barang),
      Total_Adjustment: totalAdjustment(p.ID_Barang),
      Stok_Saat_Ini: computeCurrentStock(p.ID_Barang),
    }));
    // barang tanpa stok dulu, memudahkan kasir/gudang melihat apa yang perlu direstok
    enriched.sort((a, b) => a.Stok_Saat_Ini - b.Stok_Saat_Ini);
    return paginate(enriched, { page, limit });
  },

  /**
   * GET /api/inventory/movements — gabungan Stok_Masuk (IN) & Stock_Adjustment
   * (ADJUSTMENT), terbaru dulu (PRD section 43 — arsitektur stock movement,
   * V1 cukup tipe IN/OUT/ADJUSTMENT; OUT sudah tercakup lewat modul Penjualan
   * sendiri jadi tidak diduplikasi di sini).
   */
  async listInventoryMovements({ page, limit, search, ID_Barang } = {}) {
    const inRows = stockMasuk.map((m) => {
      const product = products.find((p) => p.ID_Barang === m.ID_Barang);
      const supplier = suppliers.find((s) => s.ID_Supplier === m.ID_Supplier);
      return {
        ID: m.ID_Stok_Masuk,
        Type: "IN",
        Tanggal: m.Tanggal,
        ID_Barang: m.ID_Barang,
        Nama_Barang: product?.Nama_Barang || m.ID_Barang,
        Qty: m.Qty_Dus_Masuk,
        Nama_Supplier: supplier?.Nama_Supplier || "-",
        Harga_Beli: m.Harga_Beli,
        Catatan: m.Catatan,
        Created_At: m.Created_At,
      };
    });
    const adjRows = stockAdjustments.map((a) => {
      const product = products.find((p) => p.ID_Barang === a.ID_Barang);
      return {
        ID: a.ID_Adjustment,
        Type: "ADJUSTMENT",
        Tanggal: a.Tanggal,
        ID_Barang: a.ID_Barang,
        Nama_Barang: product?.Nama_Barang || a.ID_Barang,
        Qty: a.Qty_Penyesuaian,
        Alasan: a.Alasan,
        Created_At: a.Created_At,
      };
    });
    let all = [...inRows, ...adjRows];
    if (ID_Barang) all = all.filter((r) => r.ID_Barang === ID_Barang);
    all.sort((a, b) => (a.Created_At < b.Created_At ? 1 : -1));
    const filtered = all.filter((r) => matchesSearch(r, ["Nama_Barang", "ID"], search));
    return paginate(filtered, { page, limit });
  },

  /**
   * POST /api/inventory/in — Stok Masuk (PRD section 28-30).
   * Supplier WAJIB dipilih dari master Supplier (section 29 — tidak mengetik
   * bebas). Harga_Beli opsional, tersimpan sebagai histori (section 30):
   * perubahan harga beli supplier nanti tidak mengubah baris ini.
   */
  async createStockIn(input) {
    const product = products.find((p) => p.ID_Barang === input.ID_Barang);
    if (!product) throw new RepoError("VALIDATION_ERROR", "Barang tidak valid.");
    if (!product.Aktif) {
      throw new RepoError("VALIDATION_ERROR", `${product.Nama_Barang} sudah nonaktif.`);
    }

    const supplier = suppliers.find((s) => s.ID_Supplier === input.ID_Supplier);
    if (!supplier) throw new RepoError("VALIDATION_ERROR", "Supplier tidak valid.");
    if (!supplier.Aktif) {
      throw new RepoError("VALIDATION_ERROR", `${supplier.Nama_Supplier} sudah nonaktif.`);
    }

    const qty = Number(input.Qty_Dus_Masuk);
    if (!Number.isFinite(qty) || qty <= 0) {
      throw new RepoError("VALIDATION_ERROR", "Qty stok masuk harus lebih dari 0.");
    }

    let hargaBeli = null;
    const hargaSent = input.Harga_Beli !== undefined && input.Harga_Beli !== null && input.Harga_Beli !== "";
    if (hargaSent) {
      hargaBeli = Number(input.Harga_Beli);
      if (isNaN(hargaBeli) || hargaBeli < 0) {
        throw new RepoError("VALIDATION_ERROR", "Harga beli tidak boleh kurang dari 0.");
      }
    }

    const now = new Date().toISOString();
    const tanggal = /^\d{4}-\d{2}-\d{2}$/.test(input.Tanggal || "") ? input.Tanggal : todayStr();
    const row = {
      ID_Stok_Masuk: nextId("MSK", stockMasuk, "ID_Stok_Masuk", 4),
      Tanggal: tanggal,
      ID_Barang: product.ID_Barang,
      Qty_Dus_Masuk: qty,
      ID_Supplier: supplier.ID_Supplier,
      Harga_Beli: hargaBeli,
      Catatan: input.Catatan ? String(input.Catatan).trim() : "",
      Created_At: now,
    };
    stockMasuk.push(row);

    return {
      ...row,
      Nama_Barang: product.Nama_Barang,
      Nama_Supplier: supplier.Nama_Supplier,
      Stok_Saat_Ini: computeCurrentStock(product.ID_Barang),
    };
  },

  /**
   * POST /api/inventory/adjustment — Stock Adjustment (PRD section 39-40).
   * Qty boleh + (stok fisik lebih banyak) atau - (barang rusak/hilang).
   * Alasan wajib dicatat (section 40) supaya histori tetap bisa ditelusuri
   * (section 42) — bukan dipakai untuk menimpa stok master secara diam-diam.
   */
  async createStockAdjustment(input) {
    const product = products.find((p) => p.ID_Barang === input.ID_Barang);
    if (!product) throw new RepoError("VALIDATION_ERROR", "Barang tidak valid.");
    if (!product.Aktif) {
      throw new RepoError("VALIDATION_ERROR", `${product.Nama_Barang} sudah nonaktif.`);
    }

    const qty = Number(input.Qty_Penyesuaian);
    if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty === 0) {
      throw new RepoError("VALIDATION_ERROR", "Qty penyesuaian harus bilangan bulat dan tidak boleh 0.");
    }

    if (!input.Alasan || !String(input.Alasan).trim()) {
      throw new RepoError("VALIDATION_ERROR", "Alasan penyesuaian wajib diisi.");
    }

    const stokSetelah = computeCurrentStock(product.ID_Barang) + qty;
    if (stokSetelah < 0) {
      throw new RepoError(
        "VALIDATION_ERROR",
        `Penyesuaian ini membuat stok ${product.Nama_Barang} menjadi negatif (${stokSetelah}).`
      );
    }

    const now = new Date().toISOString();
    const tanggal = /^\d{4}-\d{2}-\d{2}$/.test(input.Tanggal || "") ? input.Tanggal : todayStr();
    const row = {
      ID_Adjustment: nextId("ADJ", stockAdjustments, "ID_Adjustment", 4),
      Tanggal: tanggal,
      ID_Barang: product.ID_Barang,
      Qty_Penyesuaian: qty,
      Alasan: String(input.Alasan).trim(),
      Created_At: now,
    };
    stockAdjustments.push(row);

    return { ...row, Nama_Barang: product.Nama_Barang, Stok_Saat_Ini: computeCurrentStock(product.ID_Barang) };
  },
};

export { RepoError };
