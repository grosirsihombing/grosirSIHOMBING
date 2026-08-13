> **PRD --- Zensheet Developer**
>
> **Toko Grosir SIHOMBING**
>
> **Inventory, Sales, Customer & Supplier Management System**
>
> **Versi:** 2.0\
> **Status:** Development Specification / Final Architecture\
> **Developer:** Zensheet\
> **Target:** Web Application\
> **Deployment:** Cloudflare Pages\
> **Repository:** GitHub\
> **Database V1:** Google Sheets\
> **Database Future:** Supabase PostgreSQL\
> **Frontend:** Vanilla HTML + CSS + JavaScript\
> **Backend:** Cloudflare Pages Functions\
> **Target pengguna:** Owner / Admin / Kasir
>
> **1. Ringkasan Produk**
>
> **Toko Grosir SIHOMBING** membutuhkan aplikasi web untuk mengelola
> operasional toko secara terpusat, meliputi:

-   Master barang

-   Barcode

-   Harga barang

-   Harga berdasarkan kategori pelanggan

-   Harga manual/override

-   Customer

-   Supplier

-   Stok awal

-   Stok masuk

-   Penjualan

-   Detail penjualan

-   Stock adjustment

-   Stok saat ini

-   Dashboard

-   Laporan

-   Nota/struk/kwitansi

-   Email customer/supplier

> Aplikasi harus sederhana untuk digunakan sehari-hari, tetapi memiliki
> arsitektur yang cukup baik untuk dikembangkan menjadi sistem yang
> lebih besar.
>
> **2. Tujuan Utama**
>
> **2.1 Tujuan bisnis**
>
> Aplikasi harus membantu toko:

1.  Mengetahui stok barang secara akurat.

2.  Mencatat barang masuk.

3.  Mencatat penjualan.

4.  Mengelola harga berdasarkan kategori customer.

5.  Mengakomodasi harga manual untuk komoditi tertentu.

6.  Mengelola customer.

7.  Mengelola supplier.

8.  Melihat histori transaksi.

9.  Mengurangi kesalahan pencatatan manual.

10. Menyediakan data yang dapat dikembangkan menjadi laporan.

> **3. Prinsip Utama Sistem**
>
> Sistem harus mengikuti prinsip:
>
> **Simple to use, structured internally, scalable when needed.**
>
> Artinya:

-   UI sederhana.

-   Tidak banyak menu yang tidak diperlukan.

-   Database terstruktur.

-   Business logic tidak diletakkan seluruhnya di frontend.

-   API dipisahkan dari UI.

-   Google Sheets hanya digunakan sebagai database awal.

-   Tidak ada ketergantungan permanen terhadap Google Sheets.

> **4. Arsitektur Teknologi**
>
> **V1**
>
> GitHub
>
> │
>
> ▼
>
> Cloudflare Pages
>
> │
>
> ├── Frontend
>
> │ ├── HTML
>
> │ ├── CSS
>
> │ └── Vanilla JavaScript
>
> │
>
> └── Pages Functions
>
> │
>
> ▼
>
> API Layer
>
> │
>
> ▼
>
> Google Sheets
>
> **Future**
>
> GitHub
>
> │
>
> ▼
>
> Cloudflare Pages
>
> │
>
> ├── Frontend
>
> │
>
> └── Pages Functions
>
> │
>
> ▼
>
> API Layer
>
> │
>
> ▼
>
> Supabase PostgreSQL
>
> **Prinsip penting**
>
> **Frontend tidak boleh membaca Google Sheets secara langsung.**
>
> Frontend hanya berkomunikasi dengan:
>
> /api/\...
>
> Dengan demikian database dapat diganti tanpa rewrite frontend.
>
> **5. Kenapa Tidak AppSheet**
>
> AppSheet tidak digunakan untuk aplikasi final karena:

-   memiliki biaya subscription untuk penggunaan operasional,

-   kurang fleksibel untuk kebutuhan khusus,

-   kontrol UI terbatas,

-   ketergantungan terhadap platform,

-   kurang ideal untuk arsitektur jangka panjang yang ingin dikembangkan
    > sendiri.

> Aplikasi ini harus menjadi **source code milik Zensheet/client**,
> bukan bergantung pada AppSheet.
>
> **6. Kenapa Tidak Next.js untuk V1**
>
> Next.js tidak diperlukan untuk kebutuhan V1.
>
> Vanilla JS sudah cukup untuk:

-   dashboard,

-   CRUD,

-   transaksi,

-   stok,

-   customer,

-   supplier,

-   laporan,

-   barcode,

-   responsive UI.

> Next.js dapat dipertimbangkan di masa depan jika kompleksitas frontend
> meningkat secara signifikan.
>
> **Pergantian framework frontend bukan bagian dari roadmap wajib.**
>
> **7. Target Platform**
>
> Aplikasi harus dapat digunakan melalui:

-   PC

-   Laptop

-   Tablet

-   Smartphone

> Browser modern:

-   Chrome

-   Edge

-   Safari

-   Firefox

