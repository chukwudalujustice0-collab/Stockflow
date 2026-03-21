let currentUser = null;
let currentProfile = null;

async function requireAuth() {
  const { data: authData, error: authError } = await supabaseClient.auth.getUser();

  if (authError || !authData?.user) {
    window.location.href = "login.html";
    return null;
  }

  currentUser = authData.user;

  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (profileError) {
    console.error("PROFILE ERROR:", profileError);
    alert("Unable to load your profile.");
    window.location.href = "login.html";
    return null;
  }

  if (!profile) {
    alert("Profile not found.");
    window.location.href = "login.html";
    return null;
  }

  currentProfile = profile;
  return { user: currentUser, profile: currentProfile };
}

function fillHeader(profile) {
  const nameEl = document.getElementById("welcomeName");
  const roleEl = document.getElementById("welcomeRole");

  if (nameEl) nameEl.textContent = profile.full_name || profile.email || "User";
  if (roleEl) roleEl.textContent = profile.role || "No role yet";
}

function renderSidebarByRole(profile) {
  return profile;
}

async function logoutUser() {
  await supabaseClient.auth.signOut();
  window.location.href = "login.html";
}

document.addEventListener("click", async (e) => {
  if (e.target && e.target.id === "logoutBtn") {
    await logoutUser();
  }
});