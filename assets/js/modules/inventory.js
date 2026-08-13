/**
 * modules/inventory.js — Modul Stok (PRD section 26-30, 39-43).
 *
 * Stok memakai konsep Stock Movement (section 26): Stok Saat Ini dihitung
 * dari Stok Awal + Stok Masuk - Penjualan + Adjustment, bukan angka yang bisa
 * ditimpa manual. Halaman ini punya dua tampilan:
 *  - "Stok Saat Ini": rekap per barang (GET /api/inventory)
 *  - "Riwayat Pergerakan": histori Stok Masuk & Adjustment (GET /api/inventory/movements)
 * Dan dua aksi untuk menambah histori: "+ Stok Masuk" & "+ Penyesuaian Stok".
 */

import Api from "../core/api.js";
import { toast } from "../components/toast.js";
import { openModal } from "../components/modal.js";
import { createDataTable } from "../components/table.js";
import { createPagination } from "../components/pagination.js";
import { scanProduct } from "../components/scanner.js";
import { debounce, formatRupiah, formatDate, escapeHtml, stockLevelBadge, stockLevelLabel } from "../core/utils.js";

const stockState = { page: 1, limit: 20, search: "" };
const movementState = { page: 1, limit: 20, search: "" };
let activeTab = "stock"; // "stock" | "movements"

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Picker generik: cari barang/supplier lewat input + daftar hasil di bawahnya.
// Sama polanya dengan customer/product picker di modules/sales.js.
// ---------------------------------------------------------------------------

function wirePicker({ input, resultsEl, fetchFn, renderItem, onPick }) {
  input.addEventListener(
    "input",
    debounce(async (e) => {
      const q = e.target.value.trim();
      if (!q) {
        resultsEl.innerHTML = "";
        return;
      }
      try {
        const rows = await fetchFn(q);
        resultsEl.innerHTML = "";
        if (rows.length === 0) {
          resultsEl.innerHTML = `<div class="text-muted" style="padding:8px 2px;">Tidak ditemukan.</div>`;
          return;
        }
        rows.forEach((r) => {
          const item = document.createElement("div");
          item.className = "search-result-item";
          item.innerHTML = renderItem(r);
          item.addEventListener("click", () => onPick(r));
          resultsEl.appendChild(item);
        });
      } catch {
        // biarkan user coba lagi lewat input
      }
    }, 300)
  );
}

function pickedBox({ wrap, picked, searchWrap, nameEl, subEl, name, sub }) {
  searchWrap.style.display = "none";
  picked.style.display = "flex";
  nameEl.textContent = name;
  subEl.textContent = sub || "";
}

// ---------------------------------------------------------------------------
// + Stok Masuk (PRD section 28-30)
// ---------------------------------------------------------------------------

