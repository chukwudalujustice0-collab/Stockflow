

// ======================
// FORMAT MONEY
// ======================
function formatMoney(value) {
  return "₦" + Number(value || 0).toLocaleString();
}

// ======================
// FORMAT DATE
// ======================
function formatDate(date) {
  if (!date) return "-";
  return new Date(date).toLocaleString();
}

// ======================
// GENERATE ID
// ======================
function generateId(prefix = "") {
  return prefix + "_" + Math.random().toString(36).substr(2, 9);
}

// ======================
// DEBOUNCE (FOR SEARCH)
// ======================
function debounce(func, delay = 300) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
}

// ======================
// SHOW MESSAGE
// ======================
function showMessage(elementId, text, type = "info") {
  const el = document.getElementById(elementId);
  if (!el) return;

  el.textContent = text;

  el.classList.remove("ok-message", "error-message");

  if (type === "success") el.classList.add("ok-message");
  if (type === "error") el.classList.add("error-message");
}

// ======================
// SAFE NUMBER
// ======================
function toNumber(val) {
  return Number(val || 0);
}

// ======================
// CAPITALIZE
// ======================
function capitalize(text) {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}