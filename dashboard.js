async function loadDashboard() {
  const auth = await requireAuth();
  if (!auth) return;

  const { user, profile } = auth;

  fillHeader(profile);
  applyDashboardAccess(profile);
  await loadPendingInvitation(user.id);

  const roleEl = document.getElementById("roleName");
  const roleTextEl = document.getElementById("dashboardRoleText");
  const companyNameEl = document.getElementById("companyName");
  const storeCountEl = document.getElementById("storeCount");
  const statStoreCountEl = document.getElementById("statStoreCount");
  const storeList = document.getElementById("storeList");
  const setupNotice = document.getElementById("setupNotice");

  const roleText = profile.role || "No role yet";

  if (roleEl) roleEl.textContent = roleText;
  if (roleTextEl) roleTextEl.textContent = `Role: ${roleText}`;

  if (!profile.company_id) {
    if (companyNameEl) companyNameEl.textContent = "No company yet";
    if (storeCountEl) storeCountEl.textContent = "0";
    if (statStoreCountEl) statStoreCountEl.textContent = "0";

    if (setupNotice) {
      setupNotice.style.display = "block";
      setupNotice.innerHTML = `
        <h3>Welcome to StockFlow</h3>
        <p>Your account is ready, but you have not created a company yet.</p>
        <p>Create your company to unlock stores, staff, products and sales.</p>
        <a href="company.html" class="btn-primary inline-btn">Create Company</a>
      `;
    }

    if (storeList) {
      storeList.innerHTML = "<p>No stores available yet.</p>";
    }

    return;
  }

  if (setupNotice) {
    setupNotice.style.display = "none";
  }

  const { data: company } = await supabaseClient
    .from("companies")
    .select("name")
    .eq("id", profile.company_id)
    .maybeSingle();

  if (companyNameEl) companyNameEl.textContent = company?.name || "-";

  let stores = [];

  if (["director", "assistant_director"].includes(profile.role || "")) {
    const { data } = await supabaseClient
      .from("stores")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false });

    stores = data || [];
  } else {
    const { data: accessRows } = await supabaseClient
      .from("staff_store_access")
      .select("store_id")
      .eq("staff_id", user.id);

    const storeIds = (accessRows || []).map((row) => row.store_id);

    if (storeIds.length > 0) {
      const { data } = await supabaseClient
        .from("stores")
        .select("*")
        .in("id", storeIds)
        .order("created_at", { ascending: false });

      stores = data || [];
    }
  }

  const countText = String(stores.length);
  if (storeCountEl) storeCountEl.textContent = countText;
  if (statStoreCountEl) statStoreCountEl.textContent = countText;

  if (!storeList) return;

  if (!stores.length) {
    storeList.innerHTML = "<p>No store assigned yet.</p>";
    return;
  }

  storeList.innerHTML = stores.map((store) => `
    <div class="modern-list-card">
      <div>
        <strong>${store.name}</strong>
        <p>${store.store_type || "Store"}</p>
        <small>${store.address || ""}</small>
      </div>
    </div>
  `).join("");
}

function applyDashboardAccess(profile) {
  const quickStoresCard = document.getElementById("quickStoresCard");
  const quickStaffCard = document.getElementById("quickStaffCard");
  const quickProductsCard = document.getElementById("quickProductsCard");
  const quickSalesCard = document.getElementById("quickSalesCard");
  const quickNotificationsCard = document.getElementById("quickNotificationsCard");

  if (quickStoresCard) quickStoresCard.style.display = "none";
  if (quickStaffCard) quickStaffCard.style.display = "none";
  if (quickProductsCard) quickProductsCard.style.display = "none";
  if (quickSalesCard) quickSalesCard.style.display = "none";
  if (quickNotificationsCard) quickNotificationsCard.style.display = "flex";

  if (!profile.company_id) return;

  if (["director", "assistant_director"].includes(profile.role || "")) {
    if (quickStoresCard) quickStoresCard.style.display = "flex";
    if (quickStaffCard) quickStaffCard.style.display = "flex";
    if (quickProductsCard) quickProductsCard.style.display = "flex";
    if (quickSalesCard) quickSalesCard.style.display = "flex";
    return;
  }

  if (profile.role === "store_manager") {
    if (quickStoresCard) quickStoresCard.style.display = "flex";
    if (quickProductsCard) quickProductsCard.style.display = "flex";
    if (quickSalesCard) quickSalesCard.style.display = "flex";
    return;
  }

  if (profile.role === "sales_rep") {
    if (quickSalesCard) quickSalesCard.style.display = "flex";
  }
}

