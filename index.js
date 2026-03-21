

let deferredPrompt = null;

async function redirectIfLoggedIn() {
  try {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
      console.error("SESSION ERROR:", error);
      return;
    }

    if (data?.session) {
      window.location.href = "dashboard.html";
    }
  } catch (err) {
    console.error("INDEX REDIRECT ERROR:", err);
  }
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;

  const installBtn = document.getElementById("installBtn");
  if (installBtn) {
    installBtn.style.display = "inline-block";
  }
});

document.getElementById("installBtn")?.addEventListener("click", async () => {
  if (!deferredPrompt) return;

  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;

  const installBtn = document.getElementById("installBtn");
  if (installBtn) {
    installBtn.style.display = "none";
  }
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js")
    .then(() => console.log("Service worker registered"))
    .catch((err) => console.error("Service worker error:", err));
}

redirectIfLoggedIn();