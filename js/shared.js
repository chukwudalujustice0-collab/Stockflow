let currentUser = null;
let currentProfile = null;

async function requireAuth() {
  try {
    const { data, error } = await supabaseClient.auth.getUser();

    if (error || !data?.user) {
      window.location.href = "./login.html";
      return null;
    }

    currentUser = data.user;

    let { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (profileError) {
      console.error("PROFILE LOAD ERROR:", profileError);
      alert("Unable to load profile.");
      return null;
    }

    if (!profile) {
      const fallbackName =
        currentUser.user_metadata?.full_name ||
        currentUser.user_metadata?.name ||
        currentUser.email?.split("@")[0] ||
        "User";

      const { error: createError } = await supabaseClient
        .from("profiles")
        .insert([
          {
            id: currentUser.id,
            email: currentUser.email,
            full_name: fallbackName,
            role: "director"
          }
        ]);

      if (createError) {
        console.error("PROFILE CREATE ERROR:", createError);
        alert("Profile could not be created automatically.");
        return null;
      }

      const { data: newProfile, error: reloadError } = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (reloadError || !newProfile) {
        console.error("PROFILE RELOAD ERROR:", reloadError);
        alert("Profile created but could not be loaded.");
        return null;
      }

      profile = newProfile;
    }

    currentProfile = profile;
    return { user: currentUser, profile: currentProfile };

  } catch (err) {
    console.error("AUTH ERROR:", err);
    alert("Authentication failed.");
    return null;
  }
}

function fillHeader(profile) {
  const nameEl = document.getElementById("welcomeName");
  const roleEl = document.getElementById("welcomeRole");

  if (nameEl) {
    nameEl.textContent = profile?.full_name || profile?.email || "User";
  }

  if (roleEl) {
    roleEl.textContent = profile?.role || "director";
  }
}

async function logoutUser() {
  await supabaseClient.auth.signOut();
  window.location.href = "./login.html";
}

document.addEventListener("click", async (e) => {
  if (
    e.target &&
    (e.target.id === "logoutBtn" ||
      e.target.id === "logoutBtnNav" ||
      e.target.id === "logoutBtnSettings")
  ) {
    await logoutUser();
  }
});
