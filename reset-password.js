

const resetForm = document.getElementById("resetPasswordForm");
const resetMessage = document.getElementById("resetMessage");

resetForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const newPassword = document.getElementById("newPassword").value.trim();

  if (!newPassword) {
    resetMessage.textContent = "Enter a new password.";
    return;
  }

  resetMessage.textContent = "Updating password...";

  const { error } = await supabaseClient.auth.updateUser({
    password: newPassword
  });

  if (error) {
    resetMessage.textContent = error.message;
    return;
  }

  resetMessage.textContent = "Password updated successfully. You can now login.";
  setTimeout(() => {
    window.location.href = "login.html";
  }, 1200);
});