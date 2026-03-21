const signupForm = document.getElementById("signupForm");
const signupMessage = document.getElementById("signupMessage");
const signupBtn = document.getElementById("signupBtn");

signupForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fullName = document.getElementById("fullName").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const email = document.getElementById("signupEmail").value.trim().toLowerCase();
  const password = document.getElementById("signupPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  signupMessage.textContent = "";

  if (!fullName) {
    signupMessage.textContent = "Enter your full name.";
    return;
  }

  if (!phone) {
    signupMessage.textContent = "Enter your phone number.";
    return;
  }

  if (!email) {
    signupMessage.textContent = "Enter your email.";
    return;
  }

  if (password.length < 6) {
    signupMessage.textContent = "Password must be at least 6 characters.";
    return;
  }

  if (password !== confirmPassword) {
    signupMessage.textContent = "Passwords do not match.";
    return;
  }

  signupBtn.disabled = true;
  signupMessage.textContent = "Creating account...";

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone
        }
      }
    });

    console.log("SIGNUP DATA:", data);
    console.log("SIGNUP ERROR:", error);

    if (error) {
      signupMessage.textContent = error.message;
      signupBtn.disabled = false;
      return;
    }

    const user = data?.user;
    const session = data?.session;

    if (user && session) {
      const { error: profileError } = await supabaseClient
        .from("profiles")
        .update({
          full_name: fullName,
          phone: phone
        })
        .eq("id", user.id);

      console.log("PROFILE UPDATE ERROR:", profileError);

      signupMessage.textContent = "Account created successfully. Redirecting...";
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1000);
      return;
    }

    if (user && !session) {
      signupMessage.textContent = "Account created. Please login.";
      signupForm.reset();
      signupBtn.disabled = false;
      return;
    }

    signupMessage.textContent = "Signup completed. Please login.";
    signupBtn.disabled = false;
  } catch (err) {
    console.error("SIGNUP CATCH ERROR:", err);
    signupMessage.textContent = err.message || "Something went wrong.";
    signupBtn.disabled = false;
  }
});