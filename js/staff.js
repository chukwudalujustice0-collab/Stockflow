async function loadStaffPage() {
  const auth = await requireAuth();
  if (!auth) return;

  const { profile } = auth;
  fillHeader(profile);

  if (!profile.company_id) {
    const invitationsList = document.getElementById("staffInvitationsList");
    const staffList = document.getElementById("staffList");
    const msg = document.getElementById("staffMessage");

    if (msg) msg.textContent = "Create a company first before inviting staff.";
    if (invitationsList) invitationsList.innerHTML = "<p>No company found.</p>";
    if (staffList) staffList.innerHTML = "<p>No company found.</p>";
    return;
  }

  await Promise.all([
    loadStoresForStaff(profile.company_id),
    loadSentInvitations(profile.company_id),
    loadStaffMembers(profile.company_id)
  ]);
}

async function loadStoresForStaff(companyId) {
  const select = document.getElementById("staffStore");
  if (!select) return;

  select.innerHTML = `<option value="">Select store</option>`;

  const { data, error } = await supabaseClient
    .from("stores")
    .select("id, name")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("LOAD STAFF STORES ERROR:", error);
    return;
  }

  (data || []).forEach((store) => {
    const option = document.createElement("option");
    option.value = store.id;
    option.textContent = store.name;
    select.appendChild(option);
  });
}

document.getElementById("staffInviteForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const msg = document.getElementById("staffMessage");
  const email = document.getElementById("staffEmail")?.value.trim().toLowerCase();
  const role = document.getElementById("staffRole")?.value;
  const storeId = document.getElementById("staffStore")?.value || null;

  if (!currentProfile?.company_id) {
    if (msg) msg.textContent = "No company found.";
    return;
  }

  if (!email || !role) {
    if (msg) msg.textContent = "Email and role are required.";
    return;
  }

  if (role === "store_manager" && !storeId) {
    if (msg) msg.textContent = "Select a store for Store Manager.";
    return;
  }

  if (msg) msg.textContent = "Sending invitation...";

  const { error } = await supabaseClient
    .from("staff_invitations")
    .insert([
      {
        company_id: currentProfile.company_id,
        invitee_email: email,
        role: role,
        store_id: storeId,
        invited_by: currentUser.id,
        status: "pending"
      }
    ]);

  if (error) {
    console.error("SEND INVITATION ERROR:", error);
    if (msg) msg.textContent = error.message || "Failed to send invitation.";
    return;
  }

  if (msg) msg.textContent = "Invitation sent successfully.";
  document.getElementById("staffInviteForm")?.reset();
  await loadSentInvitations(currentProfile.company_id);
}

);

async function loadSentInvitations(companyId) {
  const list = document.getElementById("staffInvitationsList");
  if (!list) return;

  const { data, error } = await supabaseClient
    .from("staff_invitations")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("LOAD INVITATIONS ERROR:", error);
    list.innerHTML = "<p>Unable to load invitations.</p>";
    return;
  }

  if (!data?.length) {
    list.innerHTML = "<p>No invitations sent yet.</p>";
    return;
  }

  list.innerHTML = data.map((invite) => `
    <div class="modern-list-card">
      <strong>${invite.invitee_email}</strong>
      <p>Role: ${formatRole(invite.role)}</p>
      <small>Status: ${invite.status}</small>
    </div>
  `).join("");
}

async function loadStaffMembers(companyId) {
  const list = document.getElementById("staffList");
  if (!list) return;

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id, full_name, email, role, company_id")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("LOAD STAFF ERROR:", error);
    list.innerHTML = "<p>Unable to load staff.</p>";
    return;
  }

  const staff = (data || []).filter((row) => row.id !== currentUser.id);

  if (!staff.length) {
    list.innerHTML = "<p>No staff members yet.</p>";
    return;
  }

  list.innerHTML = staff.map((member) => `
    <div class="modern-list-card">
      <strong>${member.full_name || member.email}</strong>
      <p>${member.email}</p>
      <small>Role: ${formatRole(member.role)}</small>
    </div>
  `).join("");
}

function formatRole(role) {
  if (!role) return "-";
  return role
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

loadStaffPage();
