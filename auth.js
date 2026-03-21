const loginForm = document.getElementById("loginForm");
const messageEl = document.getElementById("message");

loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim().toLowerCase();
  const password = document.getElementById("password").value;

  messageEl.textContent = "Logging in...";

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    console.log("LOGIN DATA:", data);
    console.log("LOGIN ERROR:", error);

    if (error) {
      messageEl.textContent = error.message;
      return;
    }

    messageEl.style.color = "green";
    messageEl.textContent = "Login successful. Redirecting...";
    window.location.href = "dashboard.html";
  } catch (err) {
    console.error("LOGIN CATCH ERROR:", err);
    messageEl.textContent = err.message || "Something went wrong.";
  }
});