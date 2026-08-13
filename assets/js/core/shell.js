/**
 * core/shell.js — dipakai di setiap halaman untuk render sidebar/topbar/bottom-nav
 * yang konsisten (PRD section 8 & 56) dan menandai menu aktif.
 */

import state from "./state.js";
import { registerServiceWorker } from "./pwa.js";
import { initInstallPrompt } from "../components/installPrompt.js";

// Menu utama sesuai PRD section 8
const NAV_ITEMS = [
  { href: "dashboard.html", icon: "🏠", label: "Dashboard", mobile: true },
  { href: "sales.html", icon: "🧾", label: "Penjualan", mobile: true },
  { href: "inventory.html", icon: "📦", label: "Stok", mobile: true },
  { href: "products.html", icon: "🏷️", label: "Barang", mobile: false },
  { href: "customers.html", icon: "👥", label: "Customer", mobile: false },
  { href: "suppliers.html", icon: "🚚", label: "Supplier", mobile: false },
  { href: "reports.html", icon: "📊", label: "Laporan", mobile: false },
];

export function renderShell({ activePage, pageTitle }) {
  // Phase 8: PWA -- daftarkan Service Worker & tampilkan banner "Pasang Aplikasi" di semua
  // halaman ber-shell (dipanggil sekali per page-load lewat renderShell, sama seperti nav).
  registerServiceWorker();
  initInstallPrompt();

  const brand = document.querySelector(".sidebar__brand");
  if (brand) {
    brand.innerHTML = `
      <a href="dashboard.html" class="sidebar__brand-link" aria-label="Toko Grosir SIHOMBING">
        <img class="sidebar__brand-logo" src="../assets/images/logo-sihombing.png" alt="Toko Grosir Minuman SIHOMBING" />
        <div class="sidebar__brand-text">
          <div class="sidebar__brand-name">Toko Grosir SIHOMBING</div>
          <div class="sidebar__brand-sub">Lengkap • Murah • Terpercaya</div>
        </div>
      </a>`;
  }

  const sidebarNav = document.querySelector("[data-sidebar-nav]");
  if (sidebarNav) {
    sidebarNav.innerHTML = "";
    NAV_ITEMS.forEach((item) => {
      const a = document.createElement("a");
      a.className = "sidebar__link" + (item.href === activePage ? " is-active" : "");
      a.href = item.href;
      a.innerHTML = `<span class="sidebar__link-icon">${item.icon}</span><span>${item.label}</span>`;
      sidebarNav.appendChild(a);
    });
  }

  const bottomNav = document.querySelector("[data-bottom-nav]");
  if (bottomNav) {
    bottomNav.innerHTML = "";
    const mobileItems = NAV_ITEMS.filter((i) => i.mobile);
    mobileItems.forEach((item) => {
      const a = document.createElement("a");
      a.className = "bottom-nav__item" + (item.href === activePage ? " is-active" : "");
      a.href = item.href;
      a.innerHTML = `<span class="bottom-nav__item-icon">${item.icon}</span><span>${item.label}</span>`;
      bottomNav.appendChild(a);
    });
    const more = document.createElement("a");
    more.className = "bottom-nav__item";
    more.href = "reports.html";
    more.innerHTML = `<span class="bottom-nav__item-icon">⋯</span><span>More</span>`;
    bottomNav.appendChild(more);
  }

  const titleEl = document.querySelector("[data-page-title]");
  if (titleEl) titleEl.textContent = pageTitle;

  const menuBtn = document.querySelector("[data-menu-toggle]");
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.querySelector("[data-sidebar-overlay]");
  if (menuBtn && sidebar && overlay) {
    menuBtn.addEventListener("click", () => {
      state.set({ sidebarOpen: true });
      sidebar.classList.add("is-open");
      overlay.classList.add("is-open");
    });
    overlay.addEventListener("click", () => {
      state.set({ sidebarOpen: false });
      sidebar.classList.remove("is-open");
      overlay.classList.remove("is-open");
    });
  }
}
