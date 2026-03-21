window.APP_CONFIG = {
  appName: "StockFlow",
  appUrl: "https://stockflow.ceetice.com",
  supabaseUrl: "https://qclghpggnxjpjffhclau.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjbGdocGdnbnhqcGpmZmhjbGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MjAzMzIsImV4cCI6MjA4OTQ5NjMzMn0.u4LlL4t0ouMC5dTbxNag1ZUvnwRzPtOjg1gvTJZdQQk"
};

if (location.protocol !== "https:" && location.hostname !== "localhost") {
  location.href = "https://" + location.host + location.pathname;
}