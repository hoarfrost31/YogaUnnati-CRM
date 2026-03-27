const UPDATE_PROMPT_ID = "pwaUpdatePrompt";
let hasPendingRefresh = false;

function createUpdatePrompt() {
  const prompt = document.createElement("div");
  prompt.id = UPDATE_PROMPT_ID;
  prompt.hidden = true;
  prompt.innerHTML = `
    <span>Update available</span>
    <button type="button">Refresh</button>
  `;

  Object.assign(prompt.style, {
    position: "fixed",
    right: "16px",
    bottom: "16px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 14px",
    borderRadius: "14px",
    background: "#241d18",
    color: "#fffdfa",
    boxShadow: "0 12px 28px rgba(36,29,24,0.2)",
    zIndex: "9999",
    font: "600 14px Manrope, sans-serif",
  });

  const button = prompt.querySelector("button");
  Object.assign(button.style, {
    border: "none",
    borderRadius: "999px",
    minHeight: "36px",
    padding: "0 14px",
    background: "#dc7c43",
    color: "#ffffff",
    font: "700 13px Manrope, sans-serif",
    cursor: "pointer",
  });

  document.body.appendChild(prompt);
  return { prompt, button };
}

function showUpdatePrompt(registration) {
  const { prompt, button } = window.__pwaUpdatePrompt || (window.__pwaUpdatePrompt = createUpdatePrompt());
  prompt.hidden = false;
  button.onclick = () => {
    if (registration.waiting) {
      hasPendingRefresh = true;
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }
  };
}

function hideUpdatePrompt() {
  if (window.__pwaUpdatePrompt) {
    window.__pwaUpdatePrompt.prompt.hidden = true;
  }
}

function trackInstallingWorker(registration, worker) {
  if (!worker) {
    return;
  }

  worker.addEventListener("statechange", () => {
    if (worker.state === "installed" && navigator.serviceWorker.controller) {
      showUpdatePrompt(registration);
    }
  });
}

function bindRegistration(registration) {
  if (registration.waiting && navigator.serviceWorker.controller) {
    showUpdatePrompt(registration);
  }

  registration.addEventListener("updatefound", () => {
    trackInstallingWorker(registration, registration.installing);
  });
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("./sw.js");
      bindRegistration(registration);
      registration.update().catch(() => {});

      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          registration.update().catch(() => {});
        }
      });

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (hasPendingRefresh) {
          window.location.reload();
        }
      });

      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "SW_ACTIVATED") {
          hideUpdatePrompt();
          if (hasPendingRefresh) {
            window.location.reload();
          }
        }
      });
    } catch {}
  });
}
