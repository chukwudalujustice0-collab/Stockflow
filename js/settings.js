async function loadSettingsPage() {
  const auth = await requireAuth();
  if (!auth) return;

  const { profile } = auth;
  fillHeader(profile);

  loadProfile(profile);
  await loadCompany(profile);
  await loadSubscription();
}

loadSettingsPage();

// ======================
// PROFILE
// ======================
function loadProfile(profile) {
  document.getElementById("settingsFullNameInput").value = profile.full_name || "";
  document.getElementById("settingsEmailInput").value = profile.email || "";
}

document.getElementById("profileSettingsForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const msg = document.getElementById("profileSettingsMessage");
  const fullName = document.getElementById("settingsFullNameInput").value;

  msg.textContent = "Saving...";

  const { error } = await supabaseClient
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", currentUser.id);

  if (error) {
    console.error(error);
    msg.textContent = error.message;
    return;
  }

  msg.textContent = "Profile updated";
});

// ======================
// COMPANY
// ======================
async function loadCompany(profile) {
  if (!profile.company_id) return;

  const { data } = await supabaseClient
    .from("companies")
    .select("name")
    .eq("id", profile.company_id)
    .maybeSingle();

  if (data) {
    document.getElementById("settingsCompanyNameInput").value = data.name || "";
  }
}

document.getElementById("companySettingsForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const msg = document.getElementById("companySettingsMessage");
  const name = document.getElementById("settingsCompanyNameInput").value;

  msg.textContent = "Saving...";

  const { error } = await supabaseClient
    .from("companies")
    .update({ name })
    .eq("id", currentProfile.company_id);

  if (error) {
    console.error(error);
    msg.textContent = error.message;
    return;
  }

  msg.textContent = "Company updated";
});

// ======================
// SUBSCRIPTION
// ======================
async function loadSubscription() {
  const { data } = await supabaseClient
    .from("subscriptions")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    document.getElementById("settingsPlanText").textContent = "Free";
    document.getElementById("settingsPlanStatus").textContent = "Inactive";
    document.getElementById("settingsPlanStores").textContent = "1";
    document.getElementById("settingsPlanStaff").textContent = "2";
    return;
  }

  document.getElementById("settingsPlanText").textContent = data.plan;
  document.getElementById("settingsPlanStatus").textContent = data.status;
  document.getElementById("settingsPlanStores").textContent = data.max_stores;
  document.getElementById("settingsPlanStaff").textContent = data.max_staff;
}

// ======================
// LOGOUT
// ======================
document.getElementById("logoutBtnSettings")?.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  window.location.href = "./login.html";
});