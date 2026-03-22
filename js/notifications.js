async function loadNotificationsPage() {
  const auth = await requireAuth();
  if (!auth) return;

  fillHeader(auth.profile);

  await Promise.all([
    loadPendingInvitations(),
    loadNotifications()
  ]);
}

async function loadPendingInvitations() {
  const list = document.getElementById("pendingInvitationsList");
  if (!list) return;

  list.innerHTML = "<p>Loading invitations...</p>";

  const currentEmail = (currentUser.email || "").trim().toLowerCase();

  const { data, error } = await supabaseClient
    .from("staff_invitations")
    .select("*")
    .or(`invitee_user_id.eq.${currentUser.id},invitee_email.ilike.${currentEmail}`)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  console.log("CURRENT USER:", currentUser.id, currentUser.email);
  console.log("PENDING INVITES:", data);

  if (error) {
    console.error("LOAD PENDING INVITES ERROR:", error);
    list.innerHTML = "<p>Unable to load invitations.</p>";
    return;
  }

  if (!data || !data.length) {
    list.innerHTML = "<p>No pending invitations.</p>";
    return;
  }

  const cards = await Promise.all(
    data.map(async (invite) => {
      const companyName = await getCompanyName(invite.company_id);
      const storeName = invite.store_id ? await getStoreName(invite.store_id) : "";

      return `
        <div class="modern-list-card">
          <strong>${companyName}</strong>
          <p>Role: ${formatRole(invite.role)}</p>
          ${storeName ? `<small>Store: ${storeName}</small><br>` : ""}
          <small>Sent: ${new Date(invite.created_at).toLocaleString()}</small>

          <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:12px;">
            <button
              type="button"
              class="btn-primary inline-btn"
              onclick="acceptInvitation('${invite.id}', '${invite.company_id}', '${invite.role}')"
            >
              Accept
            </button>

            <button
              type="button"
              class="btn-danger inline-btn"
              onclick="declineInvitation('${invite.id}')"
            >
              Decline
            </button>
          </div>
        </div>
      `;
    })
  );

  list.innerHTML = cards.join("");
}

async function acceptInvitation(invitationId, companyId, role) {
  const { error: profileError } = await supabaseClient
    .from("profiles")
    .update({
      company_id: companyId,
      role: role
    })
    .eq("id", currentUser.id);

  if (profileError) {
    console.error("ACCEPT PROFILE ERROR:", profileError);
    alert(profileError.message || "Unable to accept invitation.");
    return;
  }

  const { error: inviteError } = await supabaseClient
    .from("staff_invitations")
    .update({
      status: "accepted",
      responded_at: new Date().toISOString()
    })
    .eq("id", invitationId);

  if (inviteError) {
    console.error("ACCEPT INVITE ERROR:", inviteError);
    alert(inviteError.message || "Invitation accepted, but invite record update failed.");
    return;
  }

  await createResponseNotification(invitationId, "accepted");

  alert("Invitation accepted successfully.");
  window.location.href = "./dashboard.html?v=950";
}

async function declineInvitation(invitationId) {
  const { error } = await supabaseClient
    .from("staff_invitations")
    .update({
      status: "declined",
      responded_at: new Date().toISOString()
    })
    .eq("id", invitationId);

  if (error) {
    console.error("DECLINE INVITE ERROR:", error);
    alert(error.message || "Unable to decline invitation.");
    return;
  }

  await createResponseNotification(invitationId, "declined");

  alert("Invitation declined.");
  await loadPendingInvitations();
}

async function createResponseNotification(invitationId, action) {
  const { data: invite } = await supabaseClient
    .from("staff_invitations")
    .select("invited_by, role")
    .eq("id", invitationId)
    .maybeSingle();

  if (!invite?.invited_by) return;

  await supabaseClient
    .from("notifications")
    .insert([
      {
        user_id: invite.invited_by,
        title: "Invitation Response",
        message: `A user has ${action} the ${formatRole(invite.role)} invitation.`,
        type: "staff_invitation_response",
        is_read: false
      }
    ]);
}

async function loadNotifications() {
  const list = document.getElementById("notificationList");
  if (!list) return;

  const { data, error } = await supabaseClient
    .from("notifications")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("LOAD NOTIFICATIONS ERROR:", error);
    list.innerHTML = "<p>Unable to load notifications.</p>";
    return;
  }

  if (!data || !data.length) {
    list.innerHTML = "<p>No notifications yet.</p>";
    return;
  }

  list.innerHTML = data.map((n) => `
    <div class="modern-list-card ${n.is_read ? "" : "notification-unread"}">
      <strong>${n.title || "Notification"}</strong>
      <p>${n.message || ""}</p>
      <small>${new Date(n.created_at).toLocaleString()}</small>

      ${
        n.is_read
          ? `<p class="small-text" style="margin-top:8px;">Read</p>`
          : `<button type="button" class="btn-outline inline-btn" style="margin-top:10px;" onclick="markNotificationRead('${n.id}')">Mark as read</button>`
      }
    </div>
  `).join("");
}

async function markNotificationRead(notificationId) {
  const { error } = await supabaseClient
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", currentUser.id);

  if (error) {
    console.error("MARK AS READ ERROR:", error);
    alert("Unable to mark notification as read.");
    return;
  }

  await loadNotifications();
}

async function getCompanyName(companyId) {
  const { data } = await supabaseClient
    .from("companies")
    .select("name")
    .eq("id", companyId)
    .maybeSingle();

  return data?.name || "Unknown Company";
}

async function getStoreName(storeId) {
  const { data } = await supabaseClient
    .from("stores")
    .select("name")
    .eq("id", storeId)
    .maybeSingle();

  return data?.name || "Assigned Store";
}

function formatRole(role) {
  if (!role) return "-";
  return role.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

window.acceptInvitation = acceptInvitation;
window.declineInvitation = declineInvitation;
window.markNotificationRead = markNotificationRead;

loadNotificationsPage();