> Prioritas:
>
> **Desktop + mobile responsive.**
>
> **8. Struktur Navigasi**
>
> Menu utama:
>
> Dashboard
>
> Penjualan
>
> Stok
>
> Barang
>
> Customer
>
> Supplier
>
> Laporan
>
> Menu sekunder:
>
> Stok Masuk
>
> Penyesuaian Stok
>
> Harga Barang
>
> Pengaturan
>
> Tidak perlu membuat menu Kasir terpisah apabila fungsinya sama dengan
> membuat transaksi melalui Penjualan.
>
> **Penjualan**
>
> View utama berbentuk **Table/List**.
>
> Tombol:
>
> \+ Transaksi Baru
>
> **9. Modul Master Barang**
>
> Route:
>
> /products
>
> Fitur:

-   daftar barang

-   tambah barang

-   edit barang

-   pencarian

-   barcode

-   tipe komoditi

-   harga

-   stok

-   status aktif/nonaktif

> **10. Struktur Master Barang**
>
> Sheet:
>
> **Master_Barang**

+----------------------+---------+-------------------------------------+
| > **Field**          | > **    | > **Keterangan**                    |
|                      | Wajib** |                                     |
+======================+=========+=====================================+
| > ID_Barang          | > Ya    | > Unique ID                         |
+----------------------+---------+-------------------------------------+
| > Barcode            | > Tidak | > Boleh kosong & duplicate          |
+----------------------+---------+-------------------------------------+
| > Nama_Barang        | > Ya    | > Nama produk                       |
+----------------------+---------+-------------------------------------+
| > Tipe_Komoditi      | > Ya    | > Kategori komoditi                 |
+----------------------+---------+-------------------------------------+
| > Stok_Awal          | > Ya    | > Stok awal                         |
+----------------------+---------+-------------------------------------+
| > Aktif              | > Ya    | > Status produk                     |
+----------------------+---------+-------------------------------------+

> **11. Aturan ID Barang**
>
> ID_Barang harus:

-   unique

-   permanen

-   tidak berubah

-   tidak menggunakan nama barang

-   tidak menggunakan barcode

> Contoh:
>
> BRG-001
>
> BRG-002
>
> BRG-003
>
> **12. Barcode**
>
> Barcode bersifat:
>
> **OPTIONAL**
>
> Artinya:
>
> Barcode = kosong
>
> harus tetap valid.
>
> Tidak boleh menghasilkan error.
>
> **Barcode juga tidak unique.**
>
> Hal ini diperlukan karena beberapa komoditi dapat memiliki barcode
> yang sama meskipun produknya berbeda.
>
> Contoh:
>
> Aqua Galon → 899123456
>
> Vit Galon → 899123456
>
> Galon Isi Ulang → kosong
>
> Semua valid.
>
> **13. Perilaku Barcode Scanner**
>
> **Kondisi 1 --- barcode tidak ditemukan**
>
> Scan
>
> ↓
>
> 0 hasil
>
> ↓
>
> \"Produk tidak ditemukan\"
>
> ↓
>
> Cari manual
>
> **Kondisi 2 --- satu produk**
>
> Scan
>
> ↓
>
> 1 produk
>
> ↓
>
> langsung pilih
>
> **Kondisi 3 --- duplicate barcode**
>
> Scan
>
> ↓
>
> 2+ produk
>
> ↓
>
> tampilkan daftar
>
> ↓
>
> user memilih produk
>
> Contoh:
>
> Barcode: 899123456
>
> Produk ditemukan:
>
> ○ Aqua Galon
>
> ○ Vit Galon
>
> \[Pilih\]
>
> **14. Modul Harga**
>
> Harga dipisahkan dari Master Barang.
>
> Sheet:
>
> **Harga_Barang**

+----------------------------------------+-----------------------------+
| > **Field**                            | > **Keterangan**            |
+========================================+=============================+
| > ID_Harga                             | > Unique                    |
+----------------------------------------+-----------------------------+
| > ID_Barang                            | > Relasi barang             |
+----------------------------------------+-----------------------------+
| > Kategori_Pelanggan                   | > Segment                   |
+----------------------------------------+-----------------------------+
| > Harga_Default                        | > Harga standar             |
+----------------------------------------+-----------------------------+
| > Boleh_Edit_Harga                     | > Boolean                   |
+----------------------------------------+-----------------------------+
| > Aktif                                | > Status                    |
+----------------------------------------+-----------------------------+

