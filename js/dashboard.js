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
    loadDashboardStats(profile),
    loadAssignedStores(profile),
    loadInvitationNotice(),
    loadRecentSales(profile),
    loadLowStock(profile),
    loadNotificationPreview()
  ]);
}

function setupDrawer(profile) {
  const openBtn = document.getElementById("openDrawerBtn");
  const closeBtn = document.getElementById("closeDrawerBtn");
  const drawer = document.getElementById("sideDrawer");
  const overlay = document.getElementById("drawerOverlay");

  const drawerCompanyName = document.getElementById("drawerCompanyName");
  const drawerRoleText = document.getElementById("drawerRoleText");

  if (drawerCompanyName) drawerCompanyName.textContent = profile.company_id ? "Loading..." : "No company yet";
  if (drawerRoleText) drawerRoleText.textContent = profile.role || "director";

  openBtn?.addEventListener("click", () => {
    drawer?.classList.add("drawer-open");
  });

  closeBtn?.addEventListener("click", () => {
    drawer?.classList.remove("drawer-open");
  });

  overlay?.addEventListener("click", () => {
    drawer?.classList.remove("drawer-open");
  });
}

function showSetupNotice() {
  const box = document.getElementById("setupNotice");
  if (!box) return;

  box.style.display = "block";
  box.innerHTML = `
    <strong>No company yet</strong>
    <p style="margin-top:8px;">Create your company to unlock all dashboard tools.</p>
    <div style="margin-top:12px;">
      <input
        id="companyNameInput"
        type="text"
        placeholder="Enter company name"
        style="width:100%; padding:12px; border-radius:10px; border:1px solid #ccc;"
      />
      <button
        id="createCompanyBtn"
        class="btn-primary full-btn"
        style="margin-top:10px;"
        type="button"
      >
        Create Company
      </button>
    </div>
  `;

  document.getElementById("createCompanyBtn")?.addEventListener("click", createCompany);

  const sectionsToHide = [
    "recentSalesList",
    "lowStockList",
    "storeList",
    "notificationPreview"
  ];

  sectionsToHide.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = "<p>Complete company setup first.</p>";
  });
}

async function createCompany() {
  const input = document.getElementById("companyNameInput");
  const name = input?.value.trim();

  if (!name) {
    alert("Enter company name");
    return;
  }

  const btn = document.getElementById("createCompanyBtn");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Creating...";
  }

  const { data, error } = await supabaseClient
    .from("companies")
    .insert([
      {
        name,
        owner_id: currentUser.id
      }
    ])
    .select()
    .single();

  if (error) {
    console.error("CREATE COMPANY ERROR:", error);
    alert(error.message || "Failed to create company");
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Create Company";
    }
    return;
  }

  const { error: updateError } = await supabaseClient
    .from("profiles")
    .update({ company_id: data.id })
    .eq("id", currentUser.id);

  if (updateError) {
    console.error("PROFILE COMPANY UPDATE ERROR:", updateError);
    alert(updateError.message || "Company created but profile update failed.");
    return;
  }

  alert("Company created successfully");
  location.reload();
}

async function loadCompany(companyId) {
  const companyNameEl = document.getElementById("companyName");
  const roleTextEl = document.getElementById("dashboardRoleText");
  const drawerCompanyName = document.getElementById("drawerCompanyName");

  const { data, error } = await supabaseClient
    .from("companies")
    .select("name")
    .eq("id", companyId)
    .maybeSingle();

  if (error) {
    console.error("COMPANY LOAD ERROR:", error);
  }

  const companyName = data?.name || "My Business";

  if (companyNameEl) companyNameEl.textContent = companyName;
  if (roleTextEl) roleTextEl.textContent = `Role: ${currentProfile?.role || "director"}`;
  if (drawerCompanyName) drawerCompanyName.textContent = companyName;
}

