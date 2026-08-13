# Zensheet — Toko Grosir SIHOMBING

Sistem Inventory, Sales, Customer & Supplier Management.

**Stack:** Vanilla HTML/CSS/JS · Cloudflare Pages · Pages Functions · Google Sheets (V1) → Supabase PostgreSQL (Future)

Sesuai `docs/PRD.md`. Dibangun **bertahap** mengikuti Development Phase di PRD (section 69):

- [x] **Phase 1 — Foundation**: struktur folder, base UI (sidebar + mobile nav), API layer, repository abstraction, dashboard skeleton.
- [x] **Phase 2 — Master Data**: modul Barang (CRUD + barcode optional/duplicate), Harga per kategori pelanggan + manual override, Customer (CRUD, email optional), Supplier (CRUD, email optional). Search + pagination server-side untuk ketiganya.
- [x] **Phase 3 — Sales**: transaksi multi-item, pilih customer -> harga otomatis dari kategori, manual override (khusus barang `Boleh_Edit_Harga`), total, status & metode bayar, stok berkurang otomatis. Search + pagination server-side.
- [x] **Phase 4 — Inventory**: modul Stok Masuk (barang + supplier dari master, Harga_Beli sebagai histori), Stock Adjustment (qty +/- dengan alasan wajib), dan Stok Saat Ini yang sesungguhnya = Stok Awal + Stok Masuk − Penjualan + Adjustment (menggantikan proxy `Stok_Awal` yang dipakai sementara di Phase 3). Dashboard & validasi stok transaksi sudah memakai formula ini.
- [x] **Phase 5 — Barcode**: komponen scanner kamera (`components/scanner.js`) dengan fallback berlapis, lookup barcode exact-match di backend (`GET /api/products?barcode=`), dan penanganan 3 kondisi scan (section 13) terpasang di Barang, Penjualan, Stok Masuk, dan Penyesuaian Stok.
- [x] **Phase 6 — Dashboard**: `GET /api/dashboard/summary` dilengkapi `penjualanPeriode` (PRD section 44) — total & jumlah transaksi untuk rentang tanggal, default 7 hari terakhir kalau tidak diberi `from`/`to`, validasi kalau rentang tidak lengkap/tidak valid/terbalik. UI Dashboard dapat preset cepat (Hari Ini/7 Hari/30 Hari/Bulan Ini) + rentang tanggal custom di kartu Penjualan.
- [x] **Phase 7 — Documents**: Nota/Struk (`pages/print-nota.html`) & Kwitansi (`pages/print-kwitansi.html`) — dokumen print-friendly standalone (PRD section 55), dibuka dari tombol "🖨️ Cetak" di daftar Penjualan atau "🖨️ Cetak Nota" / "🧾 Cetak Kwitansi" di modal Detail Transaksi. Tidak ada endpoint baru — keduanya reuse `GET /api/sales/:id` yang sudah ada sejak Phase 3. V1 fokus ke Cetak/Simpan PDF lewat dialog print browser (PRD section 54); kirim email masih Future.
- [x] **Phase 8 — Branding & PWA**: favicon + ikon app diambil dari logo Toko Sihombing (`assets/icons/`), `manifest.webmanifest` (installable, `display: standalone`), `sw.js` (Service Worker — cache-first untuk aset statis, network-first untuk halaman, `/api/...` tidak pernah di-cache), dan popup custom "Pasang Aplikasi" (`assets/js/components/installPrompt.js`) yang menangkap `beforeinstallprompt` di Chrome/Edge/Android serta instruksi manual "Add to Home Screen" untuk iOS Safari (yang tidak mendukung `beforeinstallprompt`). Terpasang otomatis di semua halaman ber-shell lewat `renderShell()` (`core/shell.js`); halaman cetak (Nota/Kwitansi) cuma dapat favicon, tanpa banner/SW supaya tidak mengganggu alur print.
- [ ] Phase 9 — Reports

## Menjalankan secara lokal

Project ini adalah Cloudflare Pages + Pages Functions app. Untuk development lokal:

```bash
npm install -g wrangler
cd zensheet
wrangler pages dev . --compatibility-date=2024-01-01
```

Buka `http://localhost:8788`.

