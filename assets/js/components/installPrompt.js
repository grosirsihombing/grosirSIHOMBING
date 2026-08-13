/**
 * components/installPrompt.js — Phase 8: popup "Pasang Aplikasi" (PWA install prompt).
 *
 * - Chrome/Edge/Android: tangkap event `beforeinstallprompt`, tampilkan banner custom,
 *   baru panggil `prompt()` bawaan browser saat tombol "Pasang" diklik (PRD-style: UI konsisten
 *   dengan tampilan sendiri, bukan dialog native yang muncul tiba-tiba).
 * - iOS Safari: tidak pernah mengirim `beforeinstallprompt`, jadi ditampilkan instruksi manual
 *   ("Share -> Add to Home Screen") karena itu satu-satunya cara di iOS.
 * - Tidak tampil kalau app sudah berjalan sebagai installed app (`display-mode: standalone`),
 *   dan tidak tampil lagi selama masa "snooze" setelah user menutup banner (localStorage).
 *
 * Usage: import { initInstallPrompt } from "../components/installPrompt.js"; initInstallPrompt();
 */

const DISMISS_KEY = "zensheet_install_dismissed_until";
const INSTALLED_KEY = "zensheet_install_done";
const SNOOZE_DAYS = 14;
const SHOW_DELAY_MS = 1800;

let deferredPrompt = null;
let bannerEl = null;

function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.navigator.standalone === true // iOS Safari
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isSafari() {
  const ua = window.navigator.userAgent;
  return /safari/i.test(ua) && !/crios|fxios|edgios|chrome|android/i.test(ua);
}

function isDismissedForNow() {
  const until = Number(localStorage.getItem(DISMISS_KEY) || 0);
  return Date.now() < until;
}

function snoozeDismiss() {
  const until = Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000;
  localStorage.setItem(DISMISS_KEY, String(until));
}

function markInstalled() {
  localStorage.setItem(INSTALLED_KEY, "1");
}

function removeBanner() {
  bannerEl?.remove();
  bannerEl = null;
}

function buildBanner({ title, text, actionLabel, onAction }) {
  removeBanner();

  const el = document.createElement("div");
  el.className = "install-banner";
  el.innerHTML = `
    <img class="install-banner__icon" src="/assets/icons/icon-192.png" alt="" />
    <div class="install-banner__body">
      <div class="install-banner__title">${title}</div>
      <div class="install-banner__text">${text}</div>
    </div>
    <div class="install-banner__actions">
      ${actionLabel ? `<button type="button" class="btn btn--primary btn--sm" data-install-action>${actionLabel}</button>` : ""}
      <button type="button" class="install-banner__close" data-install-close aria-label="Tutup">✕</button>
    </div>
  `;

  el.querySelector("[data-install-close]").addEventListener("click", () => {
    snoozeDismiss();
    removeBanner();
  });

  if (actionLabel && onAction) {
    el.querySelector("[data-install-action]").addEventListener("click", onAction);
  }

  document.body.appendChild(el);
  bannerEl = el;
  return el;
}

function showAndroidDesktopBanner() {
  buildBanner({
    title: "Pasang Zensheet",
    text: "Akses lebih cepat dari layar utama, tanpa buka browser dulu.",
    actionLabel: "Pasang",
    onAction: async () => {
      removeBanner();
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") markInstalled();
      else snoozeDismiss();
      deferredPrompt = null;
    },
  });
}

function showIosBanner() {
  buildBanner({
    title: "Pasang Zensheet di iPhone/iPad",
    text: 'Ketuk tombol "Bagikan" di Safari, lalu pilih "Add to Home Screen".',
    actionLabel: "",
    onAction: null,
  });
}

export function initInstallPrompt() {
  if (isStandalone() || localStorage.getItem(INSTALLED_KEY) === "1") return;

  window.addEventListener("appinstalled", () => {
    markInstalled();
    removeBanner();
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    if (isDismissedForNow()) return;
    setTimeout(showAndroidDesktopBanner, SHOW_DELAY_MS);
  });

  // iOS: tidak ada beforeinstallprompt sama sekali, jadi tampilkan instruksi manual sendiri.
  if (isIos() && isSafari() && !isDismissedForNow()) {
    setTimeout(showIosBanner, SHOW_DELAY_MS);
  }
}
