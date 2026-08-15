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
};

// 每个页面（含 navigation.instant 无刷新切换）渲染完成后，重置 MathJax 状态并重新排版。
// 参考 hpc101.zjusct.io 的做法，保证公式在第一次进入和后续导航时都能自动加载。
document$.subscribe(function () {
  MathJax.startup.output.clearCache();
  MathJax.typesetClear();
  MathJax.texReset();
  MathJax.typesetPromise();
});