> **15. Segmentasi Harga**
>
> Sistem mendukung kategori:
>
> Retail
>
> Sub Agen
>
> User
>
> Tetapi kategori **tidak boleh hardcoded secara permanen**.
>
> Kategori dapat ditambah di masa depan.
>
> **16. Harga Default**
>
> Untuk barang normal:
>
> Aqua 1500 ml
>
> Retail Rp52.000
>
> Sub Agen Rp48.000
>
> User Rp45.000
>
> Ketika customer dipilih:
>
> Customer
>
> ↓
>
> Kategori Customer
>
> ↓
>
> Barang
>
> ↓
>
> Harga Default
>
> **17. Manual Price Override**
>
> Sistem **WAJIB mendukung harga manual**.
>
> Terutama untuk:
>
> **Galon Isi Ulang**
>
> Namun jangan hardcode:
>
> if product == \"Galon Isi Ulang\"
>
> Sebaliknya gunakan:
>
> Boleh_Edit_Harga = true
>
> Dengan demikian komoditi lain dapat menggunakan fitur yang sama.
>
> **18. Contoh Harga Manual**
>
> Master:
>
> Galon Isi Ulang
>
> Harga Default = Rp15.000
>
> Boleh_Edit_Harga = TRUE
>
> Saat transaksi:
>
> Harga default:
>
> Rp15.000
>
> Harga final:
>
> Rp17.000
>
> Harga transaksi menjadi:
>
> Rp17.000
>
> **19. Aturan Harga Transaksi**
>
> Harga yang digunakan dalam transaksi **harus disimpan pada Detail
> Penjualan**.
>
> Field:
>
> Harga_Satuan
>
> Contoh:
>
> Harga Master:
>
> 15.000
>
> Harga Transaksi:
>
> 17.000
>
> Histori transaksi menyimpan:
>
> 17.000
>
> Jika harga master kemudian berubah menjadi:
>
> 18.000
>
> transaksi lama **tetap 17.000**.
>
> **20. Modul Customer**
>
> Route:
>
> /customers
>
> Fitur:

-   daftar

-   tambah

-   edit

-   search

-   detail

-   histori transaksi

> **21. Struktur Customer**
>
> Sheet:
>
> **Customer**

+---------------------------------------------------+------------------+
| > **Field**                                       | > **Wajib**      |
+===================================================+==================+
| > ID_Customer                                     | > Ya             |
+---------------------------------------------------+------------------+
| > Nama_Customer                                   | > Ya             |
+---------------------------------------------------+------------------+
| > No_HP                                           | > Tidak          |
+---------------------------------------------------+------------------+
| > Email                                           | > Tidak          |
+---------------------------------------------------+------------------+
| > Kategori_Pelanggan                              | > Ya             |
+---------------------------------------------------+------------------+
| > Alamat                                          | > Tidak          |
+---------------------------------------------------+------------------+
| > Catatan                                         | > Tidak          |
+---------------------------------------------------+------------------+
| > Aktif                                           | > Ya             |
+---------------------------------------------------+------------------+

> **22. Email Customer**
>
> Email bersifat:
>
> **OPTIONAL**
>
> Customer tanpa email tetap valid.
>
> Email nantinya digunakan untuk:

-   nota

-   struk

-   kwitansi

-   invoice

-   informasi transaksi

> Tidak wajib dikirim otomatis pada V1.
>
> **23. Modul Supplier**
>
> Route:
>
> /suppliers
>
> Fitur:

-   daftar supplier

-   tambah

-   edit

-   search

-   detail

-   histori stok masuk

> **24. Struktur Supplier**
>
> Sheet:
>
> **Supplier**

+------------------------------------------------+---------------------+
| > **Field**                                    | > **Wajib**         |
+================================================+=====================+
| > ID_Supplier                                  | > Ya                |
+------------------------------------------------+---------------------+
| > Nama_Supplier                                | > Ya                |
+------------------------------------------------+---------------------+
| > No_HP                                        | > Tidak             |
+------------------------------------------------+---------------------+
| > Email                                        | > Tidak             |
+------------------------------------------------+---------------------+
| > Alamat                                       | > Tidak             |
+------------------------------------------------+---------------------+
| > Catatan                                      | > Tidak             |
+------------------------------------------------+---------------------+
| > Aktif                                        | > Ya                |
+------------------------------------------------+---------------------+

> **25. Email Supplier**
>
> Email bersifat optional.
>
> Tujuan future:

-   invoice pembelian

-   dokumen pembelian

-   nota

-   komunikasi administrasi

> **26. Modul Stok**
>
> Stok menggunakan konsep:
>
> **Stock Movement**
>
> Stok tidak boleh hanya berupa angka yang ditimpa secara manual.
>
> Sumber perubahan:
>
> STOK AWAL
>
> \+
>
> STOK MASUK
>
> \-
>
> PENJUALAN
>
> \+
>
> ADJUSTMENT
>
> =
>
> STOK SAAT INI
>
> **27. Stok Awal**
>
> Disimpan pada:
>
> Master_Barang.Stok_Awal
>
> Contoh:
>
> Aqua Galon
>
> Stok Awal = 5
>
> **28. Modul Stok Masuk**
>
> Route:
>
> /inventory/in
>
> Sheet:
>
> **Stok_Masuk**

