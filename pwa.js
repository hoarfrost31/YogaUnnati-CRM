if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    let isRefreshing = false;

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (isRefreshing) {
        return;
      }

      isRefreshing = true;
      window.location.reload();
    });

    navigator.serviceWorker.register("./sw.js").then((registration) => {
      registration.update().catch(() => {});

      setInterval(() => {
        registration.update().catch(() => {});
      }, 5 * 60 * 1000);
    }).catch(() => {});
  });
}