function openStockInModal({ onSaved }) {
  let pickedProduct = null;
  let pickedSupplier = null;

  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div class="field">
      <label class="field__label">Barang</label>
      <div id="msBarangPicked" style="display:none; align-items:center; justify-content:space-between; gap:8px; padding:9px 12px; border:1px solid var(--color-border); border-radius:var(--radius-sm); background:var(--color-primary-soft);">
        <div>
          <strong data-picked-name></strong>
          <div class="text-muted" style="font-size:12px;" data-picked-sub></div>
        </div>
        <button type="button" class="btn btn--sm" data-change>Ganti</button>
      </div>
      <div data-search-wrap>
        <div class="input-group">
          <input class="field__control" type="text" placeholder="Cari nama, barcode, atau ID barang..." id="msBarangSearch" autocomplete="off" />
          <button type="button" class="btn" id="msBarangScanBtn" title="Scan barcode">📷</button>
        </div>
        <div id="msBarangResults"></div>
      </div>
    </div>

    <div class="field">
      <label class="field__label">Supplier</label>
      <div id="msSupplierPicked" style="display:none; align-items:center; justify-content:space-between; gap:8px; padding:9px 12px; border:1px solid var(--color-border); border-radius:var(--radius-sm); background:var(--color-primary-soft);">
        <div>
          <strong data-picked-name></strong>
          <div class="text-muted" style="font-size:12px;" data-picked-sub></div>
        </div>
        <button type="button" class="btn btn--sm" data-change>Ganti</button>
      </div>
      <div data-search-wrap>
        <input class="field__control" type="text" placeholder="Cari nama supplier..." id="msSupplierSearch" autocomplete="off" />
        <div id="msSupplierResults"></div>
      </div>
    </div>

    <div style="display:flex; gap:12px; flex-wrap:wrap;">
      <div class="field" style="flex:1; min-width:140px;">
        <label class="field__label">Qty Masuk</label>
        <input class="field__control" type="number" min="1" step="1" id="msQty" value="1" />
      </div>
      <div class="field" style="flex:1; min-width:140px;">
        <label class="field__label">Harga Beli <span class="optional">(opsional)</span></label>
        <input class="field__control" type="number" min="0" id="msHarga" placeholder="Rp" />
      </div>
      <div class="field" style="flex:1; min-width:140px;">
        <label class="field__label">Tanggal</label>
        <input class="field__control" type="date" id="msTanggal" value="${todayInputValue()}" />
      </div>
    </div>
    <div class="field">
      <label class="field__label">Catatan <span class="optional">(opsional)</span></label>
      <textarea class="field__control" id="msCatatan" rows="2"></textarea>
    </div>

    <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:8px; padding-top:14px; border-top:1px solid var(--color-border);">
      <button type="button" class="btn" id="msCancelBtn">Batal</button>
      <button type="button" class="btn btn--primary" id="msSaveBtn">Simpan Stok Masuk</button>
    </div>
  `;

  const close = openModal({ title: "+ Stok Masuk", bodyNode: wrap, hideFooter: true, size: "lg" });
  wrap.querySelector("#msCancelBtn").addEventListener("click", close);

  // ---- Barang picker ----
  const barangSearchWrap = wrap.querySelector("#msBarangPicked").nextElementSibling;
  const barangPicked = wrap.querySelector("#msBarangPicked");
  const barangSearchInput = wrap.querySelector("#msBarangSearch");
  const barangScanBtn = wrap.querySelector("#msBarangScanBtn");
  const barangResults = wrap.querySelector("#msBarangResults");

  function pickBarang(p) {
    pickedProduct = p;
    pickedBox({
      picked: barangPicked,
      searchWrap: barangSearchWrap,
      nameEl: barangPicked.querySelector("[data-picked-name]"),
      subEl: barangPicked.querySelector("[data-picked-sub]"),
      name: p.Nama_Barang,
      sub: p.Barcode ? `Barcode: ${p.Barcode}` : "",
    });
    barangResults.innerHTML = "";
    barangSearchInput.value = "";
  }

  wirePicker({
    input: barangSearchInput,
    resultsEl: barangResults,
    fetchFn: async (q) => {
      const res = await Api.get("/products", { search: q, limit: 8 });
      return res.data.filter((p) => p.Aktif);
    },
    renderItem: (p) => escapeHtml(p.Nama_Barang) + (p.Barcode ? ` <span class="text-muted">(${escapeHtml(p.Barcode)})</span>` : ""),
    onPick: pickBarang,
  });
  barangScanBtn.addEventListener("click", () => {
    // Barang yang mau distok masuk harus aktif di master (sama seperti
    // validasi backend createStockIn) — scanner difilter konsisten.
    scanProduct({ title: "Scan Barang — Stok Masuk", onFound: pickBarang });
  });
  barangPicked.querySelector("[data-change]").addEventListener("click", () => {
    pickedProduct = null;
    barangPicked.style.display = "none";
    barangSearchWrap.style.display = "block";
  });

  // ---- Supplier picker ----
  const supplierSearchWrap = wrap.querySelector("#msSupplierPicked").nextElementSibling;
  const supplierPicked = wrap.querySelector("#msSupplierPicked");
  const supplierSearchInput = wrap.querySelector("#msSupplierSearch");
  const supplierResults = wrap.querySelector("#msSupplierResults");

  wirePicker({
    input: supplierSearchInput,
    resultsEl: supplierResults,
    fetchFn: async (q) => {
      const res = await Api.get("/suppliers", { search: q, limit: 8 });
      return res.data.filter((s) => s.Aktif);
    },
    renderItem: (s) => escapeHtml(s.Nama_Supplier),
    onPick: (s) => {
      pickedSupplier = s;
      pickedBox({
        picked: supplierPicked,
        searchWrap: supplierSearchWrap,
        nameEl: supplierPicked.querySelector("[data-picked-name]"),
        subEl: supplierPicked.querySelector("[data-picked-sub]"),
        name: s.Nama_Supplier,
        sub: s.No_HP || "",
      });
      supplierResults.innerHTML = "";
      supplierSearchInput.value = "";
    },
  });
  supplierPicked.querySelector("[data-change]").addEventListener("click", () => {
    pickedSupplier = null;
    supplierPicked.style.display = "none";
    supplierSearchWrap.style.display = "block";
  });

  // ---- Simpan ----
  const saveBtn = wrap.querySelector("#msSaveBtn");
  saveBtn.addEventListener("click", async () => {
    if (!pickedProduct) return toast.error("Pilih barang terlebih dahulu.");
    if (!pickedSupplier) return toast.error("Pilih supplier terlebih dahulu.");
    const qty = Number(wrap.querySelector("#msQty").value);
    if (!qty || qty <= 0) return toast.error("Qty masuk harus lebih dari 0.");
    const hargaRaw = wrap.querySelector("#msHarga").value;

    const payload = {
      ID_Barang: pickedProduct.ID_Barang,
      ID_Supplier: pickedSupplier.ID_Supplier,
      Qty_Dus_Masuk: qty,
      Harga_Beli: hargaRaw === "" ? undefined : Number(hargaRaw),
      Tanggal: wrap.querySelector("#msTanggal").value,
      Catatan: wrap.querySelector("#msCatatan").value,
    };

    saveBtn.disabled = true;
    const originalLabel = saveBtn.textContent;
    saveBtn.textContent = "Menyimpan...";
    try {
      await Api.post("/inventory/in", payload);
      toast.success("Stok masuk tersimpan.");
      close();
      onSaved();
    } catch (err) {
      toast.error(err.message || "Gagal menyimpan stok masuk.");
      saveBtn.disabled = false;
      saveBtn.textContent = originalLabel;
    }
  });
}

// ---------------------------------------------------------------------------
// + Penyesuaian Stok (PRD section 39-40)
// ---------------------------------------------------------------------------

function openAdjustmentModal({ onSaved }) {
  let pickedProduct = null;
  let jenis = "kurang"; // "tambah" | "kurang" — lebih mudah bagi kasir daripada mengetik minus

  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div class="field">
      <label class="field__label">Barang</label>
      <div id="adjBarangPicked" style="display:none; align-items:center; justify-content:space-between; gap:8px; padding:9px 12px; border:1px solid var(--color-border); border-radius:var(--radius-sm); background:var(--color-primary-soft);">
        <div>
          <strong data-picked-name></strong>
          <div class="text-muted" style="font-size:12px;" data-picked-sub></div>
        </div>
        <button type="button" class="btn btn--sm" data-change>Ganti</button>
      </div>
      <div data-search-wrap>
        <div class="input-group">
          <input class="field__control" type="text" placeholder="Cari nama, barcode, atau ID barang..." id="adjBarangSearch" autocomplete="off" />
          <button type="button" class="btn" id="adjBarangScanBtn" title="Scan barcode">📷</button>
        </div>
        <div id="adjBarangResults"></div>
      </div>
    </div>

    <div class="field">
      <label class="field__label">Jenis Penyesuaian</label>
      <div style="display:flex; gap:8px;">
        <button type="button" class="btn" data-jenis="tambah" style="flex:1;">+ Tambah (stok fisik lebih banyak)</button>
        <button type="button" class="btn btn--primary" data-jenis="kurang" style="flex:1;">− Kurang (rusak/hilang)</button>
      </div>
    </div>

    <div style="display:flex; gap:12px; flex-wrap:wrap;">
      <div class="field" style="flex:1; min-width:140px;">
        <label class="field__label">Qty Penyesuaian</label>
        <input class="field__control" type="number" min="1" step="1" id="adjQty" value="1" />
      </div>
      <div class="field" style="flex:1; min-width:140px;">
        <label class="field__label">Tanggal</label>
        <input class="field__control" type="date" id="adjTanggal" value="${todayInputValue()}" />
      </div>
    </div>
    <div class="field">
      <label class="field__label">Alasan</label>
      <input class="field__control" type="text" id="adjAlasan" placeholder="Contoh: galon retak, stok fisik lebih saat opname" required />
    </div>

    <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:8px; padding-top:14px; border-top:1px solid var(--color-border);">
      <button type="button" class="btn" id="adjCancelBtn">Batal</button>
      <button type="button" class="btn btn--primary" id="adjSaveBtn">Simpan Penyesuaian</button>
    </div>
  `;

  const close = openModal({ title: "+ Penyesuaian Stok", bodyNode: wrap, hideFooter: true, size: "lg" });
  wrap.querySelector("#adjCancelBtn").addEventListener("click", close);

  // ---- Barang picker ----
  const barangSearchWrap = wrap.querySelector("#adjBarangPicked").nextElementSibling;
  const barangPicked = wrap.querySelector("#adjBarangPicked");
  const barangSearchInput = wrap.querySelector("#adjBarangSearch");
  const barangScanBtn = wrap.querySelector("#adjBarangScanBtn");
  const barangResults = wrap.querySelector("#adjBarangResults");

  function pickBarang(p) {
    pickedProduct = p;
    pickedBox({
      picked: barangPicked,
      searchWrap: barangSearchWrap,
      nameEl: barangPicked.querySelector("[data-picked-name]"),
      subEl: barangPicked.querySelector("[data-picked-sub]"),
      name: p.Nama_Barang,
      sub: `Stok saat ini: ${p.Stok_Saat_Ini}`,
    });
    barangResults.innerHTML = "";
    barangSearchInput.value = "";
  }

  wirePicker({
    input: barangSearchInput,
    resultsEl: barangResults,
    fetchFn: async (q) => {
      const res = await Api.get("/inventory", { search: q, limit: 8 });
      return res.data.filter((p) => p.Aktif);
    },
    renderItem: (p) => `${escapeHtml(p.Nama_Barang)} <span class="text-muted">— stok saat ini ${p.Stok_Saat_Ini}</span>`,
    onPick: pickBarang,
  });
  barangScanBtn.addEventListener("click", () => {
    // Hasil scan datang dari /api/products (punya Stok_Saat_Ini juga, lihat
    // listProducts di mockRepository) — bentuknya kompatibel dengan baris
    // /api/inventory yang dipakai pencarian teks di atas, jadi pickBarang
    // bisa dipakai bersama tanpa penyesuaian.
    scanProduct({ title: "Scan Barang — Penyesuaian Stok", onFound: pickBarang });
  });
  barangPicked.querySelector("[data-change]").addEventListener("click", () => {
    pickedProduct = null;
    barangPicked.style.display = "none";
    barangSearchWrap.style.display = "block";
  });

  // ---- Jenis toggle ----
  const jenisBtns = wrap.querySelectorAll("[data-jenis]");
  jenisBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      jenis = btn.dataset.jenis;
      jenisBtns.forEach((b) => b.classList.toggle("btn--primary", b === btn));
    });
  });

  // ---- Simpan ----
  const saveBtn = wrap.querySelector("#adjSaveBtn");
  saveBtn.addEventListener("click", async () => {
    if (!pickedProduct) return toast.error("Pilih barang terlebih dahulu.");
    const qtyMagnitude = Number(wrap.querySelector("#adjQty").value);
    if (!qtyMagnitude || qtyMagnitude <= 0) return toast.error("Qty penyesuaian harus lebih dari 0.");
    const alasan = wrap.querySelector("#adjAlasan").value.trim();
    if (!alasan) return toast.error("Alasan wajib diisi.");

    const payload = {
      ID_Barang: pickedProduct.ID_Barang,
      Qty_Penyesuaian: jenis === "tambah" ? qtyMagnitude : -qtyMagnitude,
      Alasan: alasan,
      Tanggal: wrap.querySelector("#adjTanggal").value,
    };

    saveBtn.disabled = true;
    const originalLabel = saveBtn.textContent;
    saveBtn.textContent = "Menyimpan...";
    try {
      await Api.post("/inventory/adjustment", payload);
      toast.success("Penyesuaian stok tersimpan.");
      close();
      onSaved();
    } catch (err) {
      toast.error(err.message || "Gagal menyimpan penyesuaian stok.");
      saveBtn.disabled = false;
      saveBtn.textContent = originalLabel;
    }
  });
}

