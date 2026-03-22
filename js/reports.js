async function loadReportsPage() {
  const auth = await requireAuth();
  if (!auth) return;

  fillHeader(auth.profile);

  if (!auth.profile.company_id) {
    document.getElementById("reportRecentSales").innerHTML = "<p>Create a company first.</p>";
    document.getElementById("reportLowStockList").innerHTML = "<p>No company found.</p>";
    return;
  }

  await loadReportStats();
  await loadRecentSales();
  await loadLowStockProducts();
}

async function loadReportStats() {
  const [
    salesRes,
    productsRes,
    storesRes
  ] = await Promise.all([
    supabaseClient
      .from("sales")
      .select("total")
      .eq("company_id", currentProfile.company_id),

    supabaseClient
      .from("products")
      .select("id, quantity, reorder_level")
      .eq("company_id", currentProfile.company_id),

    supabaseClient
      .from("stores")
      .select("id")
      .eq("company_id", currentProfile.company_id)
  ]);

  const sales = salesRes.data || [];
  const products = productsRes.data || [];
  const stores = storesRes.data || [];

  const totalSales = sales.reduce((sum, row) => sum + Number(row.total || 0), 0);
  const lowStock = products.filter(
    (p) => Number(p.quantity || 0) <= Number(p.reorder_level || 0)
  );

  document.getElementById("reportTotalSales").textContent = `₦${totalSales.toLocaleString()}`;
  document.getElementById("reportTotalProducts").textContent = String(products.length);
  document.getElementById("reportLowStockCount").textContent = String(lowStock.length);
  document.getElementById("reportTotalStores").textContent = String(stores.length);
}

async function loadRecentSales() {
  const list = document.getElementById("reportRecentSales");
  if (!list) return;

  const { data, error } = await supabaseClient
    .from("sales")
    .select("*")
    .eq("company_id", currentProfile.company_id)
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    console.error("REPORT SALES ERROR:", error);
    list.innerHTML = "<p>Unable to load sales.</p>";
    return;
  }

  const sales = data || [];

  if (!sales.length) {
    list.innerHTML = "<p>No sales yet.</p>";
    return;
  }

  list.innerHTML = sales.map((sale) => `
    <div class="modern-list-card">
      <strong>₦${Number(sale.total || 0).toLocaleString()}</strong>
      <p>Store ID: ${sale.store_id || "-"}</p>
      <small>${new Date(sale.created_at).toLocaleString()}</small>
    </div>
  `).join("");
}

async function loadLowStockProducts() {
  const list = document.getElementById("reportLowStockList");
  if (!list) return;

  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .eq("company_id", currentProfile.company_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("REPORT LOW STOCK ERROR:", error);
    list.innerHTML = "<p>Unable to load low stock products.</p>";
    return;
  }

  const products = (data || []).filter(
    (p) => Number(p.quantity || 0) <= Number(p.reorder_level || 0)
  );

  if (!products.length) {
    list.innerHTML = "<p>No low stock products.</p>";
    return;
  }

  list.innerHTML = products.map((product) => `
    <div class="modern-list-card">
      <strong>${product.name}</strong>
      <p>Qty: ${Number(product.quantity || 0)}</p>
      <small>Reorder level: ${Number(product.reorder_level || 0)}</small>
    </div>
  `).join("");
}

loadReportsPage();
