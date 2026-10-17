(function () {
  "use strict";

  var ORIGIN = "https://giscus.app";

  function theme() {
    return window.site.theme.mode === "dark" ? "dark" : "light";
  }

  function syncTheme() {
    var frame = document.querySelector(".giscus-frame");
    if (frame && frame.contentWindow) {
      frame.contentWindow.postMessage({ giscus: { setConfig: { theme: theme() } } }, ORIGIN);
    }
  }

  function initComments(root) {
    var container = root.querySelector(".giscus");
    if (!container || container.dataset.initialized) return;
    container.dataset.initialized = "true";

    var script = document.createElement("script");
    script.src = ORIGIN + "/client.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    ["repo", "repo-id", "category", "category-id"].forEach(function (name) {
      script.setAttribute("data-" + name, container.getAttribute("data-" + name));
    });
    // A separate discussion for each URL, including after instant navigation.
    script.setAttribute("data-mapping", "pathname");
    script.setAttribute("data-strict", "1");
    script.setAttribute("data-reactions-enabled", "1");
    script.setAttribute("data-emit-metadata", "0");
    script.setAttribute("data-input-position", "top");
    script.setAttribute("data-theme", theme());
    script.setAttribute("data-lang", "zh-CN");
    script.setAttribute("data-loading", "lazy");
    script.onerror = function () {
      var status = container.parentElement.querySelector(".site-comments__status");
      status.textContent = "评论暂时无法加载，请稍后刷新，或前往 GitHub Discussions。";
      status.hidden = false;
    };
    container.appendChild(script);
  }

  window.site.theme.subscribe(syncTheme);
  window.site.onPageReady(initComments);
})();
