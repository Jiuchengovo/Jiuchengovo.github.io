(function () {
  "use strict";

  window.site = window.site || {};

  // Home typewriter
  var typewriterTimers = [];
  var typewriterRun = 0;

  function rememberTimer(id) {
    typewriterTimers.push(id);
    return id;
  }

  function forgetTimer(id) {
    var i = typewriterTimers.indexOf(id);
    if (i >= 0) typewriterTimers.splice(i, 1);
  }

  function clearTypewriter() {
    typewriterRun++;
    for (var i = 0; i < typewriterTimers.length; i++) clearTimeout(typewriterTimers[i]);
    typewriterTimers = [];

    var cursors = document.querySelectorAll(".typed-cursor, .typed-cursor-standalone");
    for (var k = 0; k < cursors.length; k++) cursors[k].remove();

    var lines = document.querySelectorAll(".typed-text");
    for (var l = 0; l < lines.length; l++) {
      lines[l].textContent = "";
      lines[l].style.display = "none";
    }

    var promptLines = document.querySelectorAll(".home-terminal__line--prompt");
    for (var p = 0; p < promptLines.length; p++) promptLines[p].style.display = "none";

    var hidInputs = document.querySelectorAll(".terminal-hidden-input");
    for (var hi = 0; hi < hidInputs.length; hi++) hidInputs[hi].remove();

    var termKeys = document.querySelectorAll(".home-terminal-keys");
    for (var tk = 0; tk < termKeys.length; tk++) termKeys[tk].remove();

    var brs = document.querySelectorAll("[id^='typed-br-']");
    for (var b = 0; b < brs.length; b++) brs[b].style.display = "none";
  }

  function startHomeTypewriter(root) {
    clearTypewriter();

    var scope = root || document;
    var line1Host = scope.querySelector("#typed-line-1-host");
    var line1Separator = scope.querySelector("#typed-line-1-separator");
    var line1Prompt = scope.querySelector("#typed-line-1-prompt");
    var line1Command = scope.querySelector("#typed-line-1-command");
    var el2 = scope.querySelector("#typed-line-2");
    var el3 = scope.querySelector("#typed-line-3");
    var finalPrompt = scope.querySelector(".home-terminal__line--prompt");
    var finalCommand = scope.querySelector("#typed-line-4-command");
    if (!line1Host || !line1Separator || !line1Prompt || !line1Command || !el2 || !el3 || !finalPrompt || !finalCommand) return;

    var run = typewriterRun;

    function delay(ms, done) {
      var timer = rememberTimer(setTimeout(function () {
        forgetTimer(timer);
        if (run !== typewriterRun) return;
        done();
      }, ms));
    }

    function typeText(el, text, speed, done, cursor) {
      var i = 0;
      if (!cursor) {
        cursor = document.createElement("span");
        cursor.className = "typed-cursor";
        cursor.textContent = "\u2588";
        el.insertAdjacentElement("afterend", cursor);
      }
      el.style.display = "";

      function step() {
        if (run !== typewriterRun || !document.body.contains(el)) return;
        el.textContent = text.slice(0, i);
        if (i >= text.length) {
          if (done) done(cursor);
          return;
        }
        i++;
        var timer = rememberTimer(setTimeout(function () {
          forgetTimer(timer);
          step();
        }, speed));
      }

      step();
    }

    function showOutputLine(el, text, hold, done, showCursor) {
      if (run !== typewriterRun || !document.body.contains(el)) return;
      el.textContent = text;
      el.style.display = "";
      if (showCursor !== false) {
        var cursor = document.createElement("span");
        cursor.className = "typed-cursor";
        cursor.textContent = "\u2588";
        el.insertAdjacentElement("afterend", cursor);
      }
      if (done) {
        delay(hold, function () {
          if (showCursor !== false) cursor.remove();
          done();
        });
      }
    }

    function showFinalPrompt() {
      if (run !== typewriterRun || !document.body.contains(finalPrompt)) return;
      finalPrompt.style.display = "";
      var finalCursor = document.createElement("span");
      finalCursor.className = "typed-cursor";
      finalCursor.textContent = "\u2588";
      finalCommand.insertAdjacentElement("afterend", finalCursor);
      delay(120, function () {
        typeText(finalCommand, "welcome to my notes", 20, function (doneCursor) {
          delay(100, function () {
            doneCursor.remove();
            printHelp();
            setupTerminalInput();
          });
        }, finalCursor);
      });
    }

    // ---- 交互：ls 列出分类，输入编号跳转 ----
    // path 使用相对站点根的绝对路径（以 / 开头），避免在 /study/ 等
    // 深层页面解析成叠加路径（如 /study/study/）导致 404。
    var HOME_SECTIONS = [
      { id: 1, name: "study", label: "学习", path: "/study/" },
      { id: 2, name: "tools", label: "工具", path: "/tools/" },
      { id: 3, name: "diaries", label: "随笔", path: "/diaries/" }
    ];

    var terminalScreen = scope.querySelector(".home-terminal__screen");
    var currentCmd = null;
    var hiddenInput = null;

    function addOutput(text) {
      if (!terminalScreen) return;
      var line = document.createElement("div");
      line.className = "home-terminal__line home-terminal__line--output";
      var span = document.createElement("span");
      span.className = "typed-text";
      span.textContent = text;
      line.appendChild(span);
      terminalScreen.appendChild(line);
    }

    function removeCurrentCursor() {
      if (currentCmd && currentCmd.nextSibling && currentCmd.nextSibling.classList &&
          currentCmd.nextSibling.classList.contains("typed-cursor")) {
        currentCmd.nextSibling.remove();
      }
    }

    function printHelp() {
      addOutput("输入编号进入对应页面 (移动端可点击)");
      addSectionLinks();
      spawnPrompt();
    }

    function addSectionLinks() {
      if (!terminalScreen) return;
      var line = document.createElement("div");
      line.className = "home-terminal__line home-terminal__line--output";
      var keys = document.createElement("span");
      keys.className = "home-terminal-keys";
      keys.setAttribute("role", "group");
      keys.setAttribute("aria-label", "快速跳转数字链接");
      for (var i = 0; i < HOME_SECTIONS.length; i++) {
        var s = HOME_SECTIONS[i];
        var link = document.createElement("a");
        link.href = s.path;
        link.className = "home-terminal-link";
        link.setAttribute("data-goto", String(s.id));
        link.textContent = s.id + ":" + s.label;
        keys.appendChild(link);
      }
      line.appendChild(keys);
      terminalScreen.appendChild(line);
    }

    function spawnPrompt(dir) {
      removeCurrentCursor();
      var line = document.createElement("div");
      line.className = "home-terminal__line home-terminal__line--prompt";
      var host = document.createElement("span");
      host.className = "typed-text--host";
      host.textContent = "jiucheng@ZJU";
      var sep = document.createElement("span");
      sep.className = "typed-text--separator";
      sep.textContent = ":";
      var prompt = document.createElement("span");
      prompt.className = "typed-text--prompt";
      prompt.textContent = dir ? "~/site/" + dir + "$ " : "~/site$ ";
      var cmd = document.createElement("span");
      cmd.className = "typed-text typed-text--command";
      line.appendChild(host);
      line.appendChild(sep);
      line.appendChild(prompt);
      line.appendChild(cmd);
      if (terminalScreen) terminalScreen.appendChild(line);
      var cursor = document.createElement("span");
      cursor.className = "typed-cursor";
      cursor.textContent = "\u2588";
      cmd.insertAdjacentElement("afterend", cursor);
      currentCmd = cmd;
      return cmd;
    }

    function gotoSection(sec) {
      if (currentCmd && document.body.contains(currentCmd)) {
        currentCmd.textContent = "cd ~/site/" + sec.name;
      }
      removeCurrentCursor();
      spawnPrompt(sec.name);
      delay(900, function () {
        if (run !== typewriterRun) return;
        window.location.href = sec.path;
      });
    }

    function executeCommand(raw) {
      var text = raw.trim();
      if (text === "") {
        spawnPrompt();
        return;
      }
      if (text === "ls") {
        addSectionLinks();
        spawnPrompt();
        return;
      }
      if (text === "help" || text === "?") {
        printHelp();
        return;
      }
      var num = parseInt(text, 10);
      if (num >= 1 && num <= HOME_SECTIONS.length) {
        gotoSection(HOME_SECTIONS[num - 1]);
        return;
      }
      var cdMatch = text.match(/^cd(?:\s+(.+))?$/);
      if (cdMatch) {
        var target = cdMatch[1] ? cdMatch[1].trim() : "";
        if (!target) {
          addOutput("当前目录 ~/site");
          removeCurrentCursor();
          spawnPrompt();
          return;
        }
        // 归一化：支持 /study、~/site/study、study/ 等写法
        var norm = target
          .replace(/^~\/site\/?/, "")
          .replace(/^~\/?/, "")
          .replace(/^\//, "")
          .replace(/\/+$/, "");
        var matched = null;
        for (var i = 0; i < HOME_SECTIONS.length; i++) {
          var s = HOME_SECTIONS[i];
          if (s.name === norm || String(s.id) === norm) {
            matched = s;
            break;
          }
        }
        if (matched) {
          gotoSection(matched);
        } else {
          addOutput("cd: no such directory: " + target);
          addOutput(HOME_SECTIONS.map(function (s) { return s.id + ":" + s.name; }).join("  "));
          spawnPrompt();
        }
        return;
      }
      addOutput("command not found: " + text);
      addOutput("try \"ls\"");
      spawnPrompt();
    }

    function focusTerminal() {
      if (!hiddenInput || !document.body.contains(hiddenInput)) return;
      // 触屏设备（手机/平板）不聚焦，避免弹出系统键盘
      if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) return;
      hiddenInput.focus();
    }

    function setupTerminalInput() {
      if (!terminalScreen || hiddenInput) return;
      hiddenInput = document.createElement("input");
      hiddenInput.className = "terminal-hidden-input";
      hiddenInput.setAttribute("autocomplete", "off");
      hiddenInput.setAttribute("autocapitalize", "off");
      hiddenInput.setAttribute("autocorrect", "off");
      hiddenInput.setAttribute("spellcheck", "false");
      hiddenInput.setAttribute("aria-label", "terminal input");
      terminalScreen.appendChild(hiddenInput);

      terminalScreen.addEventListener("click", focusTerminal);

      hiddenInput.addEventListener("keydown", function (e) {
        if (!currentCmd || !document.body.contains(currentCmd)) return;
        if (e.key === "Enter") {
          e.preventDefault();
          var raw = currentCmd.textContent;
          executeCommand(raw);
          return;
        }
        if (e.key === "Backspace") {
          e.preventDefault();
          currentCmd.textContent = currentCmd.textContent.slice(0, -1);
          return;
        }
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          currentCmd.textContent += e.key;
        }
      });

      requestAnimationFrame(focusTerminal);
    }

    function bindTerminalKeys() {
      if (document.__keysBound) return;
      document.__keysBound = true;
      document.addEventListener("click", function (e) {
        var link = e.target && e.target.closest ? e.target.closest(".home-terminal-link") : null;
        if (!link) return;
        e.preventDefault();
        var num = parseInt(link.getAttribute("data-goto"), 10);
        if (currentCmd && document.body.contains(currentCmd)) {
          currentCmd.textContent = String(num);
        }
        executeCommand(String(num));
        focusTerminal();
      });
    }

    function start() {
      if (run !== typewriterRun || !document.body.contains(line1Host)) return;

      line1Host.textContent = "jiucheng@ZJU";
      line1Separator.textContent = ":";
      line1Prompt.textContent = "~/site$ ";
      line1Host.style.display = "";
      line1Separator.style.display = "";
      line1Prompt.style.display = "";

      var line1Cursor = document.createElement("span");
      line1Cursor.className = "typed-cursor";
      line1Cursor.textContent = "\u2588";
      line1Command.insertAdjacentElement("afterend", line1Cursor);

      delay(100, function () {
        typeText(line1Command, "whoami", 62, function (cursor1) {
          delay(180, function () {
            cursor1.remove();
            showOutputLine(el2, "彭禹铭（久诚 / eta）· 浙江大学", 10, function () {
              showOutputLine(el3, "flag{ju5t_k33p_l34rn1ng}", 10, function () {}, false);
              delay(10, showFinalPrompt);
            }, false);
          });
        }, line1Cursor);
      });
    }

    bindTerminalKeys();
    start();
  }

  window.site.onPageReady(startHomeTypewriter);
})();