async function loadPendingInvitation(userId) {
  const invitationNotice = document.getElementById("invitationNotice");
  if (!invitationNotice) return;

  const { data: invite, error } = await supabaseClient
    .from("staff_invitations")
    .select("*")
    .eq("invitee_user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .maybeSingle();

  if (error || !invite) {
    invitationNotice.style.display = "none";
    return;
  }

  let companyName = "";
  let storeName = "";

  const { data: company } = await supabaseClient
    .from("companies")
    .select("name")
    .eq("id", invite.company_id)
    .maybeSingle();

  if (company) companyName = company.name;

  if (invite.store_id) {
    const { data: store } = await supabaseClient
      .from("stores")
      .select("name")
      .eq("id", invite.store_id)
      .maybeSingle();

    if (store) storeName = store.name;
  }

  invitationNotice.style.display = "block";
  invitationNotice.innerHTML = `
    <h3>Staff Invitation</h3>
    <p>You have been invited to join <strong>${companyName}</strong> as <strong>${invite.role}</strong>${storeName ? ` for <strong>${storeName}</strong>` : ""}.</p>
    <button class="btn-primary inline-btn" onclick="acceptInvitation('${invite.id}')">Accept</button>
    <button class="btn-danger inline-btn" onclick="declineInvitation('${invite.id}')">Decline</button>
  `;
}

async function acceptInvitation(inviteId) {
  if (!currentUser || !currentProfile) return;

  const { data: invite, error } = await supabaseClient
    .from("staff_invitations")
    .select("*")
    .eq("id", inviteId)
    .maybeSingle();

  if (error || !invite) {
    alert("Invitation not found.");
    return;
  }

  const { error: profileError } = await supabaseClient
    .from("profiles")
    .update({
      company_id: invite.company_id,
      role: invite.role
    })
    .eq("id", currentUser.id);

  if (profileError) {
    alert(profileError.message || "Unable to update profile.");
    return;
  }

  if (invite.store_id) {
    const { error: accessError } = await supabaseClient
      .from("staff_store_access")
      .insert([
        {
          staff_id: currentUser.id,
          store_id: invite.store_id
        }
      ]);

    if (accessError) {
      alert(accessError.message || "Unable to assign store.");
      return;
    }
  }

  const { error: inviteError } = await supabaseClient
    .from("staff_invitations")
    .update({
      status: "accepted",
      responded_at: new Date().toISOString()
    })
    .eq("id", inviteId);

  if (inviteError) {
    alert(inviteError.message || "Unable to update invitation.");
    return;
  }

  const { error: notificationError } = await supabaseClient
    .from("notifications")
    .insert([
      {
        user_id: currentUser.id,
        title: "Invitation accepted",
        message: "You have successfully joined the company.",
        type: "system",
        related_id: invite.id,
        is_read: false
      }
    ]);

  console.log("ACCEPT NOTIFICATION ERROR:", notificationError);

  alert("Invitation accepted successfully.");
  window.location.reload();
}

async function declineInvitation(inviteId) {
  const { error } = await supabaseClient
    .from("staff_invitations")
    .update({
      status: "declined",
      responded_at: new Date().toISOString()
    })
    .eq("id", inviteId);

  if (error) {
    alert(error.message || "Unable to decline invitation.");
    return;
  }

  const { error: notificationError } = await supabaseClient
    .from("notifications")
    .insert([
      {
        user_id: currentUser.id,
        title: "Invitation declined",
        message: "You declined a staff invitation.",
        type: "system",
        related_id: inviteId,
        is_read: false
      }
    ]);

  console.log("DECLINE NOTIFICATION ERROR:", notificationError);

  alert("Invitation declined.");
  window.location.reload();
}

loadDashboard();