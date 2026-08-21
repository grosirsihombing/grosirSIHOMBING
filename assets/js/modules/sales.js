/**
 * modules/sales.js — Modul Penjualan (PRD section 31-38).
 *
 * Alur transaksi (section 34): pilih customer lama atau buat customer baru langsung di form -> pilih kategori transaksi -> pilih barang -> harga
 * otomatis dari kategori transaksi -> boleh override jika Boleh_Edit_Harga
 * true (section 17-19) -> qty -> subtotal -> total -> simpan. Backend
 * (createSale di mockRepository) yang menghitung ulang & memvalidasi harga —
 * frontend hanya mengirim override bila memang diizinkan, jadi tidak ada
 * business logic harga yang "dipercaya begitu saja" dari klien.
 */

import Api from "../core/api.js";
import { toast } from "../components/toast.js";
import { openModal } from "../components/modal.js";
import { createDataTable } from "../components/table.js";
import { createPagination } from "../components/pagination.js";
import { scanProduct } from "../components/scanner.js";
import { debounce, formatRupiah, formatDateTime, escapeHtml, statusBayarBadge } from "../core/utils.js";

const STATUS_OPTIONS = ["Lunas", "Belum Lunas", "Sebagian"]; // PRD section 37, dapat dikembangkan
const METODE_OPTIONS = ["Cash", "Transfer", "QRIS", "Lainnya"]; // PRD section 38

const listState = { page: 1, limit: 20, search: "" };

// ---------------------------------------------------------------------------
// Detail transaksi (read-only) + cetak Nota/Kwitansi (Phase 7 — PRD section 54-55)
// ---------------------------------------------------------------------------

async function openSaleDetail(saleRow) {
  const wrap = document.createElement("div");
  wrap.innerHTML = `<div class="skeleton-row"></div>`;
  openModal({ title: `Transaksi ${saleRow.ID_Trx}`, bodyNode: wrap, hideFooter: true, size: "lg" });

  try {
    const res = await Api.get(`/sales/${saleRow.ID_Trx}`);
    const sale = res.data;
    wrap.innerHTML = `
      <div style="display:flex; justify-content:flex-end; gap:8px; margin-bottom:14px;">
        <a class="btn btn--sm" href="print-nota.html?id=${encodeURIComponent(sale.ID_Trx)}" target="_blank" rel="noopener">🖨️ Cetak Nota</a>
        <a class="btn btn--sm" href="print-kwitansi.html?id=${encodeURIComponent(sale.ID_Trx)}" target="_blank" rel="noopener">🧾 Cetak Kwitansi</a>
      </div>
      <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:14px; margin-bottom:16px;">
        <div>
          <div class="text-muted" style="font-size:12px;">Customer</div>
          <div><strong>${escapeHtml(sale.Nama_Customer)}</strong></div>
        </div>
        <div>
          <div class="text-muted" style="font-size:12px;">Tanggal</div>
          <div>${formatDateTime(sale.Created_At)}</div>
        </div>
        <div>
          <div class="text-muted" style="font-size:12px;">Status Bayar</div>
          <span class="badge badge--${statusBayarBadge(sale.Status_Bayar)}">${escapeHtml(sale.Status_Bayar)}</span>
        </div>
        <div>
          <div class="text-muted" style="font-size:12px;">Metode Bayar</div>
          <div>${escapeHtml(sale.Metode_Bayar)}</div>
        </div>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Barang</th>
              <th style="text-align:right;">Qty</th>
              <th style="text-align:right;">Harga</th>
              <th style="text-align:right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${sale.Items.map(
              (i) => `<tr>
                <td>${escapeHtml(i.Nama_Barang)}</td>
                <td style="text-align:right;">${i.Qty}</td>
                <td style="text-align:right;">${formatRupiah(i.Harga_Satuan)}</td>
                <td style="text-align:right;">${formatRupiah(i.Subtotal)}</td>
              </tr>`
            ).join("")}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="text-align:right;"><strong>TOTAL</strong></td>
              <td style="text-align:right;"><strong>${formatRupiah(sale.Total)}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>
      ${sale.Catatan ? `<div class="text-muted" style="margin-top:12px;">Catatan: ${escapeHtml(sale.Catatan)}</div>` : ""}
    `;
  } catch (err) {
    wrap.innerHTML = `<div class="text-danger">Gagal memuat detail transaksi.</div>`;
  }
}

