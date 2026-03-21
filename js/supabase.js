// Ensure config is loaded first
if (!window.APP_CONFIG) {
  alert("App configuration missing. Load config.js first.");
  throw new Error("APP_CONFIG not found");
}

// Initialize Supabase client
const supabaseClient = supabase.createClient(
  window.APP_CONFIG.supabaseUrl,
  window.APP_CONFIG.supabaseAnonKey
);