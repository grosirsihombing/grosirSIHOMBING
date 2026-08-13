/**
 * modules/suppliers.js — Modul Supplier (PRD section 23-25).
 */

import Api from "../core/api.js";
import { toast } from "../components/toast.js";
import { openModal } from "../components/modal.js";
import { createDataTable } from "../components/table.js";
import { createPagination } from "../components/pagination.js";
import { debounce, escapeHtml } from "../core/utils.js";

const state = { page: 1, limit: 20, search: "" };

function supplierForm(existing) {
  const form = document.createElement("form");
  form.innerHTML = `
    <div class="field">
      <label class="field__label">Nama Supplier</label>
      <input class="field__control" name="Nama_Supplier" required value="${escapeHtml(existing?.Nama_Supplier || "")}" />
    </div>
    <div class="field">
      <label class="field__label">No. HP <span class="optional">(opsional)</span></label>
      <input class="field__control" name="No_HP" value="${escapeHtml(existing?.No_HP || "")}" />
    </div>
    <div class="field">
      <label class="field__label">Email <span class="optional">(opsional)</span></label>
      <input class="field__control" type="email" name="Email" value="${escapeHtml(existing?.Email || "")}" />
    </div>
    <div class="field">
      <label class="field__label">Alamat <span class="optional">(opsional)</span></label>
      <textarea class="field__control" name="Alamat" rows="2">${escapeHtml(existing?.Alamat || "")}</textarea>
    </div>
    <div class="field">
      <label class="field__label">Catatan <span class="optional">(opsional)</span></label>
      <textarea class="field__control" name="Catatan" rows="2">${escapeHtml(existing?.Catatan || "")}</textarea>
    </div>
    <div class="field">
      <label class="field__label"><input type="checkbox" name="Aktif" ${existing?.Aktif !== false ? "checked" : ""} /> Aktif</label>
    </div>
  `;
  return form;
}

function readForm(form) {
  const fd = new FormData(form);
  return {
    Nama_Supplier: fd.get("Nama_Supplier"),
    No_HP: fd.get("No_HP") || "",
    Email: fd.get("Email") || "",
    Alamat: fd.get("Alamat") || "",
    Catatan: fd.get("Catatan") || "",
    Aktif: fd.get("Aktif") === "on",
  };
}

function openSupplierModal({ existing, onSaved }) {
  const form = supplierForm(existing);
  openModal({
    title: existing ? "Edit Supplier" : "Tambah Supplier",
    bodyNode: form,
    confirmLabel: "Simpan",
    onConfirm: async () => {
      if (!form.reportValidity()) throw new Error("invalid");
      const payload = readForm(form);
      try {
        if (existing) {
          await Api.put(`/suppliers/${existing.ID_Supplier}`, payload);
        } else {
          await Api.post("/suppliers", payload);
        }
        toast.success("Supplier tersimpan.");
        onSaved();
      } catch (err) {
        toast.error(err.message || "Gagal menyimpan supplier.");
        throw err;
      }
    },
  });
}

export function initSuppliers() {
  const root = document.querySelector("#suppliersRoot");
  if (!root) return;

  root.innerHTML = `
    <div class="card__header">
      <div class="search-input">
        <span>🔍</span>
        <input type="text" placeholder="Cari nama, HP, atau email..." id="supplierSearch" />
      </div>
      <button class="btn btn--primary" id="addSupplierBtn">+ Tambah Supplier</button>
    </div>
    <div id="suppliersTable"></div>
    <div id="suppliersPagination"></div>
  `;

  const table = createDataTable({
    container: document.querySelector("#suppliersTable"),
    emptyMessage: "Belum ada supplier.",
    emptyAction: { label: "+ Tambah Supplier", onClick: () => openAdd() },
    columns: [
      { key: "ID_Supplier", label: "ID" },
      { key: "Nama_Supplier", label: "Nama" },
      { key: "No_HP", label: "No. HP", render: (r) => r.No_HP || '<span class="text-muted">—</span>' },
      { key: "Email", label: "Email", render: (r) => r.Email || '<span class="text-muted">—</span>' },
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

      const editBtn = document.createElement("button");
      editBtn.className = "btn btn--sm";
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => openAdd(row));

      const toggleBtn = document.createElement("button");
      toggleBtn.className = "btn btn--sm";
      toggleBtn.textContent = row.Aktif ? "Hapus" : "Aktifkan";
      toggleBtn.addEventListener("click", async () => {
        const action = row.Aktif ? "menonaktifkan" : "mengaktifkan";
        if (!confirm(`Yakin ingin ${action} supplier "${row.Nama_Supplier}"?`)) return;
        try {
          await Api.put(`/suppliers/${encodeURIComponent(row.ID_Supplier)}`, { Aktif: !row.Aktif });
          toast.success(row.Aktif ? "Supplier dinonaktifkan." : "Supplier diaktifkan kembali.");
          load();
        } catch (err) {
          toast.error(err.message || "Gagal mengubah status supplier.");
        }
      });

      wrap.appendChild(editBtn);
      wrap.appendChild(toggleBtn);
      return wrap;
    },
  });

  const pager = createPagination({
    container: document.querySelector("#suppliersPagination"),
    onChange: (page) => {
      state.page = page;
      load();
    },
  });

  function openAdd(existing) {
    openSupplierModal({ existing, onSaved: load });
  }

  async function load() {
    table.setLoading();
    try {
      const res = await Api.get("/suppliers", { search: state.search, page: state.page, limit: state.limit });
      table.setRows(res.data);
      pager.update(res.pagination);
    } catch (err) {
      table.setError("Gagal memuat data supplier.", load);
    }
  }

  document.querySelector("#addSupplierBtn").addEventListener("click", () => openAdd());
  document.querySelector("#supplierSearch").addEventListener(
    "input",
    debounce((e) => {
      state.search = e.target.value;
      state.page = 1;
      load();
    }, 350)
  );

  load();
}
