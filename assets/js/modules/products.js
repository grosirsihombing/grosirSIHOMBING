/**
 * modules/products.js — Modul Master Barang + Harga (PRD section 9-19).
 */

import Api from "../core/api.js";
import { toast } from "../components/toast.js";
import { openModal } from "../components/modal.js";
import { createDataTable } from "../components/table.js";
import { createPagination } from "../components/pagination.js";
import { scanProduct } from "../components/scanner.js";
import { debounce, formatRupiah, escapeHtml } from "../core/utils.js";

const state = { page: 1, limit: 20, search: "" };

function productForm(existing) {
  const form = document.createElement("form");
  form.innerHTML = `
    <div class="field">
      <label class="field__label">Nama Barang</label>
      <input class="field__control" name="Nama_Barang" required value="${escapeHtml(existing?.Nama_Barang || "")}" />
    </div>
    <div class="field">
      <label class="field__label">Barcode <span class="optional">(opsional, boleh sama dengan barang lain)</span></label>
      <input class="field__control" name="Barcode" value="${escapeHtml(existing?.Barcode || "")}" />
    </div>
    <div class="field">
      <label class="field__label">Tipe Komoditi</label>
      <input class="field__control" name="Tipe_Komoditi" value="${escapeHtml(existing?.Tipe_Komoditi || "")}" />
    </div>
    <div class="field">
      <label class="field__label">Stok Awal</label>
      <input class="field__control" type="number" min="0" name="Stok_Awal" value="${existing?.Stok_Awal ?? 0}" />
    </div>
    <div class="field">
      <label class="field__label"><input type="checkbox" name="Aktif" ${existing?.Aktif !== false ? "checked" : ""} /> Aktif (dijual)</label>
    </div>
  `;
  return form;
}

function readProductForm(form) {
  const fd = new FormData(form);
  return {
    Nama_Barang: fd.get("Nama_Barang"),
    Barcode: fd.get("Barcode") || "",
    Tipe_Komoditi: fd.get("Tipe_Komoditi") || "",
    Stok_Awal: Number(fd.get("Stok_Awal")) || 0,
    Aktif: fd.get("Aktif") === "on",
  };
}

function openProductModal({ existing, onSaved }) {
  const form = productForm(existing);
  openModal({
    title: existing ? "Edit Barang" : "Tambah Barang",
    bodyNode: form,
    confirmLabel: "Simpan",
    onConfirm: async () => {
      if (!form.reportValidity()) throw new Error("invalid");
      const payload = readProductForm(form);
      try {
        if (existing) {
          await Api.put(`/products/${existing.ID_Barang}`, payload);
        } else {
          await Api.post("/products", payload);
        }
        toast.success("Barang tersimpan.");
        onSaved();
      } catch (err) {
        toast.error(err.message || "Gagal menyimpan barang.");
        throw err;
      }
    },
  });
}

function priceForm(kategori, existing) {
  const form = document.createElement("form");
  form.innerHTML = `
    <div class="field">
      <label class="field__label">Kategori Pelanggan</label>
      <input class="field__control" name="Kategori_Pelanggan" required value="${escapeHtml(kategori || existing?.Kategori_Pelanggan || "")}" ${existing ? "readonly" : ""} />
    </div>
    <div class="field">
      <label class="field__label">Harga Default</label>
      <input class="field__control" type="number" min="0" name="Harga_Default" required value="${existing?.Harga_Default ?? 0}" />
    </div>
    <div class="field">
      <label class="field__label"><input type="checkbox" name="Boleh_Edit_Harga" ${existing?.Boleh_Edit_Harga ? "checked" : ""} /> Boleh diedit manual saat transaksi</label>
      <div class="text-muted" style="font-size:12px; margin-top:4px;">Aktifkan untuk komoditi yang harganya bisa berubah-ubah (mis. isi ulang galon) — PRD section 17.</div>
    </div>
  `;
  return form;
}

function openPriceModal({ productId, kategori, existing, onSaved }) {
  const form = priceForm(kategori, existing);
  openModal({
    title: existing ? `Edit Harga — ${existing.Kategori_Pelanggan}` : "Tambah Harga Kategori",
    bodyNode: form,
    confirmLabel: "Simpan",
    onConfirm: async () => {
      if (!form.reportValidity()) throw new Error("invalid");
      const fd = new FormData(form);
      const payload = {
        Kategori_Pelanggan: fd.get("Kategori_Pelanggan"),
        Harga_Default: Number(fd.get("Harga_Default")),
        Boleh_Edit_Harga: fd.get("Boleh_Edit_Harga") === "on",
      };
      try {
        await Api.put(`/products/${productId}/prices`, payload);
        toast.success("Harga tersimpan.");
        onSaved();
      } catch (err) {
        toast.error(err.message || "Gagal menyimpan harga.");
        throw err;
      }
    },
  });
}

