async function loadStaffPage() {
  const auth = await requireAuth();
  if (!auth) return;

  const { profile } = auth;
  fillHeader(profile);

  if (!profile.company_id) {
    const msg = document.getElementById("staffMessage");
    const invitationsList = document.getElementById("staffInvitationsList");
    const staffList = document.getElementById("staffList");

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

  if ((role === "store_manager" || role === "sales_rep") && !storeId) {
    if (msg) msg.textContent = "Select a store for this role.";
    return;
  }

  if (msg) msg.textContent = "Sending invitation...";

  // Find invited user first
  const { data: invitedProfile, error: lookupError } = await supabaseClient
    .from("profiles")
    .select("id, email, full_name")
    .ilike("email", email)
    .maybeSingle();

  if (lookupError) {
    console.error("INVITED USER LOOKUP ERROR:", lookupError);
  }

  // Save invitation
  const { error: inviteError } = await supabaseClient
    .from("staff_invitations")
    .insert([
      {
        company_id: currentProfile.company_id,
        invitee_email: email,
        invitee_user_id: invitedProfile?.id || null,
        role: role,
        store_id: storeId,
        invited_by: currentUser.id,
        status: "pending"
      }
    ]);

  if (inviteError) {
    console.error("SEND INVITATION ERROR:", inviteError);
    if (msg) msg.textContent = inviteError.message || "Failed to send invitation.";
    return;
  }

  // Create notification if user already exists
  if (invitedProfile?.id) {
    const companyName = await getCompanyName(currentProfile.company_id);

    const { error: notificationError } = await supabaseClient
      .from("notifications")
      .insert([
        {
          user_id: invitedProfile.id,
          title: "New Staff Invitation",
          message: `You were invited to join ${companyName} as ${formatRole(role)}.`,
          type: "staff_invitation",
          is_read: false
        }
      ]);

    if (notificationError) {
      console.error("NOTIFICATION INSERT ERROR:", notificationError);
    }
  }

  if (msg) {
    msg.textContent = invitedProfile?.id
      ? "Invitation sent successfully."
      : "Invitation saved, but the user has not signed up yet, so no in-app notification could be delivered.";
  }

  document.getElementById("staffInviteForm")?.reset();
  await loadSentInvitations(currentProfile.company_id);
});

async function getCompanyName(companyId) {
  const { data } = await supabaseClient
    .from("companies")
    .select("name")
    .eq("id", companyId)
    .maybeSingle();

  return data?.name || "your company";
}

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
  return role.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

loadStaffPage();
