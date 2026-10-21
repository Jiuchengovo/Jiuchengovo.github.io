(function () {
  "use strict";

  window.site = window.site || {};
  var htmlEl = window.site.htmlEl;
  var activePdfViewers = [];
  var PDF_LOADING_NOTE = "可能较慢，必要时可开启代理";
  var PDF_SCRIPT_BASE = "https://unpkg.com/pdfjs-dist@4.0.379/build/";
  var PDF_RENDER_SCALE = 3;
  var pdfjsLib = null;
  var pdfjsLoading = false;
  var pdfjsQueue = [];

  var SVG_EXTERNAL =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
    '<path d="M15 3h6v6"/><path d="M10 14 21 3"/>' +
    '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>';

  var SVG_DOWNLOAD =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>' +
    '<polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function formatPercent(received, total) {
    if (!total) return "";
    return Math.min(100, (received / total) * 100).toFixed(1) + "%";
  }

  function loadingText() {
    return "下载中 (" + PDF_LOADING_NOTE + ")";
  }

  function prefersCanvasPdfViewer() {
    var ua = navigator.userAgent || "";
    var iOSDevice = /iPad|iPhone|iPod/.test(ua);
    var iPadDesktopMode = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
    return iOSDevice || iPadDesktopMode;
  }

  function getPDFJS(done) {
    if (pdfjsLib) {
      done(null, pdfjsLib);
      return;
    }

    pdfjsQueue.push(done);
    if (pdfjsLoading) return;
    pdfjsLoading = true;

    import(PDF_SCRIPT_BASE + "pdf.min.mjs")
      .then(function (mod) {
        pdfjsLib = mod;
        pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_SCRIPT_BASE + "pdf.worker.min.mjs";
        flushPDFJSQueue(null, pdfjsLib);
      })
      .catch(function (err) {
        flushPDFJSQueue(err);
      });
  }

  function flushPDFJSQueue(err, lib) {
    var queue = pdfjsQueue.slice();
    pdfjsQueue = [];
    pdfjsLoading = false;
    for (var i = 0; i < queue.length; i++) queue[i](err, lib);
  }

  function buildIconLink(className, title, href, svg) {
    var link = htmlEl("a", {
      class: className,
      title: title,
      href: href
    });
    link.innerHTML = svg;
    return link;
  }

  function splitHash(src) {
    var hashIndex = src.indexOf("#");
    if (hashIndex < 0) return { fetchSrc: src, hash: "" };
    return {
      fetchSrc: src.slice(0, hashIndex),
      hash: src.slice(hashIndex)
    };
  }

  function buildPdfViewer(iframe) {
    var src = iframe.getAttribute("src");
    if (!src || !/\.pdf(\?.*)?(#.*)?$/i.test(src)) return null;

    var width = iframe.getAttribute("width") || "100%";
    var height = iframe.getAttribute("height") || "600px";
    var root = htmlEl("div", { class: "pdf-viewer" });
    root.style.width = width;
    root.style.maxWidth = "100%";

    var toolbar = htmlEl("div", { class: "pdf-viewer-toolbar" });
    var heading = htmlEl("span", { class: "pdf-viewer-heading" });
    var dot = htmlEl("span", { class: "pdf-loader-dot", "aria-hidden": "true" });
    var title = htmlEl("span", { class: "pdf-viewer-title" }, "PDF");
    var status = htmlEl("span", { class: "pdf-viewer-status" }, "准备加载");
    var open = buildIconLink("pdf-viewer-action", "在新标签页打开", src, SVG_EXTERNAL);
    open.setAttribute("target", "_blank");
    open.setAttribute("rel", "noopener");
    var download = buildIconLink("pdf-viewer-action pdf-viewer-download", "下载", src, SVG_DOWNLOAD);
    download.setAttribute("download", "");
    heading.append(dot, title, status);
    toolbar.append(heading, open, download);
    root.appendChild(toolbar);

    var mobileHint = htmlEl(
      "div",
      { class: "pdf-viewer-mobile-hint", hidden: "" },
      "iPadOS/iOS 可以在新标签页打开以获得更好阅读体验"
    );
    if (prefersCanvasPdfViewer()) mobileHint.hidden = false;
    root.appendChild(mobileHint);

    var frameWrap = htmlEl("div", { class: "pdf-viewer-native-wrap" });
    var h = parseInt(height, 10);
    if (isNaN(h) || h <= 0) h = 600;
    h = Math.min(h, Math.round(window.innerHeight * 0.82));
    frameWrap.style.height = h + "px";

    var nativeFrame = htmlEl("iframe", {
      class: "pdf-viewer-native",
      title: iframe.getAttribute("title") || "PDF preview",
      loading: "lazy"
    });
    nativeFrame.setAttribute("allowfullscreen", "");
    frameWrap.appendChild(nativeFrame);

    var canvasWrap = htmlEl("div", { class: "pdf-viewer-canvases", hidden: "" });
    frameWrap.appendChild(canvasWrap);

    var externalPrompt = htmlEl("div", { class: "pdf-viewer-external", hidden: "" });
    externalPrompt.innerHTML =
      '<div class="pdf-viewer-external__title">Safari 内嵌预览受限</div>' +
      '<div class="pdf-viewer-external__text">请在新标签页打开完整 PDF。</div>' +
      '<a class="pdf-viewer-external__button" target="_blank" rel="noopener" href="' + src + '">' +
      SVG_EXTERNAL +
      "<span>新标签页打开</span></a>";
    frameWrap.appendChild(externalPrompt);
    root.appendChild(frameWrap);

    var overlay = htmlEl("div", { class: "pdf-loader-overlay" });
    overlay.innerHTML =
      '<div class="pdf-loader-percent">0.0%</div>' +
      '<div class="pdf-loader-bar-track"><div class="pdf-loader-bar-fill"></div></div>' +
      '<div class="pdf-loader-detail"></div>';
    root.appendChild(overlay);

    var errorBox = htmlEl("div", { class: "pdf-viewer-error" });
    errorBox.style.display = "none";
    root.appendChild(errorBox);

    root._src = src;
    root._fetchSrc = splitHash(src).fetchSrc;
    root._hash = splitHash(src).hash;
    root._status = status;
    root._dot = dot;
    root._nativeFrame = nativeFrame;
    root._canvasWrap = canvasWrap;
    root._mobileHint = mobileHint;
    root._externalPrompt = externalPrompt;
    root._overlay = overlay;
    root._percent = overlay.querySelector(".pdf-loader-percent");
    root._barFill = overlay.querySelector(".pdf-loader-bar-fill");
    root._detail = overlay.querySelector(".pdf-loader-detail");
    root._text = status;
    root._errorBox = errorBox;
    root._loaded = false;
    root._objectUrl = "";
    return root;
  }

  function hideOverlay(viewer) {
    viewer._overlay.style.opacity = "0";
    setTimeout(function () {
      viewer._overlay.style.display = "none";
    }, 400);
  }

  function showNativePdf(viewer, blob) {
    if (viewer._objectUrl) URL.revokeObjectURL(viewer._objectUrl);
    viewer._objectUrl = URL.createObjectURL(blob);
    viewer._nativeFrame.hidden = false;
    viewer._canvasWrap.hidden = true;
    viewer._nativeFrame.src = viewer._objectUrl + viewer._hash;
    viewer._status.textContent = "已加载";
    viewer._dot.classList.add("pdf-loader-dot--done");
    hideOverlay(viewer);
    activePdfViewers.push(viewer);
  }

  function showCanvasPdf(viewer, blob) {
    viewer._nativeFrame.removeAttribute("src");
    viewer._nativeFrame.hidden = true;
    viewer._canvasWrap.hidden = false;
    viewer._mobileHint.hidden = false;
    while (viewer._canvasWrap.firstChild) viewer._canvasWrap.removeChild(viewer._canvasWrap.firstChild);
    viewer._text.textContent = "正在渲染 PDF...";

    blob.arrayBuffer()
      .then(function (buffer) {
        getPDFJS(function (err, lib) {
          if (err) {
            console.warn("[site] PDF.js failed to load:", viewer._src, err);
            showExternalPdfPrompt(viewer);
            return;
          }

          renderPdfPages(viewer, lib, buffer).catch(function (renderErr) {
            console.warn("[site] PDF.js render failed:", viewer._src, renderErr);
            showExternalPdfPrompt(viewer);
          });
        });
      })
      .catch(function (err) {
        console.warn("[site] PDF blob read failed:", viewer._src, err);
        showExternalPdfPrompt(viewer);
      });
  }

  function renderPdfPages(viewer, lib, buffer) {
    return lib.getDocument({ data: new Uint8Array(buffer) }).promise.then(function (pdf) {
      var pageNumber = 1;

      function renderNextPage() {
        if (pageNumber > pdf.numPages) {
          viewer._status.textContent = "已加载";
          viewer._dot.classList.add("pdf-loader-dot--done");
          hideOverlay(viewer);
          return Promise.resolve();
        }

        return pdf.getPage(pageNumber).then(function (page) {
          var viewport = page.getViewport({ scale: PDF_RENDER_SCALE });
          var pageWrap = htmlEl("div", { class: "pdf-viewer-page-wrap" });
          var canvas = htmlEl("canvas", { class: "pdf-viewer-canvas" });
          var context = canvas.getContext("2d");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.aspectRatio = viewport.width + " / " + viewport.height;
          pageWrap.appendChild(canvas);
          viewer._canvasWrap.appendChild(pageWrap);
          viewer._status.textContent = "渲染第 " + pageNumber + " / " + pdf.numPages + " 页";

          return page.render({
            canvasContext: context,
            viewport: viewport
          }).promise.then(function () {
            pageNumber += 1;
            return renderNextPage();
          });
        });
      }

      return renderNextPage();
    });
  }

  function showDownloadedPdf(viewer, blob) {
    if (prefersCanvasPdfViewer()) {
      showCanvasPdf(viewer, blob);
      return;
    }

    showNativePdf(viewer, blob);
  }

  function showExternalPdfPrompt(viewer) {
    viewer._nativeFrame.removeAttribute("src");
    viewer._nativeFrame.hidden = true;
    viewer._canvasWrap.hidden = true;
    viewer._mobileHint.hidden = prefersCanvasPdfViewer() ? false : true;
    viewer._externalPrompt.hidden = false;
    viewer._status.textContent = "请在新标签页打开";
    viewer._dot.classList.add("pdf-loader-dot--done");
    hideOverlay(viewer);
  }

  function fallbackToBrowser(viewer, message) {
    if (prefersCanvasPdfViewer()) {
      viewer._text.textContent = message;
      showExternalPdfPrompt(viewer);
      return;
    }

    viewer._nativeFrame.src = viewer._src;
    viewer._status.textContent = "浏览器加载";
    viewer._text.textContent = message;
    viewer._dot.classList.add("pdf-loader-dot--done");
    viewer._percent.textContent = "100.0%";
    viewer._detail.textContent = "";
    viewer._barFill.style.width = "100%";
    setTimeout(function () {
      hideOverlay(viewer);
    }, 700);
  }

  function loadPdf(viewer) {
    if (viewer._loaded) return;
    viewer._loaded = true;
    viewer._text.textContent = loadingText();

    if (!window.fetch) {
      fallbackToBrowser(viewer, "当前浏览器不支持读取进度，改用内置 PDF 查看器");
      return;
    }

    fetch(viewer._fetchSrc)
      .then(function (resp) {
        if (!resp.ok) throw new Error("HTTP " + resp.status);
        if (!resp.body || !resp.body.getReader) {
          return resp.blob().then(function (blob) {
            viewer._barFill.style.width = "100%";
            viewer._percent.textContent = "100.0%";
            viewer._detail.textContent = formatSize(blob.size);
            showDownloadedPdf(viewer, blob);
          });
        }

        var total = resp.headers.get("Content-Length");
        total = total ? parseInt(total, 10) : 0;
        var reader = resp.body.getReader();
        var chunks = [];
        var received = 0;
        if (total > 0) {
          viewer._percent.textContent = "0.0%";
          viewer._detail.textContent = "0 / " + formatSize(total);
        } else {
          viewer._percent.textContent = "";
        }

        function pump() {
          return reader.read().then(function (r) {
            if (r.done) {
              var blob = new Blob(chunks, { type: resp.headers.get("Content-Type") || "application/pdf" });
              viewer._text.textContent = "正在打开 PDF...";
              viewer._barFill.style.width = "100%";
              viewer._percent.textContent = total > 0 ? "100.0%" : "";
              viewer._detail.textContent = total > 0 ? formatSize(total) : formatSize(received);
              showDownloadedPdf(viewer, blob);
              return;
            }

            chunks.push(r.value);
            received += r.value.length;
            if (total > 0) {
              var pct = formatPercent(received, total);
              viewer._barFill.style.width = pct;
              viewer._percent.textContent = pct;
              viewer._detail.textContent = formatSize(received) + " / " + formatSize(total);
              viewer._text.textContent = loadingText();
            } else {
              viewer._detail.textContent = formatSize(received);
            }
            return pump();
          });
        }
        return pump();
      })
      .catch(function (err) {
        console.warn("[site] PDF progress loader failed, falling back:", viewer._src, err);
        fallbackToBrowser(viewer, "无法读取下载进度，改用内置 PDF 查看器");
      });
  }

  function cleanupPdfViewers() {
    for (var i = 0; i < activePdfViewers.length; i++) {
      var viewer = activePdfViewers[i];
      if (viewer._objectUrl) URL.revokeObjectURL(viewer._objectUrl);
      viewer._objectUrl = "";
    }
    activePdfViewers = [];
  }

  function scanAndLoadPdfs(root) {
    cleanupPdfViewers();
    var scope = root || document;
    var iframes = scope.querySelectorAll("iframe[src*='.pdf']");
    for (var i = 0; i < iframes.length; i++) {
      var iframe = iframes[i];
      if (iframe.parentNode && iframe.parentNode.classList.contains("pdf-viewer")) continue;
      var viewer = buildPdfViewer(iframe);
      if (!viewer) continue;
      iframe.parentNode.replaceChild(viewer, iframe);
      loadPdf(viewer);
    }
  }

  window.site.onPageReady(scanAndLoadPdfs);
})();
