/**
 * modules/dashboard.js — PRD section 44-45.
 * Dashboard TIDAK mengambil seluruh data transaksi ke browser; hanya
 * memanggil satu endpoint agregasi: GET /api/dashboard/summary.
 *
 * Phase 6: menambah "Penjualan periode tertentu" (section 44) di atas
 * "Penjualan hari ini" yang sudah ada sejak Phase 1 — preset cepat (Hari
 * Ini/7/30 Hari/Bulan Ini) + rentang tanggal custom. Backend yang menghitung
 * totalnya (lihat getDashboardSummary di mockRepository.js); frontend cuma
 * mengirim `from`/`to` dan menampilkan hasilnya, sesuai section 45.
 */

import Api from "../core/api.js";
import { toast } from "../components/toast.js";
import { formatRupiah, formatDate } from "../core/utils.js";

// periodState kosong (undefined/undefined) berarti "pakai default backend"
// (7 hari terakhir) — begitu respons pertama datang, langsung disinkronkan
// ke from/to yang sesungguhnya dipakai backend (lihat load()).
const periodState = { from: undefined, to: undefined };
let activePreset = null;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoISO(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const PRESETS = {
  today: () => ({ from: todayISO(), to: todayISO() }),
  "7": () => ({ from: daysAgoISO(6), to: todayISO() }),
  "30": () => ({ from: daysAgoISO(29), to: todayISO() }),
  month: () => {
    const d = new Date();
    const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    return { from, to: todayISO() };
  },
};

const PRESET_LABELS = { today: "Hari Ini", 7: "7 Hari", 30: "30 Hari", month: "Bulan Ini" };

function summaryCard(label, value, hint) {
  const card = document.createElement("div");
  card.className = "card card--summary";
  card.innerHTML = `
    <div class="card__label">${label}</div>
    <div class="card__value">${value}</div>
    ${hint ? `<div class="card__hint">${hint}</div>` : ""}
  `;
  return card;
}

function renderLoading(root) {
  root.innerHTML = "";
  const grid = document.createElement("div");
  grid.className = "grid grid--summary";
  for (let i = 0; i < 6; i++) {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `<div class="skeleton-row" style="width:60%;margin-bottom:10px;"></div><div class="skeleton-row" style="width:40%;height:22px;"></div>`;
    grid.appendChild(card);
  }
  root.appendChild(grid);
}

function renderError(root, onRetry) {
  root.innerHTML = "";
  const block = document.createElement("div");
  block.className = "state-block state-block--error card";
  block.innerHTML = `<div>Data dashboard gagal dimuat.</div><div>Silakan coba lagi.</div>`;
  const btn = document.createElement("button");
  btn.className = "btn btn--sm";
  btn.textContent = "Coba Lagi";
  btn.addEventListener("click", onRetry);
  block.appendChild(btn);
  root.appendChild(block);
}

function renderSummary(root, data, onPeriodChange) {
  root.innerHTML = "";

  const summaryGrid = document.createElement("div");
  summaryGrid.className = "grid grid--summary";
  summaryGrid.appendChild(summaryCard("Total Barang", data.totalBarang ?? 0));
  summaryGrid.appendChild(summaryCard("Total Customer", data.totalCustomer ?? 0));
  summaryGrid.appendChild(summaryCard("Total Supplier", data.totalSupplier ?? 0));
  summaryGrid.appendChild(summaryCard("Total Stok", data.totalStok ?? 0, "unit, seluruh barang"));
  summaryGrid.appendChild(summaryCard("Penjualan Hari Ini", formatRupiah(data.penjualanHariIni)));
  summaryGrid.appendChild(summaryCard("Transaksi Hari Ini", data.jumlahTransaksiHariIni ?? 0));
  root.appendChild(summaryGrid);

  const twoCol = document.createElement("div");
  twoCol.className = "grid grid--two";
  twoCol.style.marginTop = "16px";

  // Inventory: stok rendah & habis (PRD section 44)
  const invCard = document.createElement("div");
  invCard.className = "card";
  invCard.innerHTML = `<div class="card__header"><h3>Inventory</h3></div>`;
  const invList = document.createElement("ul");
  const lowStock = data.stokRendah || [];
  const outOfStock = data.stokHabis || [];
  if (lowStock.length === 0 && outOfStock.length === 0) {
    invList.innerHTML = `<li class="text-muted">Tidak ada barang stok rendah/habis.</li>`;
  } else {
    outOfStock.forEach((item) => {
      const li = document.createElement("li");
      li.style.padding = "6px 0";
      li.innerHTML = `<span class="badge badge--danger">Habis</span> &nbsp;${item.nama} <span class="text-muted">(${item.stok})</span>`;
      invList.appendChild(li);
    });
    lowStock.forEach((item) => {
      const li = document.createElement("li");
      li.style.padding = "6px 0";
      li.innerHTML = `<span class="badge badge--warning">Rendah</span> &nbsp;${item.nama} <span class="text-muted">(${item.stok})</span>`;
      invList.appendChild(li);
    });
  }
  invCard.appendChild(invList);

  // Sales: hari ini + periode tertentu (PRD section 44)
  const periode = data.penjualanPeriode || {};
  const salesCard = document.createElement("div");
  salesCard.className = "card";
  salesCard.innerHTML = `
    <div class="card__header"><h3>Penjualan</h3></div>
    <p>Hari ini: <strong>${formatRupiah(data.penjualanHariIni)}</strong>
      <span class="text-muted">(${data.jumlahTransaksiHariIni ?? 0} transaksi)</span></p>

    <div class="dash-period">
      <div class="dash-period__presets" data-period-presets>
        ${Object.entries(PRESET_LABELS)
          .map(
            ([key, label]) =>
              `<button type="button" class="btn btn--sm${activePreset === key ? " btn--primary" : ""}" data-preset="${key}">${label}</button>`
          )
          .join("")}
      </div>
      <div class="dash-period__custom">
        <input type="date" class="field__control" id="dashPeriodFrom" value="${periode.from || ""}" />
        <span class="text-muted">s/d</span>
        <input type="date" class="field__control" id="dashPeriodTo" value="${periode.to || ""}" />
        <button type="button" class="btn btn--sm btn--primary" id="dashPeriodApply">Terapkan</button>
      </div>
    </div>

    <p class="text-muted" style="margin-top:10px;">
      Periode <strong>${formatDate(periode.from)} – ${formatDate(periode.to)}</strong>:
      <strong>${formatRupiah(periode.total ?? 0)}</strong>
      (${periode.jumlahTransaksi ?? 0} transaksi)
    </p>
  `;

  salesCard.querySelectorAll("[data-preset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.preset;
      activePreset = key;
      onPeriodChange(PRESETS[key]());
    });
  });

  salesCard.querySelector("#dashPeriodApply").addEventListener("click", () => {
    const from = salesCard.querySelector("#dashPeriodFrom").value;
    const to = salesCard.querySelector("#dashPeriodTo").value;
    if (!from || !to) {
      toast.error("Isi tanggal awal dan akhir periode.");
      return;
    }
    if (from > to) {
      toast.error("Tanggal awal tidak boleh melebihi tanggal akhir.");
      return;
    }
    activePreset = null;
    onPeriodChange({ from, to });
  });

  twoCol.appendChild(invCard);
  twoCol.appendChild(salesCard);
  root.appendChild(twoCol);
}

export async function initDashboard() {
  const root = document.querySelector("#dashboardRoot");
  if (!root) return;

  async function load() {
    renderLoading(root);
    try {
      const res = await Api.get("/dashboard/summary", periodState);
      // Sinkronkan periodState ke periode yang sesungguhnya dipakai backend
      // (penting saat periodState masih kosong -> backend isi default 7 hari).
      const periode = res.data.penjualanPeriode || {};
      periodState.from = periode.from;
      periodState.to = periode.to;
      renderSummary(root, res.data, (next) => {
        periodState.from = next.from;
        periodState.to = next.to;
        load();
      });
    } catch (err) {
      toast.error(err.message || "Gagal memuat dashboard.");
      renderError(root, load);
    }
  }

  load();
}
