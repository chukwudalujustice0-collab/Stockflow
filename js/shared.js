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
        splitPartSafe(currentUser.email, "@", 0) ||
        "User";

      const { error: insertError } = await supabaseClient
        .from("profiles")
        .insert([
          {
            id: currentUser.id,
            full_name: fallbackName,
            phone: currentUser.user_metadata?.phone || "",
            email: currentUser.email,
            role: "director"
          }
        ]);

      if (insertError) {
        console.error("PROFILE INSERT ERROR:", insertError);
        alert("Profile not found and could not be created.");
        return null;
      }

      const reload = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .maybeSingle();

      profile = reload.data;
    }

    currentProfile = profile;
    return { user: currentUser, profile: currentProfile };

  } catch (err) {
    console.error("AUTH ERROR:", err);
    alert("Authentication failed.");
    return null;
  }
}

function splitPartSafe(value, separator, index) {
  if (!value) return "";
  const parts = String(value).split(separator);
  return parts[index] || "";
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