// ---------------------------------------------------------------------------
// Transaksi Baru — customer picker + product picker + cart
// ---------------------------------------------------------------------------

function openNewSaleModal({ onSaved }) {
  const cart = []; // { ID_Barang, Nama_Barang, Stok_Awal, Qty, Harga_Satuan, Harga_Default, Boleh_Edit_Harga }
  let selectedCustomer = null;
  let selectedCategory = "";
  let newCustomerDraft = null;

  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div class="field">
      <label class="field__label">Customer</label>
      <div id="saleCustomerPicked" style="display:none; align-items:center; justify-content:space-between; gap:8px; padding:9px 12px; border:1px solid var(--color-border); border-radius:var(--radius-sm); background:var(--color-primary-soft);">
        <div>
          <strong data-picked-name></strong>
          <div class="text-muted" style="font-size:12px;" data-picked-kategori></div>
        </div>
        <button type="button" class="btn btn--sm" data-change-customer>Ganti</button>
      </div>
      <div data-customer-search-wrap>
        <div class="input-group">
          <input class="field__control" type="text" placeholder="Cari nama, HP, atau email customer..." id="saleCustomerSearch" autocomplete="off" />
          <button type="button" class="btn" id="saleNewCustomerBtn">+ Customer Baru</button>
        </div>
        <div id="saleCustomerResults"></div>
      </div>
      <div id="saleNewCustomerForm" style="display:none; margin-top:10px; padding:12px; border:1px solid var(--color-border); border-radius:var(--radius-sm);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <strong>Customer Baru</strong>
          <button type="button" class="btn btn--sm" id="saleCancelNewCustomerBtn">Batal</button>
        </div>
        <div class="field">
          <label class="field__label">Nama Customer *</label>
          <input class="field__control" id="saleNewCustomerName" required />
        </div>
        <div style="display:flex; gap:12px; flex-wrap:wrap;">
          <div class="field" style="flex:1; min-width:160px;">
            <label class="field__label">No. HP <span class="optional">(opsional)</span></label>
            <input class="field__control" id="saleNewCustomerPhone" />
          </div>
          <div class="field" style="flex:1; min-width:160px;">
            <label class="field__label">Email <span class="optional">(opsional)</span></label>
            <input class="field__control" type="email" id="saleNewCustomerEmail" />
          </div>
        </div>
        <div class="field">
          <label class="field__label">Alamat <span class="optional">(opsional)</span></label>
          <textarea class="field__control" id="saleNewCustomerAddress" rows="2"></textarea>
        </div>
        <button type="button" class="btn btn--primary" id="saleUseNewCustomerBtn">Gunakan Customer Ini</button>
      </div>
    </div>

    <div class="field">
      <label class="field__label">Kategori Pelanggan Transaksi *</label>
      <select class="field__control" id="saleCustomerCategory" required>
        <option value="">Pilih kategori</option>
        <option value="Retail">Retail</option>
        <option value="Sub Agen">Sub Agen</option>
        <option value="User">User</option>
      </select>
      <div class="text-muted" style="font-size:12px; margin-top:4px;">Kategori ini hanya berlaku untuk transaksi ini dan menentukan harga barang.</div>
    </div>

    <div class="field">
      <label class="field__label">Tambah Barang <span class="optional" data-item-hint>(pilih customer dan kategori dulu)</span></label>
      <div class="input-group">
        <input class="field__control" type="text" placeholder="Pilih customer dan kategori dulu" id="saleProductSearch" autocomplete="off" disabled />
        <button type="button" class="btn" id="saleProductScanBtn" title="Scan barcode" disabled>📷</button>
      </div>
      <div id="saleProductResults"></div>
    </div>

    <div id="saleCartWrap"></div>

    <div style="display:flex; justify-content:flex-end; margin:10px 0 18px; font-size:18px;">
      <strong>Total: <span id="saleTotal">Rp0</span></strong>
    </div>

    <div style="display:flex; gap:12px; flex-wrap:wrap;">
      <div class="field" style="flex:1; min-width:160px;">
        <label class="field__label">Status Pembayaran</label>
        <select class="field__control" id="saleStatus">
          ${STATUS_OPTIONS.map((s) => `<option value="${s}">${s}</option>`).join("")}
        </select>
      </div>
      <div class="field" style="flex:1; min-width:160px;">
        <label class="field__label">Metode Bayar</label>
        <select class="field__control" id="saleMetode">
          ${METODE_OPTIONS.map((m) => `<option value="${m}">${m}</option>`).join("")}
        </select>
      </div>
    </div>
    <div class="field">
      <label class="field__label">Catatan <span class="optional">(opsional)</span></label>
      <textarea class="field__control" id="saleCatatan" rows="2"></textarea>
    </div>

    <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:8px; padding-top:14px; border-top:1px solid var(--color-border);">
      <button type="button" class="btn" id="saleCancelBtn">Batal</button>
      <button type="button" class="btn btn--primary" id="saleSaveBtn">Simpan Transaksi</button>
    </div>
  `;

  const close = openModal({ title: "Transaksi Baru", bodyNode: wrap, hideFooter: true, size: "lg" });

  const customerSearchWrap = wrap.querySelector("[data-customer-search-wrap]");
  const customerPicked = wrap.querySelector("#saleCustomerPicked");
  const customerSearchInput = wrap.querySelector("#saleCustomerSearch");
  const customerResults = wrap.querySelector("#saleCustomerResults");
  const newCustomerBtn = wrap.querySelector("#saleNewCustomerBtn");
  const newCustomerForm = wrap.querySelector("#saleNewCustomerForm");
  const cancelNewCustomerBtn = wrap.querySelector("#saleCancelNewCustomerBtn");
  const useNewCustomerBtn = wrap.querySelector("#saleUseNewCustomerBtn");
  const categorySelect = wrap.querySelector("#saleCustomerCategory");
  const itemHint = wrap.querySelector("[data-item-hint]");
  const productSearchInput = wrap.querySelector("#saleProductSearch");
  const productScanBtn = wrap.querySelector("#saleProductScanBtn");
  const productResults = wrap.querySelector("#saleProductResults");
  const cartWrap = wrap.querySelector("#saleCartWrap");
  const totalEl = wrap.querySelector("#saleTotal");
  const saveBtn = wrap.querySelector("#saleSaveBtn");

  wrap.querySelector("#saleCancelBtn").addEventListener("click", close);

  // ---------- Customer picker ----------

  function pickCustomer(c) {
    selectedCustomer = c;
    newCustomerDraft = null;
    newCustomerForm.style.display = "none";
    customerSearchWrap.style.display = "none";
    customerPicked.style.display = "flex";
    customerPicked.querySelector("[data-picked-name]").textContent = c.Nama_Customer;
    customerPicked.querySelector("[data-picked-kategori]").textContent = selectedCategory ? `Kategori transaksi: ${selectedCategory}` : "Kategori transaksi belum dipilih";
    customerResults.innerHTML = "";
    customerSearchInput.value = "";
    enableProductsForCustomer();
  }

  customerPicked.querySelector("[data-change-customer]").addEventListener("click", () => {
    selectedCustomer = null;
    newCustomerDraft = null;
    customerPicked.style.display = "none";
    newCustomerForm.style.display = "none";
    customerSearchWrap.style.display = "block";
    itemHint.style.display = "";
    productSearchInput.disabled = true;
    productSearchInput.placeholder = "Pilih customer dan kategori dulu";
    productScanBtn.disabled = true;
  });

  function enableProductsForCustomer() {
    const ready = !!selectedCustomer && !!selectedCategory;
    itemHint.style.display = ready ? "none" : "";
    productSearchInput.disabled = !ready;
    productSearchInput.placeholder = ready ? "Cari nama, barcode, atau ID barang..." : "Pilih customer dan kategori dulu";
    productScanBtn.disabled = !ready;
  }

  categorySelect.addEventListener("change", () => {
    selectedCategory = categorySelect.value.trim();
    if (selectedCustomer) {
      customerPicked.querySelector("[data-picked-kategori]").textContent = selectedCategory ? `Kategori transaksi: ${selectedCategory}` : "Kategori transaksi belum dipilih";
    }
    productSearchInput.value = "";
    productResults.innerHTML = "";
    cart.splice(0, cart.length);
    renderCart();
    enableProductsForCustomer();
  });

  function showNewCustomerForm() {
    customerSearchWrap.style.display = "none";
    customerPicked.style.display = "none";
    newCustomerForm.style.display = "block";
    customerResults.innerHTML = "";
    wrap.querySelector("#saleNewCustomerName").focus();
  }

  function hideNewCustomerForm() {
    newCustomerForm.style.display = "none";
    customerSearchWrap.style.display = "block";
    newCustomerDraft = null;
  }

  newCustomerBtn.addEventListener("click", showNewCustomerForm);
  cancelNewCustomerBtn.addEventListener("click", hideNewCustomerForm);

  useNewCustomerBtn.addEventListener("click", () => {
    const name = wrap.querySelector("#saleNewCustomerName").value.trim();
    const email = wrap.querySelector("#saleNewCustomerEmail").value.trim();
    if (!name) { toast.error("Nama customer wajib diisi."); return; }
    if (!selectedCategory) { toast.error("Pilih kategori pelanggan untuk transaksi ini."); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error("Format email tidak valid."); return; }
    newCustomerDraft = {
      Nama_Customer: name,
      No_HP: wrap.querySelector("#saleNewCustomerPhone").value.trim(),
      Email: email,
      Alamat: wrap.querySelector("#saleNewCustomerAddress").value.trim(),
      Catatan: "",
      Aktif: true,
    };
    selectedCustomer = { ...newCustomerDraft, ID_Customer: null, _isNew: true };
    newCustomerForm.style.display = "none";
    customerSearchWrap.style.display = "none";
    customerPicked.style.display = "flex";
    customerPicked.querySelector("[data-picked-name]").textContent = `${name} (baru)`;
    customerPicked.querySelector("[data-picked-kategori]").textContent = `Kategori transaksi: ${selectedCategory}`;
    enableProductsForCustomer();
  });

  customerSearchInput.addEventListener(
    "input",
    debounce(async (e) => {
      const q = e.target.value.trim();
      if (!q) {
        customerResults.innerHTML = "";
        return;
      }
      try {
        const res = await Api.get("/customers", { search: q, limit: 8 });
        renderCustomerResults(res.data.filter((r) => r.Aktif));
      } catch {
        // biarkan user coba lagi lewat input
      }
    }, 300)
  );

  function renderCustomerResults(rows) {
    customerResults.innerHTML = "";
    if (rows.length === 0) {
      customerResults.innerHTML = `<div class="text-muted" style="padding:8px 2px;">Customer tidak ditemukan.</div>`;
      return;
    }
    rows.forEach((r) => {
      const item = document.createElement("div");
      item.className = "search-result-item";
      item.innerHTML = `<strong>${escapeHtml(r.Nama_Customer)}</strong>`;
      item.addEventListener("click", () => pickCustomer(r));
      customerResults.appendChild(item);
    });
  }

  // ---------- Product picker ----------

  productSearchInput.addEventListener(
    "input",
    debounce(async (e) => {
      const q = e.target.value.trim();
      if (!q || !selectedCustomer || !selectedCategory) {
        productResults.innerHTML = "";
        return;
      }
      try {
        const res = await Api.get("/inventory", {
  search: q,
  limit: 8,
});

renderProductResults(
  res.data.filter((p) => p.Aktif)
);
      } catch {
        // biarkan user coba lagi lewat input
      }
    }, 300)
  );

  function renderProductResults(rows) {
    productResults.innerHTML = "";
    if (rows.length === 0) {
      productResults.innerHTML = `<div class="text-muted" style="padding:8px 2px;">Barang tidak ditemukan.</div>`;
      return;
    }
    rows.forEach((r) => {
  const stok = Number(r.Stok_Saat_Ini || 0);

  const item = document.createElement("div");
  item.className = "search-result-item";

  const stokLabel =
    stok > 0
      ? `stok ${stok}`
      : `<span class="text-danger">stok habis</span>`;

  item.innerHTML = `
    ${escapeHtml(r.Nama_Barang)}
    <span class="text-muted">— ${stokLabel}</span>
  `;

  if (stok > 0) {
    item.addEventListener("click", () => addToCart(r));
  } else {
    item.style.opacity = "0.5";
  }

  productResults.appendChild(item);
});
  }

  productScanBtn.addEventListener("click", () => {
    if (!selectedCustomer || !selectedCategory) return; // tombol seharusnya disabled, jaga-jaga saja
    scanProduct({
      title: "Scan Barang",
      // Kondisi 2 di PRD section 13 — "1 produk -> langsung pilih" — di sini
      // artinya langsung masuk keranjang, sama seperti klik hasil pencarian.
      onFound: (product) => addToCart(product),
    });
  });

  async function addToCart(product) {
  try {
    const stokTersedia = Number(product.Stok_Saat_Ini || 0);

    if (stokTersedia <= 0) {
      toast.error(`Stok ${product.Nama_Barang} habis.`);
      return;
    }

    const res = await Api.get(`/products/${product.ID_Barang}/prices`);

    const priceRow = res.data.find(
      (p) =>
        p.Kategori_Pelanggan === selectedCategory &&
        p.Aktif
    );

    if (!priceRow) {
      toast.error(
        `Harga ${product.Nama_Barang} untuk kategori ${selectedCategory} belum diatur.`
      );
      return;
    }

    const existing = cart.find(
      (i) => i.ID_Barang === product.ID_Barang
    );

    if (existing) {
      if (existing.Qty + 1 > stokTersedia) {
        toast.error(
          `Stok ${product.Nama_Barang} tersisa ${stokTersedia}.`
        );
        return;
      }

      existing.Qty += 1;
    } else {
      cart.push({
        ID_Barang: product.ID_Barang,
        Nama_Barang: product.Nama_Barang,
        Stok_Saat_Ini: stokTersedia,
        Qty: 1,
        Harga_Satuan: priceRow.Harga_Default,
        Harga_Default: priceRow.Harga_Default,
        Boleh_Edit_Harga: !!priceRow.Boleh_Edit_Harga,
      });
    }

    productSearchInput.value = "";
    productResults.innerHTML = "";

    renderCart();
  } catch (err) {
    console.error(err);
    toast.error("Gagal mengambil harga barang.");
  }
}

  // ---------- Cart ----------

  function renderCart() {
    if (cart.length === 0) {
      cartWrap.innerHTML = `<div class="text-muted" style="padding:14px 0;">Belum ada barang ditambahkan.</div>`;
      totalEl.textContent = formatRupiah(0);
      saveBtn.disabled = true;
      return;
    }
    saveBtn.disabled = false;

    const table = document.createElement("table");
    table.className = "data-table";
    const thead = document.createElement("thead");
    thead.innerHTML = `<tr><th>Barang</th><th style="width:86px;">Qty</th><th style="width:140px;">Harga</th><th style="text-align:right;">Subtotal</th><th></th></tr>`;
    const tbody = document.createElement("tbody");

    cart.forEach((item, idx) => {
      const tr = document.createElement("tr");

      const nameTd = document.createElement("td");
      nameTd.innerHTML = `${escapeHtml(item.Nama_Barang)} ${item.Boleh_Edit_Harga ? '<span class="badge badge--warning" style="margin-left:4px;">Harga dapat diedit</span>' : ""}`;

      const qtyTd = document.createElement("td");
      const qtyInput = document.createElement("input");
      qtyInput.type = "number";
      qtyInput.min = "1";
      qtyInput.max = String(item.Stok_Saat_Ini);
      qtyInput.value = item.Qty;
      qtyInput.className = "field__control";
      qtyInput.style.padding = "6px 8px";
      qtyInput.addEventListener("change", () => {
        let v = Math.max(1, Math.floor(Number(qtyInput.value) || 1));
        if (v > item.Stok_Saat_Ini) {
          toast.error(`Stok ${item.Nama_Barang} tersisa ${item.Stok_Saat_Ini}.`);
          v = item.Stok_Saat_Ini;
        }
        item.Qty = v;
        renderCart();
      });
      qtyTd.appendChild(qtyInput);

      const hargaTd = document.createElement("td");
      const hargaInput = document.createElement("input");
      hargaInput.type = "number";
      hargaInput.min = "0";
      hargaInput.step = "100";
      hargaInput.value = item.Harga_Satuan;
      hargaInput.className = "field__control";
      hargaInput.style.padding = "6px 8px";
      hargaInput.title = item.Boleh_Edit_Harga ? "Harga transaksi dapat diubah tanpa mengubah harga master" : "Harga untuk kategori ini terkunci";
      hargaInput.disabled = !item.Boleh_Edit_Harga;
      hargaInput.addEventListener("change", () => {
        const v = Number(hargaInput.value);
        if (!Number.isFinite(v) || v < 0) {
          toast.error("Harga harus berupa angka 0 atau lebih.");
          hargaInput.value = item.Harga_Satuan;
          return;
        }
        item.Harga_Satuan = v;
        renderCart();
      });
      hargaTd.appendChild(hargaInput);

      const subtotalTd = document.createElement("td");
      subtotalTd.style.textAlign = "right";
      subtotalTd.textContent = formatRupiah(item.Qty * item.Harga_Satuan);

      const removeTd = document.createElement("td");
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "btn btn--ghost btn--icon";
      removeBtn.setAttribute("aria-label", "Hapus");
      removeBtn.textContent = "✕";
      removeBtn.addEventListener("click", () => {
        cart.splice(idx, 1);
        renderCart();
      });
      removeTd.appendChild(removeBtn);

      tr.appendChild(nameTd);
      tr.appendChild(qtyTd);
      tr.appendChild(hargaTd);
      tr.appendChild(subtotalTd);
      tr.appendChild(removeTd);
      tbody.appendChild(tr);
    });

    table.appendChild(thead);
    table.appendChild(tbody);

    const tableWrap = document.createElement("div");
    tableWrap.className = "table-wrap";
    tableWrap.appendChild(table);
    cartWrap.innerHTML = "";
    cartWrap.appendChild(tableWrap);

    const total = cart.reduce((sum, i) => sum + i.Qty * i.Harga_Satuan, 0);
    totalEl.textContent = formatRupiah(total);
  }

  renderCart();

  // ---------- Simpan ----------

  saveBtn.addEventListener("click", async () => {
    if (!selectedCustomer) {
      toast.error("Pilih customer lama atau tambah customer baru.");
      return;
    }
    if (!selectedCategory) {
      toast.error("Pilih kategori pelanggan untuk transaksi ini.");
      return;
    }
    if (cart.length === 0) {
      toast.error("Tambahkan minimal 1 barang.");
      return;
    }
    let customerForSale = selectedCustomer;
    const payload = {
      ID_Customer: selectedCustomer.ID_Customer,
      Kategori_Pelanggan: selectedCategory,
      Items: cart.map((i) => ({
        ID_Barang: i.ID_Barang,
        Qty: i.Qty,
        // Kategori pelanggan adalah milik transaksi, bukan master customer.
      // Hanya kirim override jika barang ini memang boleh diedit manual —
        // backend tetap memvalidasi ulang (PRD section 17, 35).
        Harga_Satuan: i.Harga_Satuan,
      })),
      Status_Bayar: wrap.querySelector("#saleStatus").value,
      Metode_Bayar: wrap.querySelector("#saleMetode").value,
      Catatan: wrap.querySelector("#saleCatatan").value,
    };

    saveBtn.disabled = true;
    const originalLabel = saveBtn.textContent;
    saveBtn.textContent = "Menyimpan...";
    try {
      if (newCustomerDraft) {
        const customerRes = await Api.post("/customers", newCustomerDraft);
        customerForSale = customerRes.data;
        payload.ID_Customer = customerForSale.ID_Customer;
      }
      await Api.post("/sales", payload);
      toast.success("Transaksi tersimpan.");
      close();
      onSaved();
    } catch (err) {
      toast.error(err.message || "Gagal menyimpan transaksi.");
      saveBtn.disabled = false;
      saveBtn.textContent = originalLabel;
    }
  });
}

// ---------------------------------------------------------------------------
// Entry point halaman
// ---------------------------------------------------------------------------

export function initSales() {
  const root = document.querySelector("#salesRoot");
  if (!root) return;

  root.innerHTML = `
    <div class="card__header">
      <div class="search-input">
        <span>🔍</span>
        <input type="text" placeholder="Cari ID transaksi atau customer..." id="saleSearch" />
      </div>
      <button class="btn btn--primary" id="addSaleBtn">+ Transaksi Baru</button>
    </div>
    <div id="salesTable"></div>
    <div id="salesPagination"></div>
  `;

  const table = createDataTable({
    container: document.querySelector("#salesTable"),
    emptyMessage: "Belum ada transaksi penjualan.",
    emptyAction: { label: "+ Transaksi Baru", onClick: () => openAdd() },
    columns: [
      { key: "ID_Trx", label: "ID Transaksi" },
      { key: "Tanggal", label: "Tanggal" },
      { key: "Nama_Customer", label: "Customer" },
      { key: "Total", label: "Total", align: "right", render: (r) => formatRupiah(r.Total) },
      {
        key: "Status_Bayar",
        label: "Status Bayar",
        render: (r) => `<span class="badge badge--${statusBayarBadge(r.Status_Bayar)}">${escapeHtml(r.Status_Bayar)}</span>`,
      },
      { key: "Metode_Bayar", label: "Metode" },
    ],
    rowActions: (row) => {
      const wrap = document.createElement("div");
      wrap.style.display = "flex";
      wrap.style.gap = "6px";
      wrap.style.justifyContent = "flex-end";

      const viewBtn = document.createElement("button");
      viewBtn.className = "btn btn--sm";
      viewBtn.textContent = "Lihat";
      viewBtn.addEventListener("click", () => openSaleDetail(row));

      const printLink = document.createElement("a");
      printLink.className = "btn btn--sm";
      printLink.textContent = "🖨️ Cetak";
      printLink.href = `print-nota.html?id=${encodeURIComponent(row.ID_Trx)}`;
      printLink.target = "_blank";
      printLink.rel = "noopener";

      const toggleBtn = document.createElement("button");
      toggleBtn.className = row.Aktif === false ? "btn btn--sm" : "btn btn--sm btn--danger";
      toggleBtn.textContent = row.Aktif === false ? "Aktifkan" : "Hapus";
      toggleBtn.addEventListener("click", async () => {
        const isActive = row.Aktif !== false;
        const action = isActive ? "membatalkan" : "mengaktifkan kembali";
        if (!window.confirm(`Yakin ingin ${action} transaksi ${row.ID_Trx}?`)) return;
        try {
          await Api.put(`/sales/${row.ID_Trx}`, { Aktif: !isActive });
          toast.success(isActive ? "Transaksi dibatalkan." : "Transaksi diaktifkan kembali.");
          load();
        } catch (err) {
          toast.error(err.message || "Gagal mengubah status transaksi.");
        }
      });

      wrap.appendChild(viewBtn);
      wrap.appendChild(printLink);
      wrap.appendChild(toggleBtn);
      return wrap;
    },
  });

  const pager = createPagination({
    container: document.querySelector("#salesPagination"),
    onChange: (page) => {
      listState.page = page;
      load();
    },
  });

  function openAdd() {
    openNewSaleModal({ onSaved: load });
  }

  async function load() {
    table.setLoading();
    try {
      const res = await Api.get("/sales", { search: listState.search, page: listState.page, limit: listState.limit });
      table.setRows(res.data);
      pager.update(res.pagination);
    } catch (err) {
      table.setError("Gagal memuat data transaksi.", load);
    }
  }

  document.querySelector("#addSaleBtn").addEventListener("click", () => openAdd());
  document.querySelector("#saleSearch").addEventListener(
    "input",
    debounce((e) => {
      listState.search = e.target.value;
      listState.page = 1;
      load();
    }, 350)
  );

  load();
}
