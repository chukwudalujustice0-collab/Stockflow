// =========================
// LOGIN
// =========================
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");

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

    if (loginMessage) loginMessage.textContent = "Login successful. Redirecting...";

    setTimeout(() => {
      window.location.href = "./dashboard.html";
    }, 700);
  } catch (err) {
    console.error("LOGIN EXCEPTION:", err);
    if (loginMessage) loginMessage.textContent = "Unexpected error occurred.";
  }
});

// =========================
// SIGNUP
// =========================
const signupForm = document.getElementById("signupForm");
const signupMessage = document.getElementById("signupMessage");

signupForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (signupMessage) signupMessage.textContent = "Creating account...";

  const fullName = document.getElementById("fullName")?.value.trim();
  const email = document.getElementById("email")?.value.trim().toLowerCase();
  const password = document.getElementById("password")?.value;

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password
    });

    if (error) {
      console.error("SIGNUP ERROR:", error);
      if (signupMessage) signupMessage.textContent = error.message || "Signup failed.";
      return;
    }

    const userId = data?.user?.id;

    if (!userId) {
      if (signupMessage) signupMessage.textContent = "Signup failed. No user returned.";
      return;
    }

    const { error: profileError } = await supabaseClient
      .from("profiles")
      .insert([
        {
          id: userId,
          email,
          full_name: fullName,
          role: "director"
        }
      ]);

    if (profileError) {
      console.error("PROFILE INSERT ERROR:", profileError);
      if (signupMessage) signupMessage.textContent = profileError.message || "Profile creation failed.";
      return;
    }

    if (signupMessage) {
      signupMessage.classList.add("ok-message");
      signupMessage.textContent = "Account created successfully. Redirecting to login...";
    }

    setTimeout(() => {
      window.location.href = "./login.html";
    }, 1000);
  } catch (err) {
    console.error("SIGNUP EXCEPTION:", err);
    if (signupMessage) signupMessage.textContent = "Unexpected error occurred.";
  }
});

// =========================
// SHOW / HIDE PASSWORD
// =========================
const toggleBtn = document.getElementById("togglePasswordBtn");

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