+-----------------------------------------------------------------------+
| > **Field**                                                           |
+=======================================================================+
| > ID_Stok_Masuk                                                       |
+-----------------------------------------------------------------------+
| > Tanggal                                                             |
+-----------------------------------------------------------------------+
| > ID_Barang                                                           |
+-----------------------------------------------------------------------+
| > Qty_Dus_Masuk                                                       |
+-----------------------------------------------------------------------+
| > ID_Supplier                                                         |
+-----------------------------------------------------------------------+
| > Harga_Beli                                                          |
+-----------------------------------------------------------------------+
| > Catatan                                                             |
+-----------------------------------------------------------------------+

> **29. Supplier pada Stok Masuk**
>
> ID_Supplier merupakan relasi ke Supplier.
>
> Saat input:
>
> Barang
>
> Qty
>
> Supplier
>
> Supplier dipilih dari master Supplier.
>
> Tidak mengetik nama supplier secara bebas jika supplier sudah
> tersedia.
>
> **30. Harga Beli**
>
> Stok masuk dapat memiliki:
>
> Harga_Beli
>
> Harga beli disimpan sebagai histori transaksi.
>
> Perubahan harga beli supplier di masa depan tidak mengubah histori
> lama.
>
> **31. Modul Penjualan**
>
> Route:
>
> /sales
>
> View utama:
>
> **Table/List**
>
> Kolom:

-   ID Transaksi

-   Tanggal

-   Customer

-   Total

-   Status Bayar

-   Metode Bayar

> Tombol:
>
> \+ Transaksi Baru
>
> **32. Struktur Penjualan**
>
> Sheet:
>
> **Penjualan**

+-----------------------------------------------------------------------+
| > **Field**                                                           |
+=======================================================================+
| > ID_Trx                                                              |
+-----------------------------------------------------------------------+
| > Tanggal                                                             |
+-----------------------------------------------------------------------+
| > ID_Customer                                                         |
+-----------------------------------------------------------------------+
| > Total                                                               |
+-----------------------------------------------------------------------+
| > Status_Bayar                                                        |
+-----------------------------------------------------------------------+
| > Metode_Bayar                                                        |
+-----------------------------------------------------------------------+
| > Catatan                                                             |
+-----------------------------------------------------------------------+
| > Created_At                                                          |
+-----------------------------------------------------------------------+
| > Updated_At                                                          |
+-----------------------------------------------------------------------+

> **33. Detail Penjualan**
>
> Sheet:
>
> **Detail_Penjualan**

+-----------------------------------------------------------------------+
| > **Field**                                                           |
+=======================================================================+
| > ID_Detail                                                           |
+-----------------------------------------------------------------------+
| > ID_Trx                                                              |
+-----------------------------------------------------------------------+
| > ID_Barang                                                           |
+-----------------------------------------------------------------------+
| > Kategori_Pelanggan                                                  |
+-----------------------------------------------------------------------+
| > Qty                                                                 |
+-----------------------------------------------------------------------+
| > Harga_Satuan                                                        |
+-----------------------------------------------------------------------+
| > Subtotal                                                            |
+-----------------------------------------------------------------------+

> **34. Alur Transaksi**
>
> Penjualan
>
> ↓
>
> Tambah Transaksi
>
> ↓
>
> Pilih Customer
>
> ↓
>
> Pilih Barang
>
> ↓
>
> Tentukan Harga
>
> ↓
>
> Qty
>
> ↓
>
> Subtotal
>
> ↓
>
> Tambah barang lain
>
> ↓
>
> Total
>
> ↓
>
> Simpan
>
> **35. Harga pada Transaksi**
>
> Sistem:

1.  membaca kategori customer,

2.  mengambil harga default,

3.  menampilkan harga,

4.  mengecek Boleh_Edit_Harga,

5.  mengizinkan override jika aktif,

6.  menyimpan harga final.

> **36. Total Transaksi**
>
> Subtotal:
>
> Qty × Harga_Satuan
>
> Total:
>
> SUM seluruh Subtotal
>
> Contoh:
>
> Aqua Gelas
>
> 1 × 35.000 = 35.000
>
> Vit Galon
>
> 1 × 15.000 = 15.000
>
> Aqua 1500
>
> 1 × 52.000 = 52.000
>
> TOTAL = 102.000
>
> **37. Status Pembayaran**
>
> Minimal:
>
> Lunas
>
> Belum Lunas
>
> Sebagian
>
> Dapat dikembangkan kemudian.
>
> **38. Metode Pembayaran**
>
> Minimal:
>
> Cash
>
> Transfer
>
> QRIS
>
> Lainnya
>
> Dapat dikembangkan.
>
> **39. Stock Adjustment**
>
> Route:
>
> /inventory/adjustments
>
> Sheet:
>
> **Stock_Adjustment**

+-----------------------------------------------------------------------+
| > **Field**                                                           |
+=======================================================================+
| > ID_Adjustment                                                       |
+-----------------------------------------------------------------------+
| > Tanggal                                                             |
+-----------------------------------------------------------------------+
| > ID_Barang                                                           |
+-----------------------------------------------------------------------+
| > Qty_Penyesuaian                                                     |
+-----------------------------------------------------------------------+
| > Alasan                                                              |
+-----------------------------------------------------------------------+
| > Created_At                                                          |
+-----------------------------------------------------------------------+

