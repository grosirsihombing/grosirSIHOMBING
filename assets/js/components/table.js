/**
 * components/table.js — render tabel data + loading/empty/error state
 * (PRD section 57-60).
 *
 * Usage:
 *   const table = createDataTable({
 *     container: document.querySelector("#productsTable"),
 *     columns: [
 *       { key: "Nama_Barang", label: "Nama Barang" },
 *       { key: "Harga", label: "Harga", align: "right", render: (row) => formatRupiah(row.Harga) },
 *     ],
 *     emptyMessage: "Belum ada barang.",
 *     emptyAction: { label: "+ Tambah Barang", onClick: () => openAddModal() },
 *   });
 *
 *   table.setLoading();
 *   table.setError("Data gagal dimuat.", retryFn);
 *   table.setRows(rows);
 */

export function createDataTable({ container, columns, emptyMessage = "Belum ada data.", emptyAction, rowActions }) {
  function wrap(inner) {
    container.innerHTML = "";
    container.appendChild(inner);
  }

  function setLoading() {
    const block = document.createElement("div");
    block.className = "table-wrap";
    block.innerHTML = `
      <div style="padding:16px;">
        ${Array.from({ length: 5 })
          .map(() => `<div class="skeleton-row" style="margin-bottom:10px;"></div>`)
          .join("")}
      </div>`;
    wrap(block);
  }

  function setError(message = "Data gagal dimuat.", onRetry) {
    const block = document.createElement("div");
    block.className = "state-block state-block--error table-wrap";
    block.innerHTML = `<div>${message}</div><div>Silakan coba lagi.</div>`;
    if (onRetry) {
      const btn = document.createElement("button");
      btn.className = "btn btn--sm";
      btn.textContent = "Coba Lagi";
      btn.addEventListener("click", onRetry);
      block.appendChild(btn);
    }
    wrap(block);
  }

  function setEmpty() {
    const block = document.createElement("div");
    block.className = "state-block table-wrap";
    block.innerHTML = `<div>${emptyMessage}</div>`;
    if (emptyAction) {
      const btn = document.createElement("button");
      btn.className = "btn btn--primary btn--sm";
      btn.textContent = emptyAction.label;
      btn.addEventListener("click", emptyAction.onClick);
      block.appendChild(btn);
    }
    wrap(block);
  }

  function setRows(rows) {
    if (!rows || rows.length === 0) return setEmpty();

    const tableWrap = document.createElement("div");
    tableWrap.className = "table-wrap";

    const table = document.createElement("table");
    table.className = "data-table";

    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    columns.forEach((col) => {
      const th = document.createElement("th");
      th.textContent = col.label;
      if (col.align === "right") th.style.textAlign = "right";
      headRow.appendChild(th);
    });
    if (rowActions) headRow.appendChild(document.createElement("th"));
    thead.appendChild(headRow);

    const tbody = document.createElement("tbody");
    rows.forEach((row) => {
      const tr = document.createElement("tr");
      columns.forEach((col) => {
        const td = document.createElement("td");
        if (col.align === "right") td.style.textAlign = "right";
        const value = col.render ? col.render(row) : row[col.key];
        if (value instanceof Node) td.appendChild(value);
        else td.innerHTML = value ?? "";
        tr.appendChild(td);
      });
      if (rowActions) {
        const td = document.createElement("td");
        td.style.textAlign = "right";
        td.style.whiteSpace = "nowrap";
        td.appendChild(rowActions(row));
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    wrap(tableWrap);
  }

  return { setLoading, setError, setEmpty, setRows };
}
