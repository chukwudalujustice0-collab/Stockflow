let reportSalesData = [];

async function loadReportsPage(startDate = null, endDate = null) {
  const auth = await requireAuth();
  if (!auth) return;

  const { user, profile } = auth;
  fillHeader(profile);

  if (!profile.company_id) {
    alert("Create a company first.");
    window.location.href = "company.html";
    return;
  }

  await loadReportStats(profile, user.id, startDate, endDate);
  await loadRecentSalesReport(profile, user.id, startDate, endDate);
  await loadLowStockReport(profile, user.id);
  await loadRecentCashReport(profile, user.id, startDate, endDate);
}

async function getAccessibleStoreIds(profile, userId) {
  if (["director", "assistant_director"].includes(profile.role || "")) {
    const { data, error } = await supabaseClient
      .from("stores")
      .select("id")
      .eq("company_id", profile.company_id);

    console.log("REPORT STORES:", data, error);
    return (data || []).map((row) => row.id);
  }

  const { data, error } = await supabaseClient
    .from("staff_store_access")
    .select("store_id")
    .eq("staff_id", userId);

  console.log("REPORT STAFF ACCESS:", data, error);
  return (data || []).map((row) => row.store_id);
}

function applyDateFilters(query, startDate, endDate) {
  let q = query;

  if (startDate) {
    q = q.gte("created_at", `${startDate}T00:00:00`);
  }

  if (endDate) {
    q = q.lte("created_at", `${endDate}T23:59:59`);
  }

  return q;
}

async function loadReportStats(profile, userId, startDate, endDate) {
  const totalProductsEl = document.getElementById("reportTotalProducts");
  const totalSalesEl = document.getElementById("reportTotalSales");
  const cashSubmittedEl = document.getElementById("reportCashSubmitted");
  const lowStockCountEl = document.getElementById("reportLowStockCount");
  const differenceEl = document.getElementById("reportDifference");

  const storeIds = await getAccessibleStoreIds(profile, userId);

  let products = [];
  let sales = [];
  let cashRows = [];

  if (["director", "assistant_director"].includes(profile.role || "")) {
    const productsQuery = supabaseClient
      .from("products")
      .select("id, quantity, reorder_level")
      .eq("company_id", profile.company_id);

    let salesQuery = supabaseClient
      .from("sales")
      .select("id, total_amount, created_at")
      .eq("company_id", profile.company_id);

    let cashQuery = supabaseClient
      .from("cash_submissions")
      .select("id, amount, created_at")
      .eq("company_id", profile.company_id);

    salesQuery = applyDateFilters(salesQuery, startDate, endDate);
    cashQuery = applyDateFilters(cashQuery, startDate, endDate);

    const [
      { data: productsData, error: productsError },
      { data: salesData, error: salesError },
      { data: cashData, error: cashError }
    ] = await Promise.all([
      productsQuery,
      salesQuery,
      cashQuery
    ]);

    console.log("REPORT PRODUCTS:", productsData, productsError);
    console.log("REPORT SALES:", salesData, salesError);
    console.log("REPORT CASH:", cashData, cashError);

    products = productsData || [];
    sales = salesData || [];
    cashRows = cashData || [];
  } else {
    if (storeIds.length > 0) {
      const productsQuery = supabaseClient
        .from("products")
        .select("id, quantity, reorder_level")
        .in("store_id", storeIds);

      let salesQuery = supabaseClient
        .from("sales")
        .select("id, total_amount, created_at")
        .eq("sold_by", userId);

      let cashQuery = supabaseClient
        .from("cash_submissions")
        .select("id, amount, created_at")
        .eq("submitted_by", userId);

      salesQuery = applyDateFilters(salesQuery, startDate, endDate);
      cashQuery = applyDateFilters(cashQuery, startDate, endDate);

      const [
        { data: productsData, error: productsError },
        { data: salesData, error: salesError },
        { data: cashData, error: cashError }
      ] = await Promise.all([
        productsQuery,
        salesQuery,
        cashQuery
      ]);

      console.log("REPORT PRODUCTS:", productsData, productsError);
      console.log("REPORT SALES:", salesData, salesError);
      console.log("REPORT CASH:", cashData, cashError);

      products = productsData || [];
      sales = salesData || [];
      cashRows = cashData || [];
    }
  }

  const totalProducts = products.length;
  const totalSales = sales.reduce((sum, row) => sum + Number(row.total_amount || 0), 0);
  const totalCash = cashRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const lowStockCount = products.filter(
    (row) => Number(row.quantity || 0) <= Number(row.reorder_level || 0)
  ).length;
  const difference = totalSales - totalCash;

  reportSalesData = sales;

  if (totalProductsEl) totalProductsEl.textContent = totalProducts.toLocaleString();
  if (totalSalesEl) totalSalesEl.textContent = `₦${totalSales.toLocaleString()}`;
  if (cashSubmittedEl) cashSubmittedEl.textContent = `₦${totalCash.toLocaleString()}`;
  if (lowStockCountEl) lowStockCountEl.textContent = lowStockCount.toLocaleString();
  if (differenceEl) differenceEl.textContent = `₦${difference.toLocaleString()}`;
}