> **40. Contoh Adjustment**
>
> Barang rusak:
>
> Qty = -1
>
> Stok fisik lebih banyak:
>
> Qty = +2
>
> Alasan wajib dicatat.
>
> **41. Current Stock**
>
> Formula konseptual:
>
> Stok Saat Ini
>
> =
>
> Stok Awal
>
> \+
>
> Total Stok Masuk
>
> \-
>
> Total Penjualan
>
> \+
>
> Total Adjustment
>
> Contoh:
>
> Stok Awal 5
>
> Stok Masuk 10
>
> Penjualan 2
>
> Adjustment -1
>
> \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--
>
> Stok Saat Ini 12
>
> **42. Tidak Mengedit Histori Stok**
>
> Setelah stok masuk tercatat:
>
> **jangan mengubah stok master secara manual untuk menggantikan
> histori.**
>
> Jika terjadi kesalahan:
>
> gunakan:
>
> Stock Adjustment
>
> Dengan demikian histori tetap dapat ditelusuri.
>
> **43. Stock Movement Future**
>
> Arsitektur harus memungkinkan tipe:
>
> IN
>
> OUT
>
> ADJUSTMENT
>
> RETURN
>
> TRANSFER
>
> V1 cukup:
>
> IN
>
> OUT
>
> ADJUSTMENT
>
> **44. Dashboard**
>
> Route:
>
> /dashboard
>
> Menampilkan:
>
> **Summary**

-   Total barang

-   Total customer

-   Total supplier

-   Total stok

-   Penjualan hari ini

-   Jumlah transaksi hari ini

> **Inventory**

-   Stok rendah

-   Stok habis

> **Sales**

-   Penjualan hari ini

-   Penjualan periode tertentu

> **45. Dashboard Performance**
>
> Dashboard **tidak boleh mengambil seluruh data transaksi ke browser**.
>
> Gunakan API agregasi:
>
> GET /api/dashboard/summary
>
> Backend menghitung summary.
>
> **46. Search**
>
> **Barang**
>
> Search:

-   nama

-   barcode

-   ID

> **Customer**
>
> Search:

-   nama

-   nomor HP

-   email

> **Supplier**
>
> Search:

-   nama

-   nomor HP

-   email

> **Penjualan**
>
> Search:

-   ID transaksi

-   customer

> **47. Pagination**
>
> Semua tabel yang berpotensi besar wajib menggunakan pagination.
>
> Contoh:
>
> GET /api/sales?page=1&limit=50
>
> Bukan:
>
> GET /api/sales
>
> yang mengirim seluruh histori.
>
> **48. API Architecture**
>
> Semua business data melalui API.
>
> Contoh:
>
> GET /api/products
>
> GET /api/products/:id
>
> POST /api/products
>
> PUT /api/products/:id
>
> GET /api/customers
>
> POST /api/customers
>
> PUT /api/customers/:id
>
> GET /api/suppliers
>
> POST /api/suppliers
>
> PUT /api/suppliers/:id
>
> GET /api/sales
>
> GET /api/sales/:id
>
> POST /api/sales
>
> GET /api/inventory
>
> GET /api/inventory/movements
>
> POST /api/inventory/in
>
> POST /api/inventory/adjustment
>
> GET /api/dashboard/summary
>
> **49. API Response Standard**
>
> Success:
>
> {
>
> \"success\": true,
>
> \"data\": {}
>
> }
>
> List:
>
> {
>
> \"success\": true,
>
> \"data\": \[\],
>
> \"pagination\": {
>
> \"page\": 1,
>
> \"limit\": 50,
>
> \"total\": 1000
>
> }
>
> }
>
> Error:
>
> {
>
> \"success\": false,
>
> \"error\": {
>
> \"code\": \"PRODUCT_NOT_FOUND\",
>
> \"message\": \"Produk tidak ditemukan\"
>
> }
>
> }
>
> **50. Backend Validation**
>
> Validasi wajib dilakukan di backend.
>
> Contoh:

-   ID unik

-   Nama barang wajib

-   Qty \> 0 untuk stok masuk

-   Qty \> 0 untuk penjualan

-   Harga \>= 0

-   Customer valid

-   Supplier valid

-   Barang valid

-   Transaksi valid

> Frontend validation hanya untuk membantu UX.
>
> **51. Transaction Integrity**
>
> Sistem harus mencegah kondisi:
>
> Penjualan tersimpan
>
> tetapi Detail Penjualan gagal
>
> atau:
>
> Detail tersimpan
>
> tetapi total transaksi tidak tersimpan
>
> Semua validasi harus dilakukan sebelum proses penyimpanan.
>
> Pada V1 Google Sheets, backend menangani proses penulisan secara
> terkontrol.
>
> Saat migrasi Supabase, proses dapat menggunakan database transaction
> native PostgreSQL.
>
> **52. Soft Delete**
>
> Master data tidak langsung dihapus.
>
> Gunakan:
>
> Aktif = false
>
> Contoh:
>
> Barang tidak lagi dijual:
>
> Aktif = false
>
> Histori transaksi tetap aman.
>
> **53. Audit Fields**
>
> Data transaksi minimal memiliki:
>
> Created_At
>
> Updated_At
>
> Future:
>
> Created_By
>
> Updated_By
>
> **54. Email & Dokumen**
>
> Sistem disiapkan untuk menghasilkan:

