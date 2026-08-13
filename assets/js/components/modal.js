/**
 * components/modal.js — modal generik untuk form tambah/edit & konfirmasi.
 *
 * Usage:
 *   import { openModal } from "../components/modal.js";
 *   const close = openModal({
 *     title: "Tambah Supplier",
 *     bodyNode: formElement,          // Node, biasanya <form>
 *     confirmLabel: "Simpan",
 *     onConfirm: async () => { ... }, // boleh async; modal tetap terbuka jika throw
 *   });
 */

export function openModal({ title, bodyNode, confirmLabel = "Simpan", cancelLabel = "Batal", onConfirm, hideFooter = false, size }) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  const modal = document.createElement("div");
  modal.className = "modal" + (size ? ` modal--${size}` : "");

  const header = document.createElement("div");
  header.className = "modal__header";
  header.innerHTML = `<h3>${title}</h3>`;
  const closeBtn = document.createElement("button");
  closeBtn.className = "btn btn--ghost btn--icon";
  closeBtn.setAttribute("aria-label", "Tutup");
  closeBtn.textContent = "✕";
  header.appendChild(closeBtn);

  const body = document.createElement("div");
  body.className = "modal__body";
  if (bodyNode) body.appendChild(bodyNode);

  modal.appendChild(header);
  modal.appendChild(body);

  if (!hideFooter) {
    const footer = document.createElement("div");
    footer.className = "modal__footer";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "btn";
    cancelBtn.textContent = cancelLabel;
    cancelBtn.addEventListener("click", close);

    const confirmBtn = document.createElement("button");
    confirmBtn.className = "btn btn--primary";
    confirmBtn.textContent = confirmLabel;
    confirmBtn.addEventListener("click", async () => {
      if (!onConfirm) return close();
      confirmBtn.disabled = true;
      const originalLabel = confirmBtn.textContent;
      confirmBtn.textContent = "Menyimpan...";
      try {
        await onConfirm();
        close();
      } catch (err) {
        // onConfirm sudah bertanggung jawab menampilkan toast error;
        // modal tetap terbuka supaya user bisa perbaiki input.
        confirmBtn.disabled = false;
        confirmBtn.textContent = originalLabel;
      }
    });

    footer.appendChild(cancelBtn);
    footer.appendChild(confirmBtn);
    modal.appendChild(footer);
  }

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  function close() {
    overlay.remove();
    document.removeEventListener("keydown", onKeydown);
  }

  function onKeydown(e) {
    if (e.key === "Escape") close();
  }

  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener("keydown", onKeydown);

  return close;
}

export function confirmDialog({ title = "Konfirmasi", message, confirmLabel = "Ya" }) {
  return new Promise((resolve) => {
    let decided = false;
    const body = document.createElement("p");
    body.textContent = message;
    openModal({
      title,
      bodyNode: body,
      confirmLabel,
      onConfirm: () => {
        decided = true;
        resolve(true);
      },
    });
    // Batal / tutup (X, overlay, Escape) berarti "tidak".
    // openModal tidak memberi hook onClose, jadi kita amati penghapusan overlay.
    const overlay = document.querySelector(".modal-overlay:last-of-type");
    if (overlay) {
      const observer = new MutationObserver(() => {
        if (!document.body.contains(overlay)) {
          observer.disconnect();
          if (!decided) resolve(false);
        }
      });
      observer.observe(document.body, { childList: true });
    }
  });
}
