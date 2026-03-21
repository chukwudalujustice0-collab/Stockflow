let reportDataCache = {
  sales: [],
  cash: [],
  products: []
};

async function loadReportsPage() {
  const auth = await requireAuth();
  if (!auth) return;

  const { profile } = auth;
  fillHeader(profile);

  await loadAllData(profile);
}

loadReportsPage();

// ======================
// LOAD ALL DATA
// ======================
async function loadAllData(profile) {
  await Promise.all([
    loadProducts(profile),
    loadSales(profile),
    loadCash(profile)
  ]);

  renderReports();
}

// ======================
// LOAD PRODUCTS
// ======================
async function loadProducts(profile) {
  const { data } = await supabaseClient
    .from("products")
    .select("*")
    .eq("company_id", profile.company_id);

  reportDataCache.products = data || [];
}

// ======================
// LOAD SALES
// ======================
async function loadSales(profile) {
  const { data } = await supabaseClient
    .from("sales")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });

  reportDataCache.sales = data || [];
}

// ======================
// LOAD CASH
// ======================
async function loadCash(profile) {
  const { data } = await supabaseClient
    .from("cash_submissions")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });

  reportDataCache.cash = data || [];
}

// ======================
// RENDER REPORT
// ======================
function renderReports(filtered = null) {
  const data = filtered || reportDataCache;

  const products = data.products;
  const sales = data.sales;
  const cash = data.cash;

  const totalProducts = products.length;

  const totalSales = sales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
  const totalCash = cash.reduce((sum, c) => sum + Number(c.amount || 0), 0);

  const lowStock = products.filter(p => p.quantity <= (p.reorder_level || 0));

  const difference = totalSales - totalCash;

  document.getElementById("reportTotalProducts").textContent = totalProducts;
  document.getElementById("reportTotalSales").textContent = formatMoney(totalSales);
  document.getElementById("reportCashSubmitted").textContent = formatMoney(totalCash);
  document.getElementById("reportLowStockCount").textContent = lowStock.length;
  document.getElementById("reportDifference").textContent = formatMoney(difference);

  renderRecentSales(sales);
  renderLowStock(lowStock);
  renderCashList(cash);
}

// ======================
// HELPERS
// ======================
function formatMoney(val) {
  return "₦" + Number(val || 0).toLocaleString();
}

// ======================
// RENDER SALES
// ======================
function renderRecentSales(sales) {
  const el = document.getElementById("reportRecentSales");

  if (!sales.length) {
    el.innerHTML = "<p>No sales</p>";
    return;
  }

  el.innerHTML = sales.slice(0, 10).map(s => `
    <div class="modern-list-card">
      <strong>${formatMoney(s.total_amount)}</strong>
      <p>${s.payment_method}</p>
      <small>${new Date(s.created_at).toLocaleString()}</small>
    </div>
  `).join("");
}

// ======================
// LOW STOCK
// ======================
function renderLowStock(products) {
  const el = document.getElementById("reportLowStockList");

  if (!products.length) {
    el.innerHTML = "<p>No low stock</p>";
    return;
  }

  el.innerHTML = products.map(p => `
    <div class="modern-list-card">
      <strong>${p.name}</strong>
      <p>Qty: ${p.quantity}</p>
      <small>Reorder: ${p.reorder_level}</small>
    </div>
  `).join("");
}

// ======================
// CASH
// ======================
function renderCashList(cash) {
  const el = document.getElementById("reportCashList");

  if (!cash.length) {
    el.innerHTML = "<p>No cash submitted</p>";
    return;
  }

  el.innerHTML = cash.slice(0, 10).map(c => `
    <div class="modern-list-card">
      <strong>${formatMoney(c.amount)}</strong>
      <p>Status: ${c.status}</p>
      <small>${new Date(c.created_at).toLocaleString()}</small>
    </div>
  `).join("");
}

// ======================
// FILTER
// ======================
function applyFilter() {
  const start = document.getElementById("startDate").value;
  const end = document.getElementById("endDate").value;

  let filteredSales = reportDataCache.sales;
  let filteredCash = reportDataCache.cash;

  if (start) {
    filteredSales = filteredSales.filter(s => s.created_at >= start);
    filteredCash = filteredCash.filter(c => c.created_at >= start);
  }

  if (end) {
    filteredSales = filteredSales.filter(s => s.created_at <= end);
    filteredCash = filteredCash.filter(c => c.created_at <= end);
  }

  renderReports({
    products: reportDataCache.products,
    sales: filteredSales,
    cash: filteredCash
  });
}

function clearFilter() {
  document.getElementById("startDate").value = "";
  document.getElementById("endDate").value = "";
  renderReports();
}

// ======================
// EXPORT CSV
// ======================
function exportCSV() {
  const rows = [
    ["Date", "Amount", "Payment"]
  ];

  reportDataCache.sales.forEach(s => {
    rows.push([
      new Date(s.created_at).toLocaleString(),
      s.total_amount,
      s.payment_method
    ]);
  });

  const csvContent = rows.map(e => e.join(",")).join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "sales_report.csv";
  a.click();
}