-   Nota

-   Struk

-   Kwitansi

-   Invoice

> **V1**
>
> Prioritas:
>
> Cetak
>
> dan:
>
> Simpan / Print
>
> **Future**
>
> Kirim Email
>
> kepada customer/supplier.
>
> Email kosong tidak boleh menyebabkan error.
>
> **55. Nota / Struk**
>
> Nota minimal menampilkan:
>
> TOKO GROSIR SIHOMBING
>
> No. Transaksi
>
> Tanggal
>
> Customer
>
> Barang
>
> Qty
>
> Harga
>
> Subtotal
>
> TOTAL
>
> Status Pembayaran
>
> Terima kasih
>
> Desain harus print-friendly.
>
> **56. Responsive UI**
>
> **Desktop**
>
> Sidebar:
>
> Dashboard
>
> Penjualan
>
> Stok
>
> Barang
>
> Customer
>
> Supplier
>
> Laporan
>
> **Mobile**
>
> Prioritas:
>
> Dashboard
>
> Penjualan
>
> Stok
>
> More
>
> Form harus mudah digunakan dengan touch.
>
> **57. UI Principles**
>
> Desain:

-   clean

-   sederhana

-   tidak terlalu ramai

-   tombol jelas

-   form pendek

-   tabel mudah dibaca

-   feedback setelah save

-   loading state

-   empty state

-   error state

> **58. Loading State**
>
> Saat API berjalan:
>
> Memuat data\...
>
> atau skeleton/loading indicator.
>
> Tidak boleh halaman terlihat rusak/kosong.
>
> **59. Empty State**
>
> Contoh:
>
> Belum ada supplier.
>
> \[ + Tambah Supplier \]
>
> **60. Error State**
>
> User-facing error:
>
> Data gagal disimpan.
>
> Silakan coba lagi.
>
> Technical error hanya untuk developer log.
>
> **61. Security**
>
> Credential database/API **tidak boleh berada di frontend**.
>
> Dilarang:
>
> API key
>
> service credentials
>
> private key
>
> Google credentials
>
> dimasukkan ke:
>
> HTML
>
> JS
>
> CSS
>
> Credential harus berada di Cloudflare environment variables/secrets.
>
> **62. Google Sheets V1**
>
> Google Sheets hanya menjadi:
>
> **Database Adapter V1**
>
> Bukan bagian dari business logic frontend.
>
> **63. Repository / Data Access Layer**
>
> Backend sebaiknya memiliki abstraction seperti:
>
> repositories/
>
> productRepository
>
> customerRepository
>
> supplierRepository
>
> salesRepository
>
> inventoryRepository
>
> Implementasi V1:
>
> GoogleSheetsRepository
>
> Future:
>
> SupabaseRepository
>
> **64. Supabase Migration**
>
> Ketika Google Sheets sudah tidak cocok:
>
> Google Sheets
>
> ↓
>
> Migration Script
>
> ↓
>
> Supabase PostgreSQL
>
> Mapping:
>
> Master_Barang
>
> → products
>
> Harga_Barang
>
> → product_prices
>
> Customer
>
> → customers
>
> Supplier
>
> → suppliers
>
> Penjualan
>
> → sales
>
> Detail_Penjualan
>
> → sale_items
>
> Stok_Masuk
>
> → stock_movements
>
> Stock_Adjustment
>
> → stock_adjustments
>
> Frontend tetap menggunakan API yang sama.
>
> **65. Scale-up Strategy**
>
> **Tahap 1**
>
> Google Sheets
>
> Cocok untuk:

-   satu toko

-   sedikit user

-   volume data kecil-menengah

-   MVP

-   deployment gratis

> **Tahap 2**
>
> Supabase PostgreSQL
>
> Untuk:

-   data besar

-   banyak transaksi

-   banyak user

-   query kompleks

-   concurrency

-   reporting lebih berat

> **66. Aturan Data Besar**
>
> Dari awal aplikasi harus:

-   pagination

-   server-side search

-   server-side filtering

-   API aggregation

-   tidak load semua transaksi

-   tidak load semua customer

-   tidak load semua histori sekaligus

