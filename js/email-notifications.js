

async function loadEmailNotificationsPage() {
  const auth = await requireAuth();
  if (!auth) return;

  const { profile } = auth;
  fillHeader(profile);

  await loadEmailNotifications(profile);
}

async function loadEmailNotifications(profile) {
  const list = document.getElementById("emailNotificationList");
  if (!list) return;

  let data = [];
  let error = null;

  if (["director", "assistant_director"].includes(profile.role || "")) {
    ({ data, error } = await supabaseClient
      .from("email_notifications")
      .select("*")
      .order("created_at", { ascending: false }));
  } else {
    ({ data, error } = await supabaseClient
      .from("email_notifications")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false }));
  }

  if (error) {
    list.innerHTML = `<p>${error.message}</p>`;
    return;
  }

  if (!data || !data.length) {
    list.innerHTML = "<p>No email notifications yet.</p>";
    return;
  }

  list.innerHTML = data.map((row) => `
    <div class="modern-list-card">
      <strong>${row.subject}</strong>
      <p>${row.email}</p>
      <small>Type: ${row.type}</small><br>
      <small>Status: ${row.status}</small><br>
      <small>${new Date(row.created_at).toLocaleString()}</small>
    </div>
  `).join("");
}

loadEmailNotificationsPage();