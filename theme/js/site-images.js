(function () {
  "use strict";

  window.site = window.site || {};

  function previewUrl(src) {
    return src.replace(/\.(png|jpe?g)(\?|#|$)/i, ".preview.jpg$2");
  }

  function loadNextImage(items, i) {
    if (i >= items.length) return;
    var img = items[i];
    var fullSrc = img.dataset.fullsrc || img.src;
    if (!/\.(png|jpe?g)/i.test(fullSrc) || /\.preview\.jpg/i.test(fullSrc)) {
      loadNextImage(items, i + 1);
      return;
    }

    var pv = previewUrl(fullSrc);
    if (pv !== img.src) img.src = pv;

    var full = new Image();
    full.onload = function () {
      img.src = fullSrc;
      loadNextImage(items, i + 1);
    };
    full.onerror = function () {
      loadNextImage(items, i + 1);
    };
    full.src = fullSrc;
  }

  function upgradeImages(root) {
    var scope = root || document;
    var imgs = scope.querySelectorAll(".md-content img, img");
    var candidates = [];
    for (var i = 0; i < imgs.length; i++) {
      if (/\.(png|jpe?g)/i.test(imgs[i].src)) candidates.push(imgs[i]);
    }
    if (candidates.length) {
      setTimeout(function () {
        loadNextImage(candidates, 0);
      }, 500);
    }
  }

  window.site.previewUrl = previewUrl;
  window.site.upgradeImages = upgradeImages;

  window.site.onPageReady(upgradeImages);
})();
