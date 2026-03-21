

async function loadNotificationsPage() {
  const auth = await requireAuth();
  if (!auth) return;

  const { profile } = auth;
  fillHeader(profile);

  await loadNotifications();
}

async function loadNotifications() {
  const list = document.getElementById("notificationsList");
  if (!list) return;

  const { data, error } = await supabaseClient
    .from("notifications")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false });

  console.log("NOTIFICATIONS:", data, error);

  if (error) {
    list.innerHTML = `<p>${error.message}</p>`;
    return;
  }

  if (!data || !data.length) {
    list.innerHTML = "<p>No notifications yet.</p>";
    return;
  }

  list.innerHTML = data.map((notification) => `
    <div class="modern-list-card" style="${notification.is_read ? 'opacity:0.75;' : 'border-left:4px solid #ff3b3b;'}">
      <strong>${notification.title}</strong>
      <p>${notification.message}</p>
      <small>${new Date(notification.created_at).toLocaleString()}</small>
      <div style="margin-top:10px;">
        ${notification.is_read ? '' : `<button class="btn-outline inline-btn" type="button" onclick="markNotificationRead('${notification.id}')">Mark read</button>`}
      </div>
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
    alert(error.message || "Unable to mark as read.");
    return;
  }

  await loadNotifications();
}

document.getElementById("markAllReadBtn")?.addEventListener("click", async () => {
  const { error } = await supabaseClient
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", currentUser.id)
    .eq("is_read", false);

  if (error) {
    alert(error.message || "Unable to mark all as read.");
    return;
  }

  await loadNotifications();
});

loadNotificationsPage();