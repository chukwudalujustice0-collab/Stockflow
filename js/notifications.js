async function loadNotificationsPage() {
  const auth = await requireAuth();
  if (!auth) return;

  fillHeader(auth.profile);
  await loadNotifications();
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
    console.error("NOTIFICATIONS ERROR:", error);
    list.innerHTML = "<p>Unable to load notifications.</p>";
    return;
  }

  if (!data || !data.length) {
    list.innerHTML = "<p>No notifications yet.</p>";
    return;
  }

  list.innerHTML = data.map((n) => `
    <div class="modern-list-card ${n.is_read ? "" : "unread-notification"}">
      <strong>${n.title}</strong>
      <p>${n.message}</p>
      <small>${new Date(n.created_at).toLocaleString()}</small>

      ${
        n.is_read
          ? `<p class="small-text" style="margin-top:8px;">Read</p>`
          : `<button type="button" class="btn-outline inline-btn" onclick="markAsRead('${n.id}')">Mark as read</button>`
      }
    </div>
  `).join("");
}

async function markAsRead(notificationId) {
  const { error } = await supabaseClient
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", currentUser.id);

  if (error) {
    console.error("MARK READ ERROR:", error);
    alert("Unable to mark notification as read.");
    return;
  }

  await loadNotifications();
}

loadNotificationsPage();