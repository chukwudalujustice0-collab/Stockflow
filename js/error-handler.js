

window.StockFlowErrors = {
  lastError: null
};

function logError(source, error) {
  const details = {
    source: source || "unknown",
    message: error?.message || String(error || "Unknown error"),
    stack: error?.stack || null,
    time: new Date().toISOString()
  };

  window.StockFlowErrors.lastError = details;
  console.error(`[${details.source}]`, details.message, error);
}

function safeRun(fn, source = "safeRun") {
  try {
    return fn();
  } catch (error) {
    logError(source, error);
    return null;
  }
}

async function safeRunAsync(fn, source = "safeRunAsync") {
  try {
    return await fn();
  } catch (error) {
    logError(source, error);
    return null;
  }
}

function showFriendlyError(targetId, message = "Something went wrong. Please try again.") {
  const el = document.getElementById(targetId);
  if (!el) return;

  el.textContent = message;
  el.classList.remove("ok-message");
  el.classList.add("error-message");
}

window.addEventListener("error", (event) => {
  logError("window.error", event.error || event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  logError("unhandledrejection", event.reason);
});