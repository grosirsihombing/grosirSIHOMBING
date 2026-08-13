/**
 * components/pagination.js — PRD section 47: semua tabel besar wajib pagination.
 *
 * Usage:
 *   const pager = createPagination({
 *     container: el,
 *     onChange: (page) => loadPage(page),
 *   });
 *   pager.update({ page: 1, limit: 50, total: 236 });
 */

export function createPagination({ container, onChange }) {
  function update({ page, limit, total }) {
    container.innerHTML = "";
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const from = total === 0 ? 0 : (page - 1) * limit + 1;
    const to = Math.min(total, page * limit);

    const bar = document.createElement("div");
    bar.className = "pagination";

    const info = document.createElement("span");
    info.textContent = total === 0 ? "0 data" : `${from}–${to} dari ${total} data`;

    const controls = document.createElement("div");
    controls.className = "pagination__controls";

    const prevBtn = document.createElement("button");
    prevBtn.className = "btn btn--sm";
    prevBtn.textContent = "‹ Sebelumnya";
    prevBtn.disabled = page <= 1;
    prevBtn.addEventListener("click", () => onChange(page - 1));

    const nextBtn = document.createElement("button");
    nextBtn.className = "btn btn--sm";
    nextBtn.textContent = "Berikutnya ›";
    nextBtn.disabled = page >= totalPages;
    nextBtn.addEventListener("click", () => onChange(page + 1));

    controls.appendChild(prevBtn);
    controls.appendChild(nextBtn);
    bar.appendChild(info);
    bar.appendChild(controls);
    container.appendChild(bar);
  }

  return { update };
}
