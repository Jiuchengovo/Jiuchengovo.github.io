(function () {
  "use strict";

  window.site = window.site || {};
  var htmlEl = window.site.htmlEl;

  var CONTRIBUTIONS_URL = "theme/data/contributions.json";
  var WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  var MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function screenReader(text) {
    return htmlEl("span", { class: "sr-only" }, text);
  }

  function plural(count, one, many) {
    return count === 1 ? one : many;
  }

  function prettyDate(iso) {
    var d = new Date(iso + "T00:00:00Z");
    var day = d.getUTCDate();
    var suffix = "th";
    if (day % 10 === 1 && day !== 11) suffix = "st";
    if (day % 10 === 2 && day !== 12) suffix = "nd";
    if (day % 10 === 3 && day !== 13) suffix = "rd";
    return MONTHS[d.getUTCMonth()] + " " + day + suffix;
  }

  function firstRealDay(week) {
    for (var i = 0; i < week.length; i++) {
      if (week[i]) return week[i];
    }
    return null;
  }

  function toWeeks(days) {
    if (!days.length) return [];
    var first = new Date(days[0].date + "T00:00:00Z");
    var weeks = [];
    var current = [];

    for (var pad = 0; pad < first.getUTCDay(); pad++) current.push(null);
    for (var i = 0; i < days.length; i++) {
      current.push(days[i]);
      if (current.length === 7) {
        weeks.push(current);
        current = [];
      }
    }
    if (current.length) {
      while (current.length < 7) current.push(null);
      weeks.push(current);
    }
    return weeks;
  }

  function monthCells(weeks) {
    var cells = [];
    var i = 0;

    while (i < weeks.length) {
      var day = firstRealDay(weeks[i]);
      if (!day) {
        cells.push({ month: "", colspan: 1 });
        i++;
        continue;
      }

      var month = new Date(day.date + "T00:00:00Z").getUTCMonth();
      var span = 1;
      while (i + span < weeks.length) {
        var next = firstRealDay(weeks[i + span]);
        if (!next || new Date(next.date + "T00:00:00Z").getUTCMonth() !== month) break;
        span++;
      }
      cells.push({ month: MONTH_SHORT[month], full: MONTHS[month], colspan: span });
      i += span;
    }

    if (cells.length > 1 && cells[0].month && cells[cells.length - 1].month === cells[0].month) {
      cells[cells.length - 1].month = "";
      cells[cells.length - 1].full = "";
    }
    return cells;
  }

  function renderGithubHeader(root, total) {
    var header = htmlEl("div", { class: "ghc-header" });
    header.appendChild(htmlEl("h2", { class: "ghc-title" },
      total + " " + plural(total, "contribution", "contributions") + " in the last year"));
    root.appendChild(header);
  }

  function renderGithubCalendar(root, data) {
    var weeks = toWeeks(data.contributions || []);
    var columnCount = weeks.length + 1;
    var tableWidth = 28 + weeks.length * 10 + (columnCount + 1) * 3;
    var table = htmlEl("table", {
      class: "ContributionCalendar-grid",
      role: "grid",
      "aria-readonly": "true",
      "aria-label": "Contribution Graph"
    });
    table.style.width = tableWidth + "px";
    table.appendChild(htmlEl("caption", { class: "sr-only" }, "Contribution Graph"));

    var colgroup = htmlEl("colgroup");
    colgroup.appendChild(htmlEl("col", { class: "ghc-weekday-col" }));
    for (var col = 0; col < weeks.length; col++) {
      colgroup.appendChild(htmlEl("col", { class: "ghc-week-col" }));
    }
    table.appendChild(colgroup);

    var thead = htmlEl("thead");
    var headRow = htmlEl("tr");
    var corner = htmlEl("td", { class: "ContributionCalendar-label ghc-corner" });
    corner.appendChild(screenReader("Day of Week"));
    headRow.appendChild(corner);

    monthCells(weeks).forEach(function (cell) {
      var td = htmlEl("td", {
        class: "ContributionCalendar-label",
        colspan: cell.colspan
      });
      if (cell.month) {
        td.appendChild(screenReader(cell.full));
        td.appendChild(htmlEl("span", { "aria-hidden": "true" }, cell.month));
      }
      headRow.appendChild(td);
    });

    thead.appendChild(headRow);
    table.appendChild(thead);

    var tbody = htmlEl("tbody");
    for (var dow = 0; dow < 7; dow++) {
      var row = htmlEl("tr");
      var label = htmlEl("td", { class: "ContributionCalendar-label ghc-day-label" });
      label.appendChild(screenReader(WEEKDAYS[dow]));
      if (dow % 2 === 1) {
        label.appendChild(htmlEl("span", { "aria-hidden": "true" }, WEEKDAY_SHORT[dow]));
      }
      row.appendChild(label);

      for (var w = 0; w < weeks.length; w++) {
        var day = weeks[w][dow];
        if (!day) {
          row.appendChild(htmlEl("td", { class: "ghc-empty-day" }));
          continue;
        }

        var count = day.count || 0;
        var cell = htmlEl("td", {
          tabindex: "0",
          "aria-selected": "false",
          "aria-label": (count ? count + " " + plural(count, "contribution", "contributions") : "No contributions") +
            " on " + prettyDate(day.date) + ".",
          "data-date": day.date,
          "data-level": String(day.level || 0),
          role: "gridcell",
          class: "ContributionCalendar-day"
        });
        cell.title = cell.getAttribute("aria-label");
        row.appendChild(cell);
      }
      tbody.appendChild(row);
    }

    table.appendChild(tbody);
    var scroller = htmlEl("div", { class: "ghc-calendar-scroller" });
    scroller.appendChild(table);
    root.appendChild(scroller);
  }

  function renderGithubLegend(root) {
    var legend = htmlEl("div", { class: "ghc-footer" });
    legend.appendChild(htmlEl("a", {
      class: "ghc-help",
      href: "https://docs.github.com/articles/why-are-my-contributions-not-showing-up-on-my-profile"
    }, "Learn how we count contributions"));

    var scale = htmlEl("div", { class: "ghc-legend", "aria-hidden": "true" });
    scale.appendChild(htmlEl("span", null, "Less"));
    for (var i = 0; i <= 4; i++) {
      scale.appendChild(htmlEl("span", {
        class: "ContributionCalendar-day ghc-legend-day",
        "data-level": String(i)
      }));
    }
    scale.appendChild(htmlEl("span", null, "More"));
    legend.appendChild(scale);
    root.appendChild(legend);
  }

  function renderGithubOverview(root, data) {
    var overview = htmlEl("div", { class: "ghc-overview" });
    overview.appendChild(htmlEl("h3", { class: "ghc-overview-title" }, "Activity overview"));
    overview.appendChild(htmlEl("p", { class: "ghc-overview-text" },
      "Contributions are refreshed from GitHub during each site deployment."));
    overview.appendChild(htmlEl("p", { class: "ghc-overview-meta" },
      "Last fetched " + (data.fetchedAt || "recently") + "."));
    root.appendChild(overview);
  }

  function renderGithub(container, data) {
    var shell = htmlEl("section", { class: "ghc-shell", "aria-label": "GitHub contributions" });
    renderGithubHeader(shell, data.totalContributions || 0);
    renderGithubCalendar(shell, data);
    renderGithubLegend(shell);
    renderGithubOverview(shell, data);

    container.innerHTML = "";
    container.appendChild(shell);
    container.setAttribute("data-ghc-state", "ready");
  }

  function showGithubError(container, msg) {
    container.innerHTML = '<div class="ghc-error">GitHub contribution graph failed to load: ' + msg + "</div>";
    container.setAttribute("data-ghc-state", "error");
  }

  function initGithubCalendar(root) {
    var container = (root || document).querySelector(".github-calendar-wrap");
    if (!container) return;
    container.setAttribute("data-ghc-state", "loading");

    fetch(CONTRIBUTIONS_URL, { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        renderGithub(container, data);
      })
      .catch(function (err) {
        showGithubError(container, err.message || "read failed");
      });
  }

  window.site.onPageReady(initGithubCalendar);
})();
