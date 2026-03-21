

async function loadSettingsPage() {
  const auth = await requireAuth();
  if (!auth) return;

  const { profile } = auth;
  fillHeader(profile);

  document.getElementById("settingsFullName").textContent =
    profile.full_name || "-";

  document.getElementById("settingsEmail").textContent =
    profile.email || currentUser.email || "-";

  document.getElementById("settingsRole").textContent =
    profile.role || "No role";

  document.getElementById("settingsCompanyId").textContent =
    profile.company_id || "-";

  if (profile.company_id) {
    const { data: company, error: companyError } = await supabaseClient
      .from("companies")
      .select("name")
      .eq("id", profile.company_id)
      .maybeSingle();

    console.log("SETTINGS COMPANY:", company, companyError);

    document.getElementById("settingsCompanyName").textContent =
      company?.name || "-";
  }

  const { data: subscription, error: subError } = await supabaseClient
    .from("subscriptions")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  console.log("SETTINGS SUBSCRIPTION:", subscription, subError);

  if (subscription) {
    document.getElementById("settingsPlan").textContent =
      subscription.plan || "Free";

    document.getElementById("settingsPlanStatus").textContent =
      subscription.status || "Inactive";

    document.getElementById("settingsPlanExpiry").textContent =
      subscription.expires_at
        ? new Date(subscription.expires_at).toLocaleString()
        : "-";
  }

  document.getElementById("logoutBtnNav")?.addEventListener("click", logoutUser);
}

loadSettingsPage();