/**
 * functions/lib/suppliersMapper.js
 *
 * Mapper antara row Supabase `suppliers` dan field legacy frontend.
 */

export function mapSupplierRow(row) {
  return {
    ID_Supplier: row.id,
    Nama_Supplier: row.name,
    No_HP: row.phone || "",
    Email: row.email || "",
    Alamat: row.address || "",
    Catatan: row.notes || "",
    Aktif: row.active !== false,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapSupplierPayload(payload, { partial = false } = {}) {
  const row = {};

  if (!partial || payload.Nama_Supplier !== undefined) {
    row.name = String(payload.Nama_Supplier || "").trim();
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
