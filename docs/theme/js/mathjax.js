/**
 * MathJax 惰性加载 —— 仅当页面包含公式（.arithmatex）时才注入 MathJax 4。
 *
 * 之前 MathJax 在 extra_javascript 里全局加载（约 1MB），每个页面都要下载，
 * 且 cdn.jsdelivr.net 在国内偶尔不稳定。改为按需加载后：
 *   - 无公式页面（首页/分区页等）完全不加载 MathJax，首屏更快；
 *   - 含公式页面（Crypto 等笔记）在渲染完成后自动注入并排版。
 */
(function () {
  "use strict";

  var CDN = "https://cdn.jsdelivr.net/npm/mathjax@4/tex-mml-chtml.js";
  var loaded = false;

  function hasMath(root) {
    return !!(root || document).querySelector(".arithmatex");
  }

  function typeset() {
    if (!window.MathJax || !MathJax.typesetPromise) return;
    try {
      MathJax.startup.output.clearCache();
      MathJax.typesetClear();
      MathJax.texReset();
      MathJax.typesetPromise();
    } catch (e) {}
  }

  function ensureLoaded() {
    if (loaded || !hasMath(document)) return;
    loaded = true;

    // 配置必须在 MathJax 脚本加载前就位
    window.MathJax = {
      tex: {
        inlineMath: [["\\(", "\\)"]],
        displayMath: [["\\[", "\\]"]],
        processEscapes: true,
        processEnvironments: true,
      },
      options: {
        ignoreHtmlClass: ".*|",
        processHtmlClass: "arithmatex",
      },
      startup: {
        ready: function () {
          MathJax.startup.defaultReady();
          typeset();
        },
      },
    };

    var s = document.createElement("script");
    s.src = CDN;
    s.async = true;
    document.head.appendChild(s);
  }

  // navigation.instant 无刷新导航后：新页面有公式则加载，已加载则重新排版
  if (window.document$) {
    window.document$.subscribe(function () {
      if (!loaded && hasMath(document)) {
        ensureLoaded();
      } else {
        typeset();
      }
    });
  }

  // 首次加载
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureLoaded);
  } else {
    ensureLoaded();
  }
})();
