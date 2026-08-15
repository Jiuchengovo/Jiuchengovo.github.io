/* ============================================================================
   theme.js —— 首页终端打字动画
   ----------------------------------------------------------------------------
   逐条执行「打字命令 → 显示对应输出」的交替序列。
   尊重 prefers-reduced-motion：直接一次性显示全部内容。
   ============================================================================ */
(function () {
  "use strict";

  var terminal = document.querySelector(".home-terminal__screen");
  if (!terminal) return;

  var reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  var cmdLines = terminal.querySelectorAll("[data-typed]");
  var outLines = terminal.querySelectorAll("[data-typed-out]");

  // 输出行的文字在 data-typed-out 属性中，先复制到内容并隐藏
  outLines.forEach(function (el) {
    el.textContent = el.getAttribute("data-typed-out") || "";
    el.style.display = "none";
  });

  if (reduceMotion) {
    // 无障碍：直接全部显示
    cmdLines.forEach(function (el) {
      el.classList.add("is-visible");
      el.textContent = el.getAttribute("data-typed") || "";
    });
    outLines.forEach(function (el) {
      el.style.display = "";
    });
    return;
  }

  // 交替序列：cmd1 → out1 → cmd2 → out2 → …
  var queue = [];
  for (var i = 0; i < cmdLines.length; i++) {
    queue.push({ type: "cmd", el: cmdLines[i] });
    if (outLines[i]) queue.push({ type: "out", el: outLines[i] });
  }
  // 若输出行多于命令行，把剩余的追加到末尾
  for (var j = cmdLines.length; j < outLines.length; j++) {
    queue.push({ type: "out", el: outLines[j] });
  }

  function typeLine(el, text, done) {
    var i = 0;
    el.classList.add("is-visible");
    el.textContent = "";
    (function step() {
      if (i <= text.length) {
        el.textContent = text.slice(0, i);
        i++;
        setTimeout(step, 45);
      } else {
        setTimeout(done, 200);
      }
    })();
  }

  function showLine(el, done) {
    el.style.display = "";
    setTimeout(done, 180);
  }

  function run(index) {
    if (index >= queue.length) return;
    var item = queue[index];
    if (item.type === "cmd") {
      typeLine(item.el, item.el.getAttribute("data-typed") || "", function () {
        run(index + 1);
      });
    } else {
      showLine(item.el, function () {
        run(index + 1);
      });
    }
  }

  // 页面可见后再开播，避免后台标签页空耗
  if (document.visibilityState === "hidden") {
    document.addEventListener(
      "visibilitychange",
      function handler() {
        if (document.visibilityState === "visible") {
          document.removeEventListener("visibilitychange", handler);
          run(0);
        }
      },
      { once: true }
    );
  } else {
    run(0);
  }
})();
