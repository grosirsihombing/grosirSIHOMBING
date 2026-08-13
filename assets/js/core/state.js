/**
 * core/state.js
 *
 * State klien yang sangat ringan — bukan Redux, sesuai PRD section 77
 * ("jangan langsung membuat ... complex state management").
 * Hanya untuk hal-hal lintas komponen di satu halaman (mis. sidebar terbuka/tutup,
 * cache ringan hasil lookup customer/produk untuk form transaksi).
 */

const listeners = new Set();

const state = {
  sidebarOpen: false,
  // Cache sederhana, diisi oleh modul yang butuh (mis. sales.js men-cache daftar customer aktif)
  cache: {},
};

function set(patch) {
  Object.assign(state, patch);
  listeners.forEach((fn) => fn(state));
}

function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export default { get: () => state, set, subscribe };