async function openPricesPanel(product) {
  const wrap = document.createElement("div");
  wrap.innerHTML = `<div class="text-muted" style="margin-bottom:10px;">Harga per kategori pelanggan untuk <strong>${escapeHtml(product.Nama_Barang)}</strong>.</div>`;
  const list = document.createElement("div");
  wrap.appendChild(list);

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "btn btn--sm";
  addBtn.textContent = "+ Kategori Baru";
  addBtn.style.marginTop = "10px";
  wrap.appendChild(addBtn);

  async function refresh() {
    list.innerHTML = `<div class="skeleton-row" style="margin-bottom:8px;"></div>`;
    try {
      const res = await Api.get(`/products/${product.ID_Barang}/prices`);
      const rows = res.data;
      list.innerHTML = "";
      if (rows.length === 0) {
        list.innerHTML = `<div class="text-muted">Belum ada harga untuk barang ini.</div>`;
      }
      rows.forEach((row) => {
        const item = document.createElement("div");
        item.className = "card";
        item.style.marginBottom = "8px";
        item.style.display = "flex";
        item.style.justifyContent = "space-between";
        item.style.alignItems = "center";
        item.innerHTML = `
          <div>
            <strong>${escapeHtml(row.Kategori_Pelanggan)}</strong> — ${formatRupiah(row.Harga_Default)}
            ${row.Boleh_Edit_Harga ? '<span class="badge badge--warning" style="margin-left:6px;">Boleh diedit</span>' : ""}
          </div>
        `;
        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "btn btn--sm";
        editBtn.textContent = "Edit";
        editBtn.addEventListener("click", () => {
          openPriceModal({ productId: product.ID_Barang, existing: row, onSaved: refresh });
        });
        item.appendChild(editBtn);
        list.appendChild(item);
      });
    } catch (err) {
      list.innerHTML = `<div class="text-danger">Gagal memuat harga.</div>`;
    }
  }

  addBtn.addEventListener("click", () => {
    openPriceModal({ productId: product.ID_Barang, onSaved: refresh });
  });

  openModal({
    title: "Kelola Harga",
    bodyNode: wrap,
    hideFooter: true,
  });

  refresh();
}

export function initProducts() {
  const root = document.querySelector("#productsRoot");
  if (!root) return;

  root.innerHTML = `
    <div class="card__header">
      <div class="search-input">
        <span>🔍</span>
        <input type="text" placeholder="Cari nama, barcode, atau ID..." id="productSearch" />
      </div>
      <button class="btn" id="scanProductBtn" title="Scan barcode untuk cari/edit barang">📷 Scan</button>
      <button class="btn btn--primary" id="addProductBtn">+ Tambah Barang</button>
    </div>
    <div id="productsTable"></div>
    <div id="productsPagination"></div>
  `;

  const table = createDataTable({
    container: document.querySelector("#productsTable"),
    emptyMessage: "Belum ada barang.",
    emptyAction: { label: "+ Tambah Barang", onClick: () => openAdd() },
    columns: [
      { key: "ID_Barang", label: "ID" },
      { key: "Nama_Barang", label: "Nama Barang" },
      { key: "Barcode", label: "Barcode", render: (r) => r.Barcode || '<span class="text-muted">—</span>' },
      { key: "Tipe_Komoditi", label: "Tipe" },
      { key: "Stok_Awal", label: "Stok Awal", align: "right" },
      {
        key: "Aktif",
        label: "Status",
        render: (r) => `<span class="badge ${r.Aktif ? "badge--success" : "badge--neutral"}">${r.Aktif ? "Aktif" : "Nonaktif"}</span>`,
      },
    ],
    rowActions: (row) => {
      const wrap = document.createElement("div");
      wrap.style.display = "flex";
      wrap.style.gap = "6px";
      wrap.style.justifyContent = "flex-end";

      const priceBtn = document.createElement("button");
      priceBtn.className = "btn btn--sm";
      priceBtn.textContent = "Harga";
      priceBtn.addEventListener("click", () => openPricesPanel(row));

      const editBtn = document.createElement("button");
      editBtn.className = "btn btn--sm";
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => openAdd(row));

      const toggleBtn = document.createElement("button");
      toggleBtn.className = "btn btn--sm";
      toggleBtn.textContent = row.Aktif ? "Hapus" : "Aktifkan";
      toggleBtn.addEventListener("click", async () => {
        const action = row.Aktif ? "menonaktifkan" : "mengaktifkan";
        if (!confirm(`Yakin ingin ${action} barang "${row.Nama_Barang}"?`)) return;
        try {
          await Api.put(`/products/${encodeURIComponent(row.ID_Barang)}`, { Aktif: !row.Aktif });
          toast.success(row.Aktif ? "Barang dinonaktifkan." : "Barang diaktifkan kembali.");
          load();
        } catch (err) {
          toast.error(err.message || "Gagal mengubah status barang.");
        }
      });

      wrap.appendChild(priceBtn);
      wrap.appendChild(editBtn);
      wrap.appendChild(toggleBtn);
      return wrap;
    },
  });

  const pager = createPagination({
    container: document.querySelector("#productsPagination"),
    onChange: (page) => {
      state.page = page;
      load();
    },
  });

  function openAdd(existing) {
    openProductModal({ existing, onSaved: load });
  }

  async function load() {
    table.setLoading();
    try {
      const res = await Api.get("/products", { search: state.search, page: state.page, limit: state.limit });
      table.setRows(res.data);
      pager.update(res.pagination);
    } catch (err) {
      table.setError("Gagal memuat data barang.", load);
    }
  }

  document.querySelector("#addProductBtn").addEventListener("click", () => openAdd());
  document.querySelector("#scanProductBtn").addEventListener("click", () => {
    // Barang nonaktif tetap boleh ditemukan di sini — halaman Barang dipakai
    // untuk mengelola master data, bukan cuma barang yang sedang dijual
    // (beda dari sales.js/inventory.js yang hanya menerima barang aktif).
    scanProduct({
      filterAktif: false,
      onFound: (product) => openAdd(product),
    });
  });
  document.querySelector("#productSearch").addEventListener(
    "input",
    debounce((e) => {
      state.search = e.target.value;
      state.page = 1;
      load();
    }, 350)
  );

  load();
}
