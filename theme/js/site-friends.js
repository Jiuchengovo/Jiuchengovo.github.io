(function () {
  "use strict";

  // 友链卡片写在 index.md 的 .home-link-grid 里，只需提供：链接(href)、外显名字(<strong>)、
  // @ 名字(data-id)，以及可选的描述(data-description)。头像、占位首字母等细节都由这里补齐。
  window.site = window.site || {};
  var htmlEl = window.site.htmlEl;

  // 通过 GitHub 用户名 (@xxx) 定位头像，走到 avatars.githubusercontent.com 头像 CDN。
  // （注意不能直接用 github.com/<user>.png，该域名在部分网络环境不可达。）
  // 用 size=160 控制清晰度与体积（比 128 更大、更清晰，相比原图 36KB 仍很小）。
  // 不携带 v=4 缓存版本号——只是缓存管理参数，去掉也能正常加载。
  function githubAvatarUrl(github) {
    return github ? "https://avatars.githubusercontent.com/" + encodeURIComponent(github) + "?size=160" : "";
  }

  // 由名字/用户名生成头像占位首字母。
  function friendInitials(name, github) {
    var source = (name || github || "?").trim();
    if (!source) return "?";
    if (/^[\u4e00-\u9fa5]/.test(source)) return source.slice(0, 1);
    var parts = source.split(/\s+/);
    if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
    return source.slice(0, 2);
  }

  // 构建头像：首字母占位背景 + GitHub 实时头像。
  function buildAvatar(card, name, github) {
    var avatar = htmlEl("span", { class: "home-friend__avatar" }, friendInitials(name, github));
    var src = githubAvatarUrl(github);
    if (src) {
      var img = htmlEl("img", { src: src, alt: "", width: 96, height: 96 });
      // 头像很小，立即加载即可；加载失败时移除图片，保留首字母占位。
      img.onerror = function () { this.remove(); };
      avatar.appendChild(img);
    }
    card.insertBefore(avatar, card.firstChild);
  }

  function buildMeta(card, description) {
    if (!description) return;
    var meta = htmlEl("span", { class: "home-friend__meta" }, description);
    card.appendChild(meta);
  }

  // 根据 data-id 自动生成 @xxx 句柄，追加到名字(<strong>)之后。
  function buildHandle(card, github) {
    if (!github) return;
    var handle = htmlEl("span", { class: "home-friend__handle" }, "@" + github);
    var strong = card.querySelector("strong");
    if (strong && strong.nextSibling) {
      card.insertBefore(handle, strong.nextSibling);
    } else {
      card.appendChild(handle);
    }
  }

  function initFriends(root) {
    var grid = (root || document).querySelector(".home-link-grid");
    if (!grid || grid.dataset.friendsReady === "true") return;

    var cards = grid.querySelectorAll(".home-friend");
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      var github = card.getAttribute("data-id");
      var strong = card.querySelector("strong");
      var name = (strong ? strong.textContent : "") || github || "";
      // 新窗口打开 + noopener 这类细节放到后台统一处理，index 里不必写。
      card.setAttribute("target", "_blank");
      card.setAttribute("rel", "noopener");
      buildAvatar(card, name, github);
      buildHandle(card, github);
      buildMeta(card, card.getAttribute("data-description"));
    }
    grid.dataset.friendsReady = "true";
  }

  window.site.onPageReady(initFriends);
})();