async function loadDashboardStats(profile) {
  const storeCountEl = document.getElementById("storeCount");
  const productCountEl = document.getElementById("productCount");
  const salesCountEl = document.getElementById("salesCount");
  const lowStockCountEl = document.getElementById("lowStockCount");

  const [storesRes, productsRes, salesRes] = await Promise.all([
    supabaseClient
      .from("stores")
      .select("id")
      .eq("company_id", profile.company_id),

    supabaseClient
      .from("products")
      .select("id, quantity, reorder_level")
      .eq("company_id", profile.company_id),

    supabaseClient
      .from("sales")
      .select("total")
      .eq("company_id", profile.company_id)
  ]);

  const stores = storesRes.data || [];
  const products = productsRes.data || [];
  const sales = salesRes.data || [];

  const totalSales = sales.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const lowStock = products.filter(
    (p) => Number(p.quantity || 0) <= Number(p.reorder_level || 0)
  );

  if (storeCountEl) storeCountEl.textContent = String(stores.length);
  if (productCountEl) productCountEl.textContent = String(products.length);
  if (salesCountEl) salesCountEl.textContent = `₦${totalSales.toLocaleString()}`;
  if (lowStockCountEl) lowStockCountEl.textContent = String(lowStock.length);
}

async function loadAssignedStores(profile) {
  const storeList = document.getElementById("storeList");
  if (!storeList) return;

  const { data, error } = await supabaseClient
    .from("stores")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("LOAD STORES ERROR:", error);
    storeList.innerHTML = "<p>Unable to load stores.</p>";
    return;
  }

  const stores = data || [];

  if (!stores.length) {
    storeList.innerHTML = "<p>No stores yet.</p>";
    return;
  }

  storeList.innerHTML = stores.map((store) => `
    <div class="modern-list-card">
      <strong>${store.name}</strong>
      <p>${store.store_type || "Store"}</p>
      <small>${store.address || ""}</small>
    </div>
  `).join("");
}

async function loadRecentSales(profile) {
  const list = document.getElementById("recentSalesList");
  if (!list) return;

  const { data, error } = await supabaseClient
    .from("sales")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("RECENT SALES ERROR:", error);
    list.innerHTML = "<p>Unable to load recent sales.</p>";
    return;
  }

  const sales = data || [];

  if (!sales.length) {
    list.innerHTML = "<p>No recent sales yet.</p>";
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

async function loadLowStock(profile) {
  const list = document.getElementById("lowStockList");
  if (!list) return;

  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("LOW STOCK ERROR:", error);
    list.innerHTML = "<p>Unable to load low stock items.</p>";
    return;
  }

  const lowStockItems = (data || []).filter(
    (p) => Number(p.quantity || 0) <= Number(p.reorder_level || 0)
  ).slice(0, 5);

  if (!lowStockItems.length) {
    list.innerHTML = "<p>No low stock items.</p>";
    return;
  }

  list.innerHTML = lowStockItems.map((item) => `
    <div class="modern-list-card">
      <strong>${item.name}</strong>
      <p>Qty: ${Number(item.quantity || 0)}</p>
      <small>Reorder level: ${Number(item.reorder_level || 0)}</small>
    </div>
  `).join("");
}

async function loadNotificationPreview() {
  const box = document.getElementById("notificationPreview");
  if (!box) return;

  const { data, error } = await supabaseClient
    .from("notifications")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false })
    .limit(3);

  if (error) {
    console.error("NOTIFICATION PREVIEW ERROR:", error);
    box.innerHTML = "<p>No notifications yet.</p>";
    return;
  }

  const rows = data || [];

  if (!rows.length) {
    box.innerHTML = "<p>No notifications yet.</p>";
    return;
  }

  box.innerHTML = rows.map((n) => `
    <div class="modern-list-card">
      <strong>${n.title || "Update"}</strong>
      <p>${n.message || ""}</p>
    </div>
  `).join("");
}

async function loadInvitationNotice() {
  const notice = document.getElementById("invitationNotice");
  if (!notice) return;

  const { data, error } = await supabaseClient
    .from("staff_invitations")
    .select("*")
    .eq("invitee_user_id", currentUser.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    notice.style.display = "none";
    return;
  }

  notice.style.display = "block";
  notice.innerHTML = `
    <strong>Pending Invitation</strong>
    <p style="margin-top:8px;">You have a pending invitation as <strong>${data.role}</strong>.</p>
    <small>${new Date(data.created_at).toLocaleString()}</small>
  `;
}

loadDashboardPage();