Tanpa `wrangler`, kamu tetap bisa membuka file HTML di `pages/` langsung di browser untuk melihat UI, tapi panggilan ke `/api/...` hanya akan berfungsi lewat `wrangler pages dev` (karena itu yang menjalankan Pages Functions di `functions/`).

## Status backend saat ini (Phase 1 + 2 + 3 + 4)

Semua endpoint memakai **repository abstraction** (lihat `functions/repositories/mockRepository.js`), sesuai PRD section 63. Saat ini yang aktif adalah `MockRepository` (data di memori) supaya UI bisa langsung dicoba tanpa setup Google Sheets dulu.

**Endpoint yang sudah jalan (Phase 2):**
- `GET/POST /api/products`, `GET/PUT /api/products/:id`
- `GET/PUT /api/products/:id/prices` — harga per kategori pelanggan + manual override
- `GET/POST /api/customers`, `GET/PUT /api/customers/:id`
- `GET/POST /api/suppliers`, `GET/PUT /api/suppliers/:id`
- `GET /api/dashboard/summary`

**Endpoint yang sudah jalan (Phase 3):**
- `GET /api/sales?search=&page=&limit=` — daftar transaksi (search ID transaksi & nama customer, terbaru dulu)
- `POST /api/sales` — buat transaksi baru (lihat contoh payload di `functions/api/sales/index.js`)
- `GET /api/sales/:id` — detail transaksi + daftar item

**Endpoint yang sudah jalan (Phase 4):**
- `GET /api/inventory?search=&page=&limit=` — Stok Saat Ini per barang (Stok_Awal, Total_Stok_Masuk, Total_Penjualan, Total_Adjustment, Stok_Saat_Ini), diurutkan stok paling rendah dulu
- `GET /api/inventory/movements?search=&page=&limit=&ID_Barang=` — riwayat gabungan Stok Masuk & Adjustment, terbaru dulu
- `POST /api/inventory/in` — catat Stok Masuk (barang + supplier wajib dari master, Harga_Beli opsional sebagai histori) — lihat contoh payload di `functions/api/inventory/in.js`
- `POST /api/inventory/adjustment` — catat Stock Adjustment (qty +/-, alasan wajib) — lihat contoh payload di `functions/api/inventory/adjustment.js`

**Endpoint yang sudah jalan (Phase 5):**
- `GET /api/products?barcode=...` — exact match (bukan substring seperti `?search=`), bisa mengembalikan 0, 1, atau beberapa baris karena barcode sengaja tidak unik (PRD section 12). Route sama dengan Phase 2 (`/api/products`), cuma param baru — tidak ada route baru.

