(function () {
  "use strict";

  window.site = window.site || {};

  function syncPageState(root) {
    var scope = root || document;
    var isHome = !!scope.querySelector(".home-page");
    var hasRainbow = !!scope.querySelector(".rainbow-page");
    document.body.classList.toggle("home-active", isHome);
    document.body.classList.toggle("rainbow-active", hasRainbow);
  }

  // Background grid
  function initParallaxGrid() {
    var ratio = 0.1;
    var ticking = false;

    function update() {
      document.body.style.setProperty("--grid-y", -(window.scrollY * ratio) + "px");
      ticking = false;
    }

    window.addEventListener("scroll", function () {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    update();
  }

  window.site.onPageReady(syncPageState);
  initParallaxGrid();
})();
