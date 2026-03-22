async function loadDashboardPage() {
  const auth = await requireAuth();
  if (!auth) return;

  const { profile } = auth;
  fillHeader(profile);

  if (!profile.company_id) {
    showSetupNotice();
    return;
  }

  await loadCompany(profile.company_id);
  await loadDashboardStats(profile);
  await loadAssignedStores(profile);
  await loadInvitationNotice();
}

function showSetupNotice() {
  const box = document.getElementById("setupNotice");
  if (!box) return;

  box.style.display = "block";
  box.innerHTML = `
    <strong>Setup needed</strong>
    <p style="margin-top:8px;">Your profile is active, but no company is connected yet.</p>
    <p class="small-text" style="margin-top:6px;">We’ll connect company flow after recovery is complete.</p>
  `;
}

async function loadCompany(companyId) {
  const companyNameEl = document.getElementById("companyName");
  const roleTextEl = document.getElementById("dashboardRoleText");

  const { data, error } = await supabaseClient
    .from("companies")
    .select("name")
    .eq("id", companyId)
    .maybeSingle();

  if (error) {
    console.error("COMPANY LOAD ERROR:", error);
  }

  if (companyNameEl) {
    companyNameEl.textContent = data?.name || "My Business";
  }

  if (roleTextEl) {
    roleTextEl.textContent = `Role: ${currentProfile?.role || "director"}`;
  }
}

async function loadDashboardStats(profile) {
  const storeCountEl = document.getElementById("storeCount");
  const productCountEl = document.getElementById("productCount");
  const salesCountEl = document.getElementById("salesCount");
  const lowStockCountEl = document.getElementById("lowStockCount");

  let storeCount = 0;
  let productCount = 0;
  let salesCount = 0;
  let lowStockCount = 0;

  if (["director", "assistant_director"].includes(profile.role || "")) {
    const [
      storesRes,
      productsRes,
      salesRes
    ] = await Promise.all([
      supabaseClient
        .from("stores")
        .select("*", { count: "exact", head: true })
        .eq("company_id", profile.company_id),

      supabaseClient
        .from("products")
        .select("id, quantity, reorder_level")
        .eq("company_id", profile.company_id),

      supabaseClient
        .from("sales")
        .select("*", { count: "exact", head: true })
        .eq("company_id", profile.company_id)
    ]);

    storeCount = storesRes.count || 0;
    productCount = (productsRes.data || []).length;
    salesCount = salesRes.count || 0;
    lowStockCount = (productsRes.data || []).filter(
      (p) => Number(p.quantity || 0) <= Number(p.reorder_level || 0)
    ).length;
  } else {
    const { data: accessRows, error: accessError } = await supabaseClient
      .from("staff_store_access")
      .select("store_id")
      .eq("staff_id", currentUser.id);

    if (accessError) {
      console.error("ACCESS ERROR:", accessError);
    }

    const storeIds = (accessRows || []).map((row) => row.store_id);
    storeCount = storeIds.length;

    if (storeIds.length) {
      const [productsRes, salesRes] = await Promise.all([
        supabaseClient
          .from("products")
          .select("id, quantity, reorder_level")
          .in("store_id", storeIds),

        supabaseClient
          .from("sales")
          .select("*", { count: "exact", head: true })
          .eq("sold_by", currentUser.id)
      ]);

      productCount = (productsRes.data || []).length;
      salesCount = salesRes.count || 0;
      lowStockCount = (productsRes.data || []).filter(
        (p) => Number(p.quantity || 0) <= Number(p.reorder_level || 0)
      ).length;
    }
  }

  if (storeCountEl) storeCountEl.textContent = String(storeCount);
  if (productCountEl) productCountEl.textContent = String(productCount);
  if (salesCountEl) salesCountEl.textContent = String(salesCount);
  if (lowStockCountEl) lowStockCountEl.textContent = String(lowStockCount);
}

async function loadAssignedStores(profile) {
  const storeList = document.getElementById("storeList");
  if (!storeList) return;

  let stores = [];

  if (["director", "assistant_director"].includes(profile.role || "")) {
    const { data, error } = await supabaseClient
      .from("stores")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("LOAD STORES ERROR:", error);
      storeList.innerHTML = "<p>Unable to load stores.</p>";
      return;
    }

    stores = data || [];
  } else {
    const { data: accessRows, error: accessError } = await supabaseClient
      .from("staff_store_access")
      .select("store_id")
      .eq("staff_id", currentUser.id);

    if (accessError) {
      console.error("STAFF ACCESS ERROR:", accessError);
      storeList.innerHTML = "<p>Unable to load stores.</p>";
      return;
    }

    const ids = (accessRows || []).map((row) => row.store_id);

    if (!ids.length) {
      storeList.innerHTML = "<p>No store assigned yet.</p>";
      return;
    }

    const { data, error } = await supabaseClient
      .from("stores")
      .select("*")
      .in("id", ids)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("ASSIGNED STORES ERROR:", error);
      storeList.innerHTML = "<p>Unable to load stores.</p>";
      return;
    }

    stores = data || [];
  }

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

  if (error) {
    console.error("INVITATION ERROR:", error);
    return;
  }

  if (!data) {
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
