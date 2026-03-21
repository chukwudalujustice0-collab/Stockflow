let currentUser = null;
let currentProfile = null;

async function requireAuth() {
  try {
    const { data, error } = await supabaseClient.auth.getUser();

    if (error || !data?.user) {
      window.location.href = "login.html";
      return null;
    }

    currentUser = data.user;

    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("PROFILE ERROR:", profileError);
      alert("Profile not found. Please login again.");
      await supabaseClient.auth.signOut();
      window.location.href = "login.html";
      return null;
    }

    currentProfile = profile;
    return { user: currentUser, profile: currentProfile };

  } catch (err) {
    console.error("AUTH ERROR:", err);
    window.location.href = "login.html";
    return null;
  }
}

function fillHeader(profile) {
  const nameEl = document.getElementById("welcomeName");
  const roleEl = document.getElementById("welcomeRole");

  if (nameEl) {
    nameEl.textContent = profile.full_name || profile.email || "User";
  }

  if (roleEl) {
    roleEl.textContent = profile.role || "No role";
  }
}

async function logoutUser() {
  await supabaseClient.auth.signOut();
  window.location.href = "login.html";
}

// global logout listener
document.addEventListener("click", async (e) => {
  if (
    e.target &&
    (e.target.id === "logoutBtn" || e.target.id === "logoutBtnNav")
  ) {
    await logoutUser();
  }
});