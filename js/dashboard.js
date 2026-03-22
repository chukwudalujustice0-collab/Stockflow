async function loadDashboardPage() {
  const auth = await requireAuth();
  if (!auth) return;

  const { profile } = auth;
  fillHeader(profile);
  setupDrawer(profile);

  if (!profile.company_id) {
    showSetupNotice();
    return;
  }

  await Promise.all([
    loadCompany(profile.company_id),
    loadStats(profile),
    loadStores(profile),
    loadRecentSales(profile),
    loadLowStock(profile),
    loadNotifications()
  ]);
}

/* ================= HEADER + DRAWER ================= */

function setupDrawer(profile) {
  const drawer = document.getElementById("sideDrawer");
  const openBtn = document.getElementById("openDrawerBtn");
  const closeBtn = document.getElementById("closeDrawerBtn");
  const overlay = document.getElementById("drawerOverlay");

  document.getElementById("drawerCompanyName").textContent = "Loading...";
  document.getElementById("drawerRoleText").textContent = profile.role || "director";

  openBtn.onclick = () => drawer.classList.add("drawer-open");
  closeBtn.onclick = () => drawer.classList.remove("drawer-open");
  overlay.onclick = () => drawer.classList.remove("drawer-open");
}

/* ================= COMPANY ================= */

async function loadCompany(companyId) {
  const { data } = await supabaseClient
    .from("companies")
    .select("name")
    .eq("id", companyId)
    .single();

  const name = data?.name || "My Business";

  document.getElementById("companyName").textContent = name;
  document.getElementById("drawerCompanyName").textContent = name;
  document.getElementById("dashboardRoleText").textContent = "Role: " + (currentProfile?.role || "director");
}

/* ================= STATS ================= */

async function loadStats(profile) {
  const [storesRes, productsRes, salesRes] = await Promise.all([
    supabaseClient.from("stores").select("id").eq("company_id", profile.company_id),
    supabaseClient.from("products").select("id, quantity, reorder_level").eq("company_id", profile.company_id),
    supabaseClient.from("sales").select("total").eq("company_id", profile.company_id)
  ]);

  const stores = storesRes.data || [];
  const products = productsRes.data || [];
  const sales = salesRes.data || [];

  const totalSales = sales.reduce((sum, s) => sum + Number(s.total || 0), 0);
  const lowStock = products.filter(p => (p.quantity || 0) <= (p.reorder_level || 0));

  document.getElementById("storeCount").textContent = stores.length;
  document.getElementById("productCount").textContent = products.length;
  document.getElementById("salesCount").textContent = "₦" + totalSales.toLocaleString();
  document.getElementById("lowStockCount").textContent = lowStock.length;
}

/* ================= STORES ================= */

async function loadStores(profile) {
  const el = document.getElementById("storeList");

  const { data } = await supabaseClient
    .from("stores")
    .select("*")
    .eq("company_id", profile.company_id)
    .limit(5);

  if (!data?.length) {
    el.innerHTML = "<p>No stores yet.</p>";
    return;
  }

  el.innerHTML = data.map(s => `
    <div class="modern-list-card">
      <strong>${s.name}</strong>
      <small>${s.address || ""}</small>
    </div>
  `).join("");
}

/* ================= RECENT SALES ================= */

async function loadRecentSales(profile) {
  const el = document.getElementById("recentSalesList");

  const { data } = await supabaseClient
    .from("sales")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false })
    .limit(5);

  if (!data?.length) {
    el.innerHTML = "<p>No sales yet.</p>";
    return;
  }

  el.innerHTML = data.map(s => `
    <div class="modern-list-card">
      <strong>₦${Number(s.total).toLocaleString()}</strong>
      <small>${new Date(s.created_at).toLocaleDateString()}</small>
    </div>
  `).join("");
}

/* ================= LOW STOCK ================= */

async function loadLowStock(profile) {
  const el = document.getElementById("lowStockList");

  const { data } = await supabaseClient
    .from("products")
    .select("*")
    .eq("company_id", profile.company_id);

  const low = (data || []).filter(p => (p.quantity || 0) <= (p.reorder_level || 0)).slice(0,5);

  if (!low.length) {
    el.innerHTML = "<p>No low stock items.</p>";
    return;
  }

  el.innerHTML = low.map(p => `
    <div class="modern-list-card">
      <strong>${p.name}</strong>
      <small>Qty: ${p.quantity}</small>
    </div>
  `).join("");
}

/* ================= NOTIFICATIONS ================= */

async function loadNotifications() {
  const el = document.getElementById("notificationPreview");

  const { data } = await supabaseClient
    .from("notifications")
    .select("*")
    .eq("user_id", currentUser.id)
    .limit(3);

  if (!data?.length) {
    el.innerHTML = "<p>No notifications</p>";
    return;
  }

  el.innerHTML = data.map(n => `
    <div class="modern-list-card">
      <strong>${n.title}</strong>
      <small>${n.message}</small>
    </div>
  `).join("");
}

/* ================= SETUP ================= */

function showSetupNotice() {
  document.getElementById("setupNotice").style.display = "block";
}

/* ================= INIT ================= */

loadDashboardPage();