**Barcode & scanner (Phase 5):**
- `assets/js/components/scanner.js` — `openScanner({ onResult })` membuka modal kamera + input manual, memanggil `onResult(barcode)` sekali saat dapat kode. `scanProduct({ onFound, onNotFound, onMultiple, filterAktif })` membungkusnya sekaligus query `GET /api/products?barcode=` dan menerapkan kontrak 3 kondisi PRD section 13 (0 hasil -> toast + arahkan manual, 1 hasil -> langsung pilih, 2+ hasil -> daftar pilihan).
- Kamera progresif: coba `BarcodeDetector` native dulu (Chrome/Edge/Android, zero-dependency) → fallback lazy-load [`@zxing/browser`](https://github.com/zxing-js/browser) dari CDN (`esm.sh`) khusus untuk browser yang belum dukung native detector (Safari/Firefox) → kalau kamera sama sekali tidak tersedia (izin ditolak/HTTP non-secure/tidak ada kamera), input manual di modal yang sama tetap berfungsi penuh. Tidak ada dependency baru di `package.json` karena library kamera cuma dimuat saat tombol scan benar-benar diklik.
- Terpasang di: **Barang** (tombol "📷 Scan" di header — cari barang nonaktif pun ikut supaya bisa diedit; hasil scan langsung membuka form edit), **Penjualan** (tombol scan di sebelah kotak "Tambah Barang", aktif setelah customer dipilih; hasil scan langsung masuk keranjang), **Stok Masuk** & **Penyesuaian Stok** (tombol scan di picker Barang; hasil scan langsung dipilih seperti klik hasil pencarian).
- Barang nonaktif difilter dari hasil scan di Penjualan/Stok Masuk/Penyesuaian (`filterAktif: true`, default) — konsisten dengan validasi backend yang sudah ada sejak Phase 3-4 (barang nonaktif tidak boleh masuk transaksi/stok masuk).

**Endpoint yang sudah jalan (Phase 6):**
- `GET /api/dashboard/summary?from=YYYY-MM-DD&to=YYYY-MM-DD` — sama seperti sebelumnya, cuma param baru `from`/`to` (opsional, keduanya wajib bersamaan) untuk `penjualanPeriode` (PRD section 44). Tidak diberi -> default 7 hari terakhir termasuk hari ini. `from` > `to` atau format tanggal tidak valid -> `VALIDATION_ERROR` (400).

Semua sudah diuji end-to-end (lihat `functions/repositories/mockRepository.js` untuk business logic; dites manual lewat skrip Node yang memanggil repository & handler API langsung) — validasi backend (nama wajib, email format, harga ≥ 0), barcode kosong & duplicate tetap valid, ID auto-generate (`BRG-XXX`, `CUST-XXX`, `SUP-XXX`, `HRG-XXXX`, `TRX-XXXX`, `DTL-XXXX`, `MSK-XXXX`, `ADJ-XXXX`).

**Business rules Sales (Phase 3) yang sudah tervalidasi:**
- Harga otomatis mengikuti `Kategori_Pelanggan` customer yang dipilih (PRD section 16, 35).
- Override harga manual **hanya** diterima backend jika `Boleh_Edit_Harga = true` pada barang tsb — override pada barang lain ditolak dengan `VALIDATION_ERROR`, walau dikirim dari client (PRD section 17-19).
- Qty tervalidasi `> 0`, dan tidak boleh melebihi **Stok Saat Ini** (`INSUFFICIENT_STOCK`) — sejak Phase 4 dihitung dari Stok Awal + Stok Masuk − Penjualan + Adjustment (PRD section 41), bukan lagi proxy `Master_Barang.Stok_Awal` seperti di Phase 3.
- Kategori tanpa baris harga aktif ditolak dengan `PRICE_NOT_FOUND`, bukan fallback diam-diam ke 0.
- Semua item divalidasi dulu sebelum satupun baris ditulis (Penjualan, Detail_Penjualan, pengurangan stok) — mencegah kondisi "Penjualan tersimpan tapi Detail gagal" (PRD section 51).
- Harga final tersimpan di `Detail_Penjualan.Harga_Satuan`; perubahan `Harga_Default` di kemudian hari tidak mengubah histori transaksi lama (PRD section 19).

**Business rules Inventory (Phase 4) yang sudah tervalidasi:**
- Stok Saat Ini = Stok Awal + Total Stok Masuk − Total Penjualan + Total Adjustment (PRD section 41), dihitung on-the-fly dari histori — `Master_Barang.Stok_Awal` sendiri **tidak pernah diubah** oleh penjualan, stok masuk, atau adjustment (PRD section 27, 42 — tidak mengedit histori stok).
- Stok Masuk wajib memilih Barang & Supplier yang valid dan aktif dari master (PRD section 29 — tidak mengetik nama supplier bebas); `Qty_Dus_Masuk > 0`; `Harga_Beli` opsional, tersimpan sebagai histori dan tidak berubah jika harga beli supplier berubah di kemudian hari (PRD section 30).
- Stock Adjustment wajib mengisi `Alasan` (PRD section 40); qty boleh positif (stok fisik lebih banyak) atau negatif (rusak/hilang), tapi ditolak (`VALIDATION_ERROR`) jika membuat Stok Saat Ini menjadi negatif.
- Dashboard (Total Stok, Stok Rendah, Stok Habis) dan validasi stok Sales sudah memakai Stok Saat Ini yang sesungguhnya, bukan proxy lagi.

⚠️ **Catatan:** `MockRepository` menyimpan data di memori proses Worker — cocok untuk development, tapi **belum persisten** di Cloudflare edge yang sesungguhnya (tiap isolate bisa punya salinan sendiri). Saat modul Barcode/Documents/Reports selesai, kita pasang `GoogleSheetsRepository` yang sesungguhnya (butuh **Google Service Account credentials** disimpan sebagai Cloudflare secret — **bukan** di kode/frontend, sesuai PRD section 61). Frontend dan kontrak `/api/...` tidak berubah saat adapter ini diganti — itulah tujuan abstraction layer ini (PRD section 78).

## Struktur folder

Mengikuti PRD section 67 persis — lihat `docs/PRD.md`.

## Selanjutnya

Bilang "lanjut" untuk mulai **Phase 9 — Reports**: laporan penjualan, inventory, purchases (stok masuk), dan histori per customer, di atas data yang sudah lengkap dari Phase 1-8.

## PWA & Branding (Phase 8)

- **Ikon:** `assets/icons/` — di-generate dari `Logo_Toko_Sihombing.webp` (favicon.ico 16/32/48, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png` 180×180, `icon-192.png`/`icon-512.png` untuk manifest, plus versi `icon-maskable-*` dengan padding ekstra supaya aman dipotong bulat/rounded oleh Android). Semua halaman (`index.html`, `pages/*.html`) sudah punya tag `<link rel="icon">` & `<link rel="apple-touch-icon">` di `<head>`.
- **Manifest:** `manifest.webmanifest` di root — `name`/`short_name`, `start_url: /pages/dashboard.html`, `display: standalone`, `theme_color: #001546` (navy, diambil dari logo), `background_color` menyamai `--color-bg`. Dilink dari semua halaman ber-shell + `index.html`.
- **Service Worker:** `sw.js` di root (scope `/`) — precache app-shell dasar saat `install`, hapus cache versi lama saat `activate`. Strategi `fetch`: aset statis (`css/js/png/ico/woff`) *cache-first* dengan update di background; halaman HTML *network-first* dengan fallback ke cache/`dashboard.html` saat offline; `/api/...` **tidak pernah** disentuh SW (selalu langsung ke network) supaya stok/harga/status transaksi tidak pernah basi karena cache.
- **Popup instal:** `assets/js/components/installPrompt.js` (dipanggil dari `renderShell()` di `core/shell.js`, jadi otomatis aktif di semua halaman ber-shell — Dashboard, Penjualan, Stok, Barang, Customer, Supplier, Laporan):
  - Chrome/Edge/Android: `beforeinstallprompt` ditangkap & `preventDefault()`, lalu ditampilkan sebagai banner custom (bukan dialog native langsung) dengan tombol "Pasang" yang baru memanggil `prompt()` bawaan browser saat diklik.
  - iOS Safari: karena `beforeinstallprompt` tidak pernah terkirim di iOS, ditampilkan banner instruksi manual ("Ketuk Bagikan → Add to Home Screen").
  - Banner ditutup permanen 14 hari kalau user menekan ✕ (disimpan di `localStorage`), dan tidak muncul lagi kalau app sudah ter-install (`appinstalled` event / `display-mode: standalone`).
  - `core/pwa.js` yang mendaftarkan `sw.js` (`navigator.serviceWorker.register`), dipanggil dari tempat yang sama.
- Halaman cetak (`print-nota.html`, `print-kwitansi.html`) sengaja **hanya** dapat favicon — tidak load manifest/SW/banner instal, supaya halaman cetak tetap bersih (PRD section 55) dan tidak ada elemen mengambang saat print/Save as PDF.

## Dokumen (Phase 7)

- `pages/print-nota.html?id=TRX-XXXX` — Nota/Struk: rincian barang, qty, harga, subtotal, total, status pembayaran (PRD section 55).
- `pages/print-kwitansi.html?id=TRX-XXXX` — Kwitansi: bukti terima pembayaran, jumlah dalam angka + terbilang (Bahasa Indonesia), area tanda tangan.
- Keduanya halaman standalone (tanpa sidebar/topbar) supaya hasil print/"Save as PDF" bersih — cuma dokumennya. Tombol "🖨️ Print / Simpan PDF" & "← Kembali" disembunyikan otomatis saat print (`.no-print`, lihat `assets/css/print.css`).
- Sumber data: `GET /api/sales/:id` (Phase 3) — tidak ada endpoint atau field baru di backend untuk Phase 7 ini.
