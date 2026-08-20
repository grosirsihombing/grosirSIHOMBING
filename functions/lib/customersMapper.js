/**
 * functions/lib/customersMapper.js
 *
 * Mapper antara row Supabase `customers` dan field legacy frontend.
 */

export function mapCustomerRow(row) {
  return {
    ID_Customer: row.id,
    Nama_Customer: row.name,
    No_HP: row.phone || "",
    Email: row.email || "",
    Alamat: row.address || "",
    Catatan: row.notes || "",
    Aktif: row.active !== false,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapCustomerPayload(payload, { partial = false } = {}) {
  const row = {};

  if (!partial || payload.Nama_Customer !== undefined) {
    row.name = String(payload.Nama_Customer || "").trim();
  }
  if (!partial || payload.No_HP !== undefined) {
    row.phone = payload.No_HP ? String(payload.No_HP).trim() : "";
  }
  if (!partial || payload.Email !== undefined) {
    row.email = payload.Email ? String(payload.Email).trim() : "";
  }
  if (!partial || payload.Alamat !== undefined) {
    row.address = payload.Alamat ? String(payload.Alamat).trim() : "";
  }
  if (!partial || payload.Catatan !== undefined) {
    row.notes = payload.Catatan ? String(payload.Catatan).trim() : "";
  }
  if (!partial || payload.Aktif !== undefined) {
    row.active = payload.Aktif !== false;
  }

  return row;
}