> Dengan demikian migrasi ke database besar lebih mudah.
>
> **67. Struktur Folder**
>
> zensheet/
>
> │
>
> ├── index.html
>
> │
>
> ├── pages/
>
> │ ├── dashboard.html
>
> │ ├── sales.html
>
> │ ├── products.html
>
> │ ├── customers.html
>
> │ ├── suppliers.html
>
> │ ├── inventory.html
>
> │ └── reports.html
>
> │
>
> ├── assets/
>
> │ ├── css/
>
> │ │ ├── base.css
>
> │ │ ├── layout.css
>
> │ │ └── components.css
>
> │ │
>
> │ └── js/
>
> │ ├── core/
>
> │ │ ├── api.js
>
> │ │ ├── utils.js
>
> │ │ └── state.js
>
> │ │
>
> │ ├── modules/
>
> │ │ ├── products.js
>
> │ │ ├── prices.js
>
> │ │ ├── customers.js
>
> │ │ ├── suppliers.js
>
> │ │ ├── sales.js
>
> │ │ ├── inventory.js
>
> │ │ └── dashboard.js
>
> │ │
>
> │ └── components/
>
> │ ├── modal.js
>
> │ ├── table.js
>
> │ ├── toast.js
>
> │ ├── pagination.js
>
> │ └── scanner.js
>
> │
>
> ├── functions/
>
> │ └── api/
>
> │ ├── products.js
>
> │ ├── customers.js
>
> │ ├── suppliers.js
>
> │ ├── prices.js
>
> │ ├── sales.js
>
> │ ├── inventory.js
>
> │ └── dashboard.js
>
> │
>
> ├── docs/
>
> │ └── PRD.md
>
> │
>
> └── README.md
>
> **68. GitHub**
>
> GitHub digunakan untuk:

-   source control

-   backup

-   deployment

-   version history

-   rollback

> Commit format:
>
> feat: add supplier management
>
> feat: add stock adjustment
>
> feat: add manual price override
>
> feat: add duplicate barcode handling
>
> fix: calculate sales total
>
> fix: inventory stock calculation
>
> **69. Development Phase**
>
> **Phase 1 --- Foundation**

-   GitHub

-   Cloudflare Pages

-   Pages Functions

-   API architecture

-   Google Sheets adapter

-   base UI

> **Phase 2 --- Master Data**

-   Barang

-   Harga

-   Customer

-   Supplier

> **Phase 3 --- Sales**

-   transaksi

-   detail transaksi

-   multi-item

-   customer

-   category pricing

-   manual price override

> **Phase 4 --- Inventory**

-   stok awal

-   stok masuk

-   stok keluar

-   adjustment

-   current stock

> **Phase 5 --- Barcode**

-   optional barcode

-   scanner

-   duplicate barcode handling

-   manual search fallback

> **Phase 6 --- Dashboard**

-   summary

-   sales

-   inventory

-   low stock

> **Phase 7 --- Documents**

-   nota

-   struk

-   kwitansi

-   print layout

> **Phase 8 --- Reports**

-   sales

-   inventory

-   purchases

-   customer history

> **70. MVP Scope**
>
> MVP wajib memiliki:
>
> **Master**

-   Barang

-   Harga

-   Customer

-   Supplier

> **Sales**

-   Customer

-   Multi-item

-   Harga otomatis

-   Harga manual

-   Total

-   Status pembayaran

> **Inventory**

-   Stok awal

-   Stok masuk

-   Stok keluar

-   Adjustment

-   Current stock

> **Barcode**

-   optional

-   duplicate allowed

-   scanner

-   manual fallback

> **Dashboard**

-   sales

-   transactions

-   inventory

-   low stock

> **71. Out of Scope V1**
>
> Jangan dibuat dahulu:

-   accounting

-   payroll

-   pajak kompleks

-   multi-company

-   multi-warehouse

-   supplier portal

-   customer portal

-   online payment gateway

-   AI forecasting

-   advanced BI

-   WhatsApp automation

-   automatic email campaign

> Fitur tersebut dapat masuk roadmap V2/V3.
>
> **72. Future Multi-User**
>
> Arsitektur disiapkan untuk:
>
> OWNER
>
> ADMIN
>
> CASHIER
>
> WAREHOUSE
>
> Tetapi role/permission kompleks tidak wajib di MVP.
>
> **73. Future Multi-Warehouse**
>
> Belum diperlukan V1.
>
> Tetapi struktur dapat dikembangkan menjadi:
>
> warehouses
>
> stock_movements
>
> warehouse_id
>
> Contoh:
>
> Gudang A
>
> Aqua = 100
>
> Gudang B
>
> Aqua = 50
>
> **74. Business Rules Penting**
>
> **Barang**

-   ID unik

-   Barcode optional

-   Barcode boleh duplicate

-   Produk tetap valid tanpa barcode

> **Harga**

-   Default price

-   Category-based pricing

-   Manual override

-   Override dikontrol oleh konfigurasi

-   Harga final disimpan dalam transaksi

> **Customer**

-   Email optional

-   Category menentukan default pricing

> **Supplier**

-   Email optional

-   Supplier terhubung dengan stok masuk

