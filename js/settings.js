async function loadSettingsPage() {
  const auth = await requireAuth();
  if (!auth) return;

  const { user, profile } = auth;

  fillHeader(profile);

  // Fill profile fields
  document.getElementById("settingsFullName").value = profile.full_name || "";
  document.getElementById("settingsPhone").value = profile.phone || "";
  document.getElementById("settingsEmail").value = profile.email || "";

  // Load company
  if (profile.company_id) {
    const { data, error } = await supabaseClient
      .from("companies")
      .select("name")
      .eq("id", profile.company_id)
      .maybeSingle();

    if (!error && data) {
      document.getElementById("settingsCompanyName").value = data.name || "";
    }
  }
}

/* =========================
   UPDATE PROFILE
========================= */
document.getElementById("profileForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const msg = document.getElementById("profileMsg");

  const fullName = document.getElementById("settingsFullName").value.trim();
  const phone = document.getElementById("settingsPhone").value.trim();

  if (msg) msg.textContent = "Saving profile...";

  const { error } = await supabaseClient
    .from("profiles")
    .update({
      full_name: fullName,
      phone: phone
    })
    .eq("id", currentUser.id);

  if (error) {
    console.error("PROFILE UPDATE ERROR:", error);
    if (msg) msg.textContent = error.message || "Failed to update profile.";
    return;
  }

  if (msg) msg.textContent = "Profile updated successfully.";
});

/* =========================
   UPDATE COMPANY
========================= */
document.getElementById("companyForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const msg = document.getElementById("companyMsg");
  const name = document.getElementById("settingsCompanyName").value.trim();

  if (!currentProfile?.company_id) {
    if (msg) msg.textContent = "No company found.";
    return;
  }

  if (!name) {
    if (msg) msg.textContent = "Enter company name.";
    return;
  }

  if (msg) msg.textContent = "Saving company...";

  const { error } = await supabaseClient
    .from("companies")
    .update({ name })
    .eq("id", currentProfile.company_id);

  if (error) {
    console.error("COMPANY UPDATE ERROR:", error);
    if (msg) msg.textContent = error.message || "Failed to update company.";
    return;
  }

  if (msg) msg.textContent = "Company updated successfully.";
});

loadSettingsPage();
