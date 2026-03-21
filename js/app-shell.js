

(function () {
  function highlightCurrentNav() {
    const path = window.location.pathname.split("/").pop() || "index.html";
    const navItems = document.querySelectorAll(".bottom-nav-item[href]");

    navItems.forEach((item) => {
      const href = item.getAttribute("href") || "";
      const cleanHref = href.replace("./", "");

      if (cleanHref === path) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });
  }

  function setPageTitleFallback() {
    const pageTitle = document.querySelector(".page-title");
    if (!pageTitle) return;

    if (!pageTitle.textContent || !pageTitle.textContent.trim()) {
      pageTitle.textContent = document.title.replace("StockFlow | ", "") || "StockFlow";
    }
  }

  function initAppShell() {
    highlightCurrentNav();
    setPageTitleFallback();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAppShell);
  } else {
    initAppShell();
  }
})();