async function checkExistingSession() {
  try {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
      console.error("SESSION CHECK ERROR:", error);
      return;
    }

    if (data?.session) {
      window.location.href = "./dashboard.html";
    }
  } catch (err) {
    console.error("INDEX SESSION ERROR:", err);
  }
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("./service-worker.js");
      console.log("Service worker registered");
    } catch (err) {
      console.error("Service worker registration failed:", err);
    }
  });
}

checkExistingSession();