

(function () {
  function ensureOfflineBanner() {
    let banner = document.getElementById("offlineBanner");

    if (!banner) {
      banner = document.createElement("div");
      banner.id = "offlineBanner";
      banner.style.position = "fixed";
      banner.style.top = "0";
      banner.style.left = "0";
      banner.style.right = "0";
      banner.style.zIndex = "9999";
      banner.style.padding = "10px 14px";
      banner.style.textAlign = "center";
      banner.style.fontSize = "14px";
      banner.style.fontWeight = "600";
      banner.style.display = "none";
      banner.style.background = "#f59e0b";
      banner.style.color = "#111827";
      banner.textContent = "You are offline. Some features may not work.";
      document.body.appendChild(banner);
    }

    return banner;
  }

  function updateOfflineState() {
    const banner = ensureOfflineBanner();

    if (navigator.onLine) {
      banner.style.display = "none";
      document.body.classList.remove("is-offline");
    } else {
      banner.style.display = "block";
      document.body.classList.add("is-offline");
    }
  }

  window.addEventListener("online", updateOfflineState);
  window.addEventListener("offline", updateOfflineState);
  window.addEventListener("load", updateOfflineState);
})();