// ======================
// INIT SUPABASE CLIENT
// ======================

if (!window.APP_CONFIG) {
  console.error("APP_CONFIG missing");
  alert("App configuration error");
}

const supabaseClient = supabase.createClient(
  window.APP_CONFIG.supabaseUrl,
  window.APP_CONFIG.supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

// ======================
// DEBUG (optional but helpful)
// ======================
supabaseClient.auth.getSession().then(({ data }) => {
  if (data?.session) {
    console.log("Session active:", data.session.user.email);
  } else {
    console.log("No active session");
  }
});
