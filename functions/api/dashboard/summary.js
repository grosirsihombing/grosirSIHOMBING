/**
 * functions/api/dashboard/summary.js
 * Route: GET /api/dashboard/summary
 */

import { createSupabaseClient } from "../../lib/supabase.js";
import { ok, fail } from "../_respond.js";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoStr(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function isValidDateStr(str) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(str || ""))) return false;
  return !isNaN(new Date(`${str}T00:00:00Z`).getTime());
}

export async function onRequestGet(context) {
  try {
    const supabase = createSupabaseClient(context.env);
    const url = new URL(context.request.url);
    const from = url.searchParams.get("from") || undefined;
    const to = url.searchParams.get("to") || undefined;

    // Filter tanggal periode
    let periodeFrom = from;
    let periodeTo = to;
    if (!periodeFrom && !periodeTo) {
      periodeFrom = daysAgoStr(6);
      periodeTo = todayStr();
    } else {
      if (!periodeFrom || !periodeTo) {
        return fail("VALIDATION_ERROR", "Tanggal awal dan akhir periode harus diisi bersamaan.", 400);
      }
      if (!isValidDateStr(periodeFrom) || !isValidDateStr(periodeTo)) {
        return fail("VALIDATION_ERROR", "Format tanggal periode tidak valid.", 400);
      }
      if (periodeFrom > periodeTo) {
        return fail("VALIDATION_ERROR", "Tanggal awal tidak boleh melebihi tanggal akhir.", 400);
      }
    }

    // Hitung agregasi summary dari Supabase
    // 1. Total active products
    const { count: totalBarang, error: pErr } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("active", true);

    // 2. Total active customers
    const { count: totalCustomer, error: cErr } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("active", true);

    // 3. Total active suppliers
    const { count: totalSupplier, error: sErr } = await supabase
      .from("suppliers")
      .select("*", { count: "exact", head: true })
      .eq("active", true);

    // 4. Total Stock
    const { data: stockData, error: stErr } = await supabase
      .from("products")
      .select("current_stock")
      .eq("active", true);

    const totalStok = (stockData || []).reduce((sum, p) => sum + (p.current_stock || 0), 0);

    // 5. Penjualan Hari Ini
    const today = todayStr();
    const todayStart = `${today}T00:00:00Z`;
    const todayEnd = `${today}T23:59:59Z`;

    // Query sales for today
    const { data: salesToday, error: sTodayErr } = await supabase
      .from("sales")
      .select("total")
      .eq("active", true)
      .gte("created_at", todayStart)
      .lte("created_at", todayEnd);

    const penjualanHariIni = (salesToday || []).reduce((sum, s) => sum + Number(s.total), 0);
    const jumlahTransaksiHariIni = (salesToday || []).length;

    // 6. Penjualan Periode
    const { data: salesPeriode, error: sPeriodeErr } = await supabase
      .from("sales")
      .select("total")
      .eq("active", true)
      .gte("date", `${periodeFrom}T00:00:00Z`)
      .lte("date", `${periodeTo}T23:59:59Z`);

    const totalPeriode = (salesPeriode || []).reduce((sum, s) => sum + Number(s.total), 0);
    const jumlahTransaksiPeriode = (salesPeriode || []).length;

    // 7. Stok Rendah dan Stok Habis
    const lowStockThreshold = 5;
    const { data: allProducts, error: apErr } = await supabase
      .from("products")
      .select("name, current_stock")
      .eq("active", true);

    const stokRendah = [];
    const stokHabis = [];

    (allProducts || []).forEach(p => {
      const stock = p.current_stock || 0;
      if (stock <= 0) {
        stokHabis.push({ nama: p.name, stok: stock });
      } else if (stock <= lowStockThreshold) {
        stokRendah.push({ nama: p.name, stok: stock });
      }
    });

    if (pErr || cErr || sErr || stErr || sTodayErr || sPeriodeErr || apErr) {
      console.error("Dashboard summary data error");
      return fail("DASHBOARD_QUERY_ERROR", "Gagal menghitung ringkasan dashboard.", 500);
    }

    return ok({
      totalBarang: totalBarang || 0,
      totalCustomer: totalCustomer || 0,
      totalSupplier: totalSupplier || 0,
      totalStok,
      penjualanHariIni,
      jumlahTransaksiHariIni,
      penjualanPeriode: {
        from: periodeFrom,
        to: periodeTo,
        total: totalPeriode,
        jumlahTransaksi: jumlahTransaksiPeriode,
      },
      stokRendah,
      stokHabis,
    });
  } catch (error) {
    console.error("Dashboard summary exception:", error);
    return fail("SUMMARY_FAILED", "Gagal mengambil ringkasan dashboard.", 500);
  }
}