> **Stok**
>
> Opening
>
> \+ IN
>
> \- OUT
>
> \+ Adjustment
>
> = Current Stock
>
> **Histori**
>
> Transaksi lama tidak boleh berubah hanya karena master data berubah.
>
> **75. Contoh Skenario Nyata**
>
> **Skenario 1 --- Produk normal**
>
> Customer:
>
> Arif
>
> Kategori: Retail
>
> Barang:
>
> Aqua 1500
>
> Harga:
>
> Retail = 52.000
>
> Sistem otomatis:
>
> Harga = 52.000
>
> **Skenario 2 --- Galon Isi Ulang**
>
> Customer:
>
> Arif
>
> Retail
>
> Barang:
>
> Galon Isi Ulang
>
> Default:
>
> 15.000
>
> Kasir mengubah:
>
> 17.000
>
> Sistem menyimpan:
>
> Harga_Satuan = 17.000
>
> **Skenario 3 --- Barcode kosong**
>
> Galon Isi Ulang
>
> Barcode = kosong
>
> Produk tetap bisa:
>
> Search → pilih → transaksi
>
> Tidak ada error.
>
> **Skenario 4 --- Duplicate Barcode**
>
> Barcode:
>
> 899123456
>
> Produk:
>
> Aqua Galon
>
> Vit Galon
>
> Scan menghasilkan:
>
> 2 hasil
>
> User memilih produk.
>
> **Skenario 5 --- Customer tanpa email**
>
> Nama: Budi
>
> Email: kosong
>
> Customer tetap bisa disimpan dan melakukan transaksi.
>
> **Skenario 6 --- Supplier dengan email**
>
> CV Sumber Makmur
>
> email@supplier.com
>
> Data email dapat digunakan untuk fitur dokumen/email di masa depan.
>
> **76. Definition of Done**
>
> V1 dianggap selesai apabila:

-   Barang dapat dibuat

-   Barcode boleh kosong

-   Barcode duplicate tidak menyebabkan error

-   Harga dapat dibuat

-   Harga berdasarkan kategori bekerja

-   Manual price override bekerja

-   Customer dapat dibuat

-   Email customer optional

-   Supplier dapat dibuat

-   Email supplier optional

-   Stok awal bekerja

-   Stok masuk bekerja

-   Supplier terhubung ke stok masuk

-   Penjualan multi-item bekerja

-   Harga transaksi tersimpan

-   Total transaksi benar

-   Stok berkurang setelah penjualan

-   Stock adjustment bekerja

-   Current stock benar

-   Dashboard bekerja

-   Search bekerja

-   Pagination tersedia

-   Responsive desktop

-   Responsive mobile

-   Loading state

-   Empty state

-   Error handling

-   API abstraction

-   Credential aman

-   Frontend tidak akses Google Sheets langsung

-   GitHub deployment bekerja

-   Tidak bergantung AppSheet

> **77. Prinsip Paling Penting untuk Developer**
>
> **Jangan over-engineer.**
>
> Aplikasi ini awalnya hanya untuk **satu toko**, jadi jangan langsung
> membuat:

-   microservices

-   Redux

-   React

-   Next.js

-   complex state management

-   Kubernetes

-   server architecture berlebihan

> Tetapi juga **jangan membuat kode asal jadi**.
>
> Targetnya:
>
> **Simple di permukaan, terstruktur di belakang.**
>
> **78. Arsitektur Final**
>
> **V1 --- Gratis / biaya minimum**
>
> GITHUB
>
> │
>
> ▼
>
> CLOUDFLARE PAGES
>
> │
>
> ┌──────────┴──────────┐
>
> │ │
>
> FRONTEND API
>
> Vanilla HTML/CSS/JS Pages Functions
>
> │ │
>
> └──────────┬──────────┘
>
> ▼
>
> GOOGLE SHEETS
>
> **V2 --- Scale-up**
>
> GITHUB
>
> │
>
> ▼
>
> CLOUDFLARE PAGES
>
> │
>
> ┌──────────┴──────────┐
>
> │ │
>
> FRONTEND API
>
> Vanilla HTML/CSS/JS Pages Functions
>
> │ │
>
> └──────────┬──────────┘
>
> ▼
>
> SUPABASE
>
> PostgreSQL
>
> **Frontend tetap.**
>
> **URL/API contract tetap.**
>
> **Business logic tetap.**
>
> Yang berubah hanya **data adapter** dari Google Sheets ke Supabase.
>
> **Keputusan final PRD**
>
> **Stack:**
>
> **Vanilla HTML/CSS/JS + Cloudflare Pages + Pages Functions + Google
> Sheets**
>
> **Database jangka panjang:**
>
> **Supabase PostgreSQL**
>
> **Barcode:**
>
> **Optional + duplicate allowed**
>
> **Harga:**
>
> **Default pricing + customer segment + manual override**
>
> **Galon Isi Ulang:**
>
> **Salah satu komoditi yang mengaktifkan manual price override, tetapi
> sistem tidak boleh hardcode nama komoditinya.**
>
> **Customer/Supplier:**
>
> **Email optional dan disiapkan untuk dokumen/email.**
>
> **Stok:**
>
> **Stock Movement, bukan sekadar angka stok yang ditimpa.**
>
> **Target utama:**
>
> **Gratis untuk client, mudah dipakai, tidak terkunci platform, dan
> bisa scale-up tanpa rewrite frontend.**