// ---------------------------------------------------------------------------
// Entry point halaman
// ---------------------------------------------------------------------------

export function initInventory() {
  const root = document.querySelector("#inventoryRoot");
  if (!root) return;

  root.innerHTML = `
    <div class="card__header">
      <div class="search-input">
        <span>🔍</span>
        <input type="text" placeholder="Cari nama, barcode, atau ID barang..." id="invSearch" />
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn" id="addAdjustmentBtn">+ Penyesuaian Stok</button>
        <button class="btn btn--primary" id="addStockInBtn">+ Stok Masuk</button>
      </div>
    </div>
    <div style="display:flex; gap:8px; margin-bottom:14px;">
      <button class="btn btn--sm btn--primary" data-tab="stock">Stok Saat Ini</button>
      <button class="btn btn--sm" data-tab="movements">Riwayat Pergerakan</button>
    </div>
    <div id="inventoryTable"></div>
    <div id="inventoryPagination"></div>
  `;

  const searchInput = root.querySelector("#invSearch");
  const tabBtns = root.querySelectorAll("[data-tab]");
  const tableContainer = root.querySelector("#inventoryTable");
  const paginationContainer = root.querySelector("#inventoryPagination");

  const table = createDataTable({
    container: tableContainer,
    emptyMessage: "Belum ada data.",
    columns: [],
  });

  const pager = createPagination({
    container: paginationContainer,
    onChange: (page) => {
      if (activeTab === "stock") stockState.page = page;
      else movementState.page = page;
      load();
    },
  });

  function setActiveTab(tab) {
    activeTab = tab;
    tabBtns.forEach((b) => b.classList.toggle("btn--primary", b.dataset.tab === tab));
    searchInput.value = tab === "stock" ? stockState.search : movementState.search;
    load();
  }

  tabBtns.forEach((btn) => btn.addEventListener("click", () => setActiveTab(btn.dataset.tab)));

  function renderStockTable(rows) {
    const wrap = document.createElement("div");
    wrap.className = "table-wrap";
    const t = document.createElement("table");
    t.className = "data-table";
    t.innerHTML = `
      <thead>
        <tr>
          <th>Barang</th>
          <th style="text-align:right;">Stok Awal</th>
          <th style="text-align:right;">Stok Masuk</th>
          <th style="text-align:right;">Penjualan</th>
          <th style="text-align:right;">Adjustment</th>
          <th style="text-align:right;">Stok Saat Ini</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (r) => `<tr>
              <td>${escapeHtml(r.Nama_Barang)}</td>
              <td style="text-align:right;">${r.Stok_Awal}</td>
              <td style="text-align:right;">${r.Total_Stok_Masuk}</td>
              <td style="text-align:right;">${r.Total_Penjualan}</td>
              <td style="text-align:right;">${r.Total_Adjustment}</td>
              <td style="text-align:right;"><strong>${r.Stok_Saat_Ini}</strong></td>
              <td><span class="badge badge--${stockLevelBadge(r.Stok_Saat_Ini)}">${stockLevelLabel(r.Stok_Saat_Ini)}</span></td>
            </tr>`
          )
          .join("")}
      </tbody>
    `;
    wrap.appendChild(t);
    tableContainer.innerHTML = "";
    tableContainer.appendChild(wrap);
  }

  function renderMovementsTable(rows) {
    const wrap = document.createElement("div");
    wrap.className = "table-wrap";
    const t = document.createElement("table");
    t.className = "data-table";
    t.innerHTML = `
      <thead>
        <tr>
          <th>Tanggal</th>
          <th>Tipe</th>
          <th>Barang</th>
          <th style="text-align:right;">Qty</th>
          <th>Keterangan</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map((r) => {
            const isIn = r.Type === "IN";
            const badge = isIn ? "success" : r.Qty >= 0 ? "success" : "danger";
            const label = isIn ? "Stok Masuk" : "Adjustment";
            const qtyLabel = isIn ? `+${r.Qty}` : r.Qty > 0 ? `+${r.Qty}` : r.Qty;
            const ket = isIn
              ? `Supplier: ${escapeHtml(r.Nama_Supplier)}${r.Harga_Beli != null ? ` · Harga beli: ${formatRupiah(r.Harga_Beli)}` : ""}${r.Catatan ? ` · ${escapeHtml(r.Catatan)}` : ""}`
              : escapeHtml(r.Alasan || "");
            return `<tr>
              <td>${formatDate(r.Tanggal)}</td>
              <td><span class="badge badge--${badge}">${label}</span></td>
              <td>${escapeHtml(r.Nama_Barang)}</td>
              <td style="text-align:right;">${qtyLabel}</td>
              <td>${ket}</td>
            </tr>`;
          })
          .join("")}
      </tbody>
    `;
    wrap.appendChild(t);
    tableContainer.innerHTML = "";
    tableContainer.appendChild(wrap);
  }

  function renderEmpty(message) {
    tableContainer.innerHTML = `<div class="state-block table-wrap"><div>${message}</div></div>`;
  }

  async function load() {
    table.setLoading();
    try {
      if (activeTab === "stock") {
        const res = await Api.get("/inventory", { search: stockState.search, page: stockState.page, limit: stockState.limit });
        if (res.data.length === 0) renderEmpty("Belum ada barang.");
        else renderStockTable(res.data);
        pager.update(res.pagination);
      } else {
        const res = await Api.get("/inventory/movements", { search: movementState.search, page: movementState.page, limit: movementState.limit });
        if (res.data.length === 0) renderEmpty("Belum ada riwayat pergerakan stok.");
        else renderMovementsTable(res.data);
        pager.update(res.pagination);
      }
    } catch (err) {
      table.setError("Gagal memuat data stok.", load);
    }
  }

  searchInput.addEventListener(
    "input",
    debounce((e) => {
      if (activeTab === "stock") {
        stockState.search = e.target.value;
        stockState.page = 1;
      } else {
        movementState.search = e.target.value;
        movementState.page = 1;
      }
      load();
    }, 350)
  );

  root.querySelector("#addStockInBtn").addEventListener("click", () => openStockInModal({ onSaved: load }));
  root.querySelector("#addAdjustmentBtn").addEventListener("click", () => openAdjustmentModal({ onSaved: load }));

  load();
}
