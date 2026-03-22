const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const toggleBtn = document.getElementById("togglePasswordBtn");

loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (loginMessage) loginMessage.textContent = "Logging in...";

  const email = document.getElementById("email")?.value.trim().toLowerCase();
  const password = document.getElementById("password")?.value;

  try {
    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error("LOGIN ERROR:", error);
      if (loginMessage) loginMessage.textContent = error.message || "Login failed.";
      return;
    }

    const authResult = await requireAuth();

    if (!authResult) {
      if (loginMessage) loginMessage.textContent = "Unable to complete login.";
      return;
    }

    if (loginMessage) loginMessage.textContent = "Login successful. Redirecting...";

    setTimeout(() => {
      window.location.href = "./dashboard.html";
    }, 700);
  } catch (err) {
    console.error("LOGIN EXCEPTION:", err);
    if (loginMessage) loginMessage.textContent = "Unexpected error occurred.";
  }
});

toggleBtn?.addEventListener("click", () => {
  const passwordInput = document.getElementById("password");
  if (!passwordInput) return;

  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    toggleBtn.textContent = "Hide";
  } else {
    passwordInput.type = "password";
    toggleBtn.textContent = "Show";
  }
});
