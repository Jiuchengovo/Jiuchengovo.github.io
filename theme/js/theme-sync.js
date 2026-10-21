/**
 * theme-sync.js
 *
 * 站点明暗主题的「单一真相来源」。
 *
 * 背景：zensical/Material 主题切换由 bundle 内部的 qp()/ic() 驱动，最终把
 * { media, scheme } 写进 localStorage 的 "__palette" 键，并在 <body> 上设置
 * data-md-color-scheme。overrides/main.html 还在首帧前提前写入该属性以避免闪烁。
 *
 * 但 giscus 用的是 data-theme="preferred_color_scheme"，只读一次系统偏好，
 * 切换站点主题后无法收到通知——这就是评论区明暗不同步、刷新也没用的根因。
 *
 * 本脚本对外暴露一个稳定的同步 API（见 window.site.theme），供 site.js、
 * comments.html(giscus) 等订阅「当前主题」与「主题变更」。判定逻辑与
 * overrides/main.html 完全一致：(prefers-color-scheme) 时跟随系统，否则用已保存的 scheme。
 */
(function () {
  "use strict";

  var STORAGE_KEY = "__palette";

  function isDarkScheme(scheme) {
    return scheme === "slate" || scheme === "slate-gray" || scheme === "dark";
  }

  /** 读取材料主题写入 localStorage 的 palette。 */
  function readSavedPalette() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  /** 当前生效的 scheme（'default' 亮 / 'slate' 暗），与 main.html 一致。 */
  function resolveScheme() {
    // 1) 优先用 <body>/<html> 上实际的 data-md-color-scheme（bundle 切换后即写入）
    var el = document.body || document.documentElement;
    var attr = el && el.getAttribute("data-md-color-scheme");
    if (attr === "default" || attr === "slate") return attr;

    // 2) 回退到 localStorage 中保存的 palette
    var saved = readSavedPalette();
    if (saved && saved.color && saved.color.media) {
      if (saved.color.media === "(prefers-color-scheme)") {
        return matchMedia("(prefers-color-scheme: dark)").matches ? "slate" : "default";
      }
      if (saved.color.scheme === "default" || saved.color.scheme === "slate") {
        return saved.color.scheme;
      }
    }

    // 3) 最终回退到系统偏好
    return matchMedia("(prefers-color-scheme: dark)").matches ? "slate" : "default";
  }

  function currentMode() {
    return isDarkScheme(resolveScheme()) ? "dark" : "light";
  }

  var listeners = [];
  var lastMode = currentMode();

  function notify() {
    var mode = currentMode();
    if (mode === lastMode) return;
    lastMode = mode;
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](mode); } catch (e) {}
    }
  }

  // 监听 <body> 上 data-md-color-scheme 的变化（bundle 切换主题时写入）。
  // main.html 已保证 <body> 存在时挂上观察者；这里兜底再挂一次。
  function observe() {
    var target = document.body || document.documentElement;
    if (!target) {
      if (typeof MutationObserver !== "undefined") {
        new MutationObserver(function (_, obs) {
          if (document.body) { observe(); obs.disconnect(); }
        }).observe(document.documentElement, { childList: true });
      }
      return;
    }
    if (typeof MutationObserver === "undefined") return;
    new MutationObserver(notify).observe(target, {
      attributes: true,
      attributeFilter: ["data-md-color-scheme"],
    });
  }

  // 系统偏好变化时（仅当站点处于"跟随系统"模式）也要同步。
  try {
    var mq = matchMedia("(prefers-color-scheme: dark)");
    var onSys = function () {
      var saved = readSavedPalette();
      if (!saved || !saved.color || saved.color.media === "(prefers-color-scheme)") notify();
    };
    if (mq.addEventListener) mq.addEventListener("change", onSys);
    else if (mq.addListener) mq.addListener(onSys);
  } catch (e) {}

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", observe);
  } else {
    observe();
  }

  window.site = window.site || {};
  window.site.theme = {
    /** 'light' | 'dark' */
    get mode() { return currentMode(); },
    get scheme() { return resolveScheme(); },
    get isDark() { return isDarkScheme(resolveScheme()); },
    /** 订阅主题变更，回调立即用当前 mode 调用一次。返回取消订阅函数。 */
    subscribe: function (fn) {
      listeners.push(fn);
      try { fn(currentMode()); } catch (e) {}
      return function () {
        var i = listeners.indexOf(fn);
        if (i >= 0) listeners.splice(i, 1);
      };
    },
  };
})();
