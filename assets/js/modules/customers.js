/**
 * modules/customers.js — Modul Customer (PRD section 20-22).
 */

import Api from "../core/api.js";
import { toast } from "../components/toast.js";
import { openModal } from "../components/modal.js";
import { createDataTable } from "../components/table.js";
import { createPagination } from "../components/pagination.js";
import { debounce, escapeHtml } from "../core/utils.js";

const state = { page: 1, limit: 20, search: "" };

function customerForm(existing) {
  const form = document.createElement("form");
  form.innerHTML = `
    <div class="field">
      <label class="field__label">Nama Customer</label>
      <input class="field__control" name="Nama_Customer" required value="${escapeHtml(existing?.Nama_Customer || "")}" />
    </div>
    <div class="field">
      <label class="field__label">Kategori Pelanggan</label>
      <input class="field__control" name="Kategori_Pelanggan" list="kategoriList" required value="${escapeHtml(existing?.Kategori_Pelanggan || "Retail")}" />
      <datalist id="kategoriList">
        <option value="Retail"></option>
        <option value="Sub Agen"></option>
        <option value="User"></option>
      </datalist>
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
    Nama_Customer: fd.get("Nama_Customer"),
    Kategori_Pelanggan: fd.get("Kategori_Pelanggan"),
    No_HP: fd.get("No_HP") || "",
    Email: fd.get("Email") || "",
    Alamat: fd.get("Alamat") || "",
    Catatan: fd.get("Catatan") || "",
    Aktif: fd.get("Aktif") === "on",
  };
}

function openCustomerModal({ existing, onSaved }) {
  const form = customerForm(existing);
  openModal({
    title: existing ? "Edit Customer" : "Tambah Customer",
    bodyNode: form,
    confirmLabel: "Simpan",
    onConfirm: async () => {
      if (!form.reportValidity()) throw new Error("invalid");
      const payload = readForm(form);
      try {
        if (existing) {
          await Api.put(`/customers/${existing.ID_Customer}`, payload);
        } else {
          await Api.post("/customers", payload);
        }
        toast.success("Customer tersimpan.");
        onSaved();
      } catch (err) {
        toast.error(err.message || "Gagal menyimpan customer.");
        throw err;
      }
    },
  });
}

export function initCustomers() {
  const root = document.querySelector("#customersRoot");
  if (!root) return;

  root.innerHTML = `
    <div class="card__header">
      <div class="search-input">
        <span>🔍</span>
        <input type="text" placeholder="Cari nama, HP, atau email..." id="customerSearch" />
      </div>
      <button class="btn btn--primary" id="addCustomerBtn">+ Tambah Customer</button>
    </div>
    <div id="customersTable"></div>
    <div id="customersPagination"></div>
  `;

  const table = createDataTable({
    container: document.querySelector("#customersTable"),
    emptyMessage: "Belum ada customer.",
    emptyAction: { label: "+ Tambah Customer", onClick: () => openAdd() },
    columns: [
      { key: "ID_Customer", label: "ID" },
      { key: "Nama_Customer", label: "Nama" },
      { key: "Kategori_Pelanggan", label: "Kategori" },
      { key: "No_HP", label: "No. HP", render: (r) => r.No_HP || '<span class="text-muted">—</span>' },
      { key: "Email", label: "Email", render: (r) => r.Email || '<span class="text-muted">—</span>' },
      {
        key: "Aktif",
        label: "Status",
        render: (r) => `<span class="badge ${r.Aktif ? "badge--success" : "badge--neutral"}">${r.Aktif ? "Aktif" : "Nonaktif"}</span>`,
      },
    ],
    rowActions: (row) => {
      const editBtn = document.createElement("button");
      editBtn.className = "btn btn--sm";
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => openAdd(row));
      return editBtn;
    },
  });

  const pager = createPagination({
    container: document.querySelector("#customersPagination"),
    onChange: (page) => {
      state.page = page;
      load();
    },
  });

  function openAdd(existing) {
    openCustomerModal({ existing, onSaved: load });
  }

  async function load() {
    table.setLoading();
    try {
      const res = await Api.get("/customers", { search: state.search, page: state.page, limit: state.limit });
      table.setRows(res.data);
      pager.update(res.pagination);
    } catch (err) {
      table.setError("Gagal memuat data customer.", load);
    }
  }

  document.querySelector("#addCustomerBtn").addEventListener("click", () => openAdd());
  document.querySelector("#customerSearch").addEventListener(
    "input",
    debounce((e) => {
      state.search = e.target.value;
      state.page = 1;
      load();
    }, 350)
  );

  load();
}
