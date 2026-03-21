async function loadStaffPage() {
  const auth = await requireAuth();
  if (!auth) return;

  const { profile } = auth;

  fillHeader(profile);

  if (!profile.company_id) {
    alert("Create a company first.");
    window.location.href = "company.html";
    return;
  }

  if (!["director", "assistant_director"].includes(profile.role || "")) {
    alert("You do not have permission to access staff invitations.");
    window.location.href = "dashboard.html";
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

  if (error) return;

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
    invitationList.innerHTML = "<p>Unable to load invitations.</p>";
    return;
  }

  if (!data || !data.length) {
    invitationList.innerHTML = "<p>No invitations sent yet.</p>";
    return;
  }

  invitationList.innerHTML = data.map((invite) => `
    <div class="modern-list-card">
      <strong>${invite.invitee_email}</strong><br>
      <small>Role: ${invite.role}</small><br>
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
    inviteMessage.textContent = "Create a company first.";
    return;
  }

  if (!email) {
    inviteMessage.textContent = "Enter staff email.";
    return;
  }

  if (!role) {
    inviteMessage.textContent = "Select a role.";
    return;
  }

  if (["store_manager", "sales_rep"].includes(role) && !storeId) {
    inviteMessage.textContent = "Select a store.";
    return;
  }

  inviteMessage.textContent = "Checking user...";

  const { data: matchingUsers, error: profileError } = await supabaseClient
    .from("profiles")
    .select("id, email, company_id")
    .eq("email", email);

  if (profileError) {
    inviteMessage.textContent = profileError.message || "Unable to check user.";
    return;
  }

  if (!matchingUsers || !matchingUsers.length) {
    inviteMessage.textContent = "No user found with this email. Ask them to sign up first.";
    return;
  }

  const inviteeProfile = matchingUsers[0];

  if (inviteeProfile.company_id) {
    inviteMessage.textContent = "This user already belongs to a company.";
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
    inviteMessage.textContent = "A pending invitation already exists for this user.";
    return;
  }

  inviteMessage.textContent = "Sending invitation...";

  const { data: inviteRow, error: inviteError } = await supabaseClient
    .from("staff_invitations")
    .insert([
      {
        company_id: currentProfile.company_id,
        store_id: storeId,
        invited_by: currentUser.id,
        invitee_email: email,
        invitee_user_id: inviteeProfile.id,
        role: role,
        status: "pending"
      }
    ])
    .select()
    .single();

  if (inviteError) {
    inviteMessage.textContent = inviteError.message || "Unable to send invitation.";
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

  const emailSubject = "StockFlow Staff Invitation";
  const emailBody = `You have been invited to join a company on StockFlow as ${role}. Please log in to your account to accept or decline the invitation.`;

  await supabaseClient
    .from("email_notifications")
    .insert([
      {
        user_id: inviteeProfile.id,
        email: email,
        subject: emailSubject,
        body: emailBody,
        type: "staff_invitation",
        related_id: inviteRow.id,
        status: "pending"
      }
    ]);

  inviteMessage.textContent = "Invitation sent successfully.";
  document.getElementById("inviteStaffForm").reset();

  await loadCompanyStores(currentProfile.company_id);
  await loadInvitations(currentProfile.company_id);
});

loadStaffPage();