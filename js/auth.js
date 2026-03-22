const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");

const signupForm = document.getElementById("signupForm");
const signupMessage = document.getElementById("signupMessage");

// LOGIN
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

// SIGNUP
signupForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (signupMessage) signupMessage.textContent = "Creating account...";

  const fullName = document.getElementById("fullName")?.value.trim();
  const phone = document.getElementById("phone")?.value.trim();
  const email = document.getElementById("signupEmail")?.value.trim().toLowerCase();
  const password = document.getElementById("signupPassword")?.value;
  const confirmPassword = document.getElementById("confirmPassword")?.value;

  if (!fullName || !phone || !email || !password || !confirmPassword) {
    if (signupMessage) signupMessage.textContent = "Fill all fields.";
    return;
  }

  if (password !== confirmPassword) {
    if (signupMessage) signupMessage.textContent = "Passwords do not match.";
    return;
  }

  if (password.length < 6) {
    if (signupMessage) signupMessage.textContent = "Password must be at least 6 characters.";
    return;
  }

  try {
    const { error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone
        }
      }
    });

    if (error) {
      console.error("SIGNUP ERROR:", error);
      if (signupMessage) signupMessage.textContent = error.message || "Signup failed.";
      return;
    }

    if (signupMessage) {
      signupMessage.textContent = "Account created successfully. You can now login.";
    }

    signupForm.reset();

    setTimeout(() => {
      window.location.href = "./login.html";
    }, 1200);
  } catch (err) {
    console.error("SIGNUP EXCEPTION:", err);
    if (signupMessage) signupMessage.textContent = "Unexpected error occurred.";
  }
});

// PASSWORD TOGGLES
document.getElementById("togglePasswordBtn")?.addEventListener("click", () => {
  const input = document.getElementById("password");
  const btn = document.getElementById("togglePasswordBtn");
  if (!input || !btn) return;

  if (input.type === "password") {
    input.type = "text";
    btn.textContent = "Hide";
  } else {
    input.type = "password";
    btn.textContent = "Show";
  }
});

document.getElementById("toggleSignupPasswordBtn")?.addEventListener("click", () => {
  const input = document.getElementById("signupPassword");
  const btn = document.getElementById("toggleSignupPasswordBtn");
  if (!input || !btn) return;

  if (input.type === "password") {
    input.type = "text";
    btn.textContent = "Hide";
  } else {
    input.type = "password";
    btn.textContent = "Show";
  }
});

document.getElementById("toggleConfirmPasswordBtn")?.addEventListener("click", () => {
  const input = document.getElementById("confirmPassword");
  const btn = document.getElementById("toggleConfirmPasswordBtn");
  if (!input || !btn) return;

  if (input.type === "password") {
    input.type = "text";
    btn.textContent = "Hide";
  } else {
    input.type = "password";
    btn.textContent = "Show";
  }
});
