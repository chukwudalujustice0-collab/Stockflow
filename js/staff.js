async function loadStaffPage() {
  const auth = await requireAuth();
  if (!auth) return;

  const { profile } = auth;
  fillHeader(profile);

  if (!profile.company_id) {
    const invitationList = document.getElementById("invitationList");
    if (invitationList) invitationList.innerHTML = "<p>Create a company first.</p>";
    return;
  }

  if (!["director", "assistant_director"].includes(profile.role || "")) {
    alert("You do not have permission to access staff invitations.");
    window.location.href = "./dashboard.html";
    return;
  }

  await loadCompanyStores(profile.company_id);
  await loadInvitations(profile.company_id);
}

async function loadCompanyStores(companyId) {
  const inviteStore = document.getElementById("inviteStore");
  if (!inviteStore) return;

  inviteStore.innerHTML = `<option value="">Select store</option>`;

  const { data, error } = await supabaseClient
    .from("stores")
    .select("id, name")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("LOAD STORES ERROR:", error);
    return;
  }

  (data || []).forEach((store) => {
    const option = document.createElement("option");
    option.value = store.id;
    option.textContent = store.name;
    inviteStore.appendChild(option);
  });
}

async function loadInvitations(companyId) {
  const invitationList = document.getElementById("invitationList");
  if (!invitationList) return;

  const { data, error } = await supabaseClient
    .from("staff_invitations")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("LOAD INVITATIONS ERROR:", error);
    invitationList.innerHTML = "<p>Unable to load invitations.</p>";
    return;
  }

  if (!data || !data.length) {
    invitationList.innerHTML = "<p>No invitations sent yet.</p>";
    return;
  }

  invitationList.innerHTML = data.map((invite) => `
    <div class="modern-list-card">
      <strong>${invite.invitee_email}</strong>
      <p>Role: ${invite.role}</p>
      <small>Status: ${invite.status}</small><br>
      <small>Sent: ${new Date(invite.created_at).toLocaleString()}</small>
    </div>
  `).join("");
}

document.getElementById("inviteStaffForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const inviteMessage = document.getElementById("inviteMessage");
  const rawEmail = document.getElementById("inviteEmail").value;
  const email = rawEmail.trim().toLowerCase();
  const role = document.getElementById("inviteRole").value;
  const storeId = document.getElementById("inviteStore").value || null;

  if (!currentProfile?.company_id) {
    if (inviteMessage) inviteMessage.textContent = "Create a company first.";
    return;
  }

  if (!email) {
    if (inviteMessage) inviteMessage.textContent = "Enter staff email.";
    return;
  }

  if (!role) {
    if (inviteMessage) inviteMessage.textContent = "Select a role.";
    return;
  }

  if (["store_manager", "sales_rep"].includes(role) && !storeId) {
    if (inviteMessage) inviteMessage.textContent = "Select a store.";
    return;
  }

  if (inviteMessage) inviteMessage.textContent = "Checking user...";

  const { data: matchingUsers, error: profileError } = await supabaseClient
    .from("profiles")
    .select("id, email, company_id")
    .eq("email", email);

  if (profileError) {
    console.error("PROFILE LOOKUP ERROR:", profileError);
    if (inviteMessage) inviteMessage.textContent = profileError.message || "Unable to check user.";
    return;
  }

  if (!matchingUsers || !matchingUsers.length) {
    if (inviteMessage) inviteMessage.textContent = "No user found with this email. Ask them to sign up first.";
    return;
  }

  const inviteeProfile = matchingUsers[0];

  if (inviteeProfile.company_id) {
    if (inviteMessage) inviteMessage.textContent = "This user already belongs to a company.";
    return;
  }

  const { data: existingPending } = await supabaseClient
    .from("staff_invitations")
    .select("id")
    .eq("invitee_email", email)
    .eq("company_id", currentProfile.company_id)
    .eq("status", "pending")
    .maybeSingle();

  if (existingPending) {
    if (inviteMessage) inviteMessage.textContent = "A pending invitation already exists for this user.";
    return;
  }

  if (inviteMessage) inviteMessage.textContent = "Sending invitation...";

  const { data: inviteRow, error: inviteError } = await supabaseClient
    .from("staff_invitations")
    .insert([
      {
        company_id: currentProfile.company_id,
        store_id: storeId,
        invited_by: currentUser.id,
        invitee_email: email,
        invitee_user_id: inviteeProfile.id,
        role,
        status: "pending"
      }
    ])
    .select()
    .single();

  if (inviteError) {
    console.error("INVITE ERROR:", inviteError);
    if (inviteMessage) inviteMessage.textContent = inviteError.message || "Unable to send invitation.";
    return;
  }

  await supabaseClient
    .from("notifications")
    .insert([
      {
        user_id: inviteeProfile.id,
        title: "New staff invitation",
        message: `You have been invited to join a company as ${role}.`,
        type: "staff_invitation",
        related_id: inviteRow.id,
        is_read: false
      }
    ]);

  await supabaseClient
    .from("email_notifications")
    .insert([
      {
        user_id: inviteeProfile.id,
        email,