async function loadRecentSalesReport(profile, userId, startDate, endDate) {
  const box = document.getElementById("reportRecentSales");
  if (!box) return;

  let data = [];
  let error = null;

  if (["director", "assistant_director"].includes(profile.role || "")) {
    let query = supabaseClient
      .from("sales")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false })
      .limit(8);

    query = applyDateFilters(query, startDate, endDate);
    ({ data, error } = await query);
  } else {
    let query = supabaseClient
      .from("sales")
      .select("*")
      .eq("sold_by", userId)
      .order("created_at", { ascending: false })
      .limit(8);

    query = applyDateFilters(query, startDate, endDate);
    ({ data, error } = await query);
  }

  console.log("RECENT SALES REPORT:", data, error);

  if (error) {
    box.innerHTML = `<p>${error.message}</p>`;
    return;
  }

  if (!data || !data.length) {
    box.innerHTML = "<p>No sales yet.</p>";
    return;
  }

  box.innerHTML = data.map((sale) => `
    <div class="modern-list-card">
      <strong>₦${Number(sale.total_amount || 0).toLocaleString()}</strong>
      <p>Payment: ${sale.payment_method || "-"}</p>
      <small>${new Date(sale.created_at).toLocaleString()}</small>
    </div>
  `).join("");
}

async function loadLowStockReport(profile, userId) {
  const box = document.getElementById("reportLowStockList");
  if (!box) return;

  const storeIds = await getAccessibleStoreIds(profile, userId);

  let data = [];
  let error = null;

  if (["director", "assistant_director"].includes(profile.role || "")) {
    ({ data, error } = await supabaseClient
      .from("products")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false }));
  } else if (storeIds.length > 0) {
    ({ data, error } = await supabaseClient
      .from("products")
      .select("*")
      .in("store_id", storeIds)
      .order("created_at", { ascending: false }));
  }

  console.log("LOW STOCK REPORT:", data, error);

  if (error) {
    box.innerHTML = `<p>${error.message}</p>`;
    return;
  }

  const lowStock = (data || []).filter(
    (row) => Number(row.quantity || 0) <= Number(row.reorder_level || 0)
  );

  if (!lowStock.length) {
    box.innerHTML = "<p>No low stock items.</p>";
    return;
  }

  box.innerHTML = lowStock.map((product) => `
    <div class="modern-list-card">
      <strong>${product.name}</strong>
      <p>Qty: ${product.quantity}</p>
      <small>Reorder level: ${product.reorder_level}</small>
    </div>
  `).join("");
}

async function loadRecentCashReport(profile, userId, startDate, endDate) {
  const box = document.getElementById("reportCashList");
  if (!box) return;

  let data = [];
  let error = null;

  if (["director", "assistant_director"].includes(profile.role || "")) {
    let query = supabaseClient
      .from("cash_submissions")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false })
      .limit(8);

    query = applyDateFilters(query, startDate, endDate);
    ({ data, error } = await query);
  } else {
    let query = supabaseClient
      .from("cash_submissions")
      .select("*")
      .eq("submitted_by", userId)
      .order("created_at", { ascending: false })
      .limit(8);

    query = applyDateFilters(query, startDate, endDate);
    ({ data, error } = await query);
  }

  console.log("RECENT CASH REPORT:", data, error);

  if (error) {
    box.innerHTML = `<p>${error.message}</p>`;
    return;
  }

  if (!data || !data.length) {
    box.innerHTML = "<p>No cash submissions yet.</p>";
    return;
  }

  box.innerHTML = data.map((row) => `
    <div class="modern-list-card">
      <strong>₦${Number(row.amount || 0).toLocaleString()}</strong>
      <p>Status: ${row.status}</p>
      <small>${row.note || ""}</small><br>
      <small>${new Date(row.created_at).toLocaleString()}</small>
    </div>
  `).join("");
}

function applyFilter() {
  const start = document.getElementById("startDate").value || null;
  const end = document.getElementById("endDate").value || null;
  loadReportsPage(start, end);
}

function clearFilter() {
  document.getElementById("startDate").value = "";
  document.getElementById("endDate").value = "";
  loadReportsPage();
}

function exportCSV() {
  if (!reportSalesData.length) {
    alert("No sales data to export.");
    return;
  }

  let csv = "Date,Amount\n";

  reportSalesData.forEach((sale) => {
    csv += `${sale.created_at},${sale.total_amount}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "sales_report.csv";
  a.click();

  window.URL.revokeObjectURL(url);
}

loadReportsPage();