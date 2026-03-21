

// ======================
// AUTH GUARD (UPGRADE)
// ======================
async function protectPage() {
  try {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error || !data?.session) {
      window.location.href = "./login.html";
      return null;
    }

    currentUser = data.session.user;

    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .single();

    if (profileError || !profile) {
      console.error("PROFILE LOAD ERROR:", profileError);
      window.location.href = "./login.html";
      return null;
    }

    currentProfile = profile;

    return {
      user: currentUser,
      profile: currentProfile
    };

  } catch (err) {
    console.error("AUTH GUARD ERROR:", err);
    window.location.href = "./login.html";
    return null;
  }
}

// ======================
// ROLE CHECK
// ======================
function hasRole(...roles) {
  if (!currentProfile) return false;
  return roles.includes(currentProfile.role);
}

// ======================
// PERMISSION CHECK
// ======================
function requireRole(...roles) {
  if (!hasRole(...roles)) {
    alert("Access denied");
    window.location.href = "./dashboard.html";
    return false;
  }
  return true;
}