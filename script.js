(function () {
  "use strict";

  /* ---------- Data ---------- */
  var US_ZONES = [
    { tz: "America/New_York", name: "Eastern", city: "New York" },
    { tz: "America/Chicago", name: "Central", city: "Chicago" },
    { tz: "America/Denver", name: "Mountain", city: "Denver" },
    { tz: "America/Phoenix", name: "Mountain, no DST", city: "Phoenix" },
    { tz: "America/Los_Angeles", name: "Pacific", city: "Los Angeles" },
    { tz: "America/Anchorage", name: "Alaska", city: "Anchorage" },
    { tz: "Pacific/Honolulu", name: "Hawaii", city: "Honolulu" },
  ];
  var COUNTRIES = [
    ["Argentina", "Buenos Aires", "America/Argentina/Buenos_Aires"],
    ["Australia", "Sydney", "Australia/Sydney"],
    ["Austria", "Vienna", "Europe/Vienna"],
    ["Bangladesh", "Dhaka", "Asia/Dhaka"],
    ["Belgium", "Brussels", "Europe/Brussels"],
    ["Brazil", "São Paulo", "America/Sao_Paulo"],
    ["Canada", "Toronto", "America/Toronto"],
    ["Chile", "Santiago", "America/Santiago"],
    ["China", "Beijing", "Asia/Shanghai"],
    ["Colombia", "Bogotá", "America/Bogota"],
    ["Czechia", "Prague", "Europe/Prague"],
    ["Denmark", "Copenhagen", "Europe/Copenhagen"],
    ["Egypt", "Cairo", "Africa/Cairo"],
    ["Ethiopia", "Addis Ababa", "Africa/Addis_Ababa"],
    ["Finland", "Helsinki", "Europe/Helsinki"],
    ["France", "Paris", "Europe/Paris"],
    ["Germany", "Berlin", "Europe/Berlin"],
    ["Ghana", "Accra", "Africa/Accra"],
    ["Greece", "Athens", "Europe/Athens"],
    ["Hong Kong", "Hong Kong", "Asia/Hong_Kong"],
    ["Hungary", "Budapest", "Europe/Budapest"],
    ["India", "New Delhi", "Asia/Kolkata"],
    ["Indonesia", "Jakarta", "Asia/Jakarta"],
    ["Iran", "Tehran", "Asia/Tehran"],
    ["Iraq", "Baghdad", "Asia/Baghdad"],
    ["Ireland", "Dublin", "Europe/Dublin"],
    ["Israel", "Jerusalem", "Asia/Jerusalem"],
    ["Italy", "Rome", "Europe/Rome"],
    ["Japan", "Tokyo", "Asia/Tokyo"],
    ["Kenya", "Nairobi", "Africa/Nairobi"],
    ["Malaysia", "Kuala Lumpur", "Asia/Kuala_Lumpur"],
    ["Mexico", "Mexico City", "America/Mexico_City"],
    ["Morocco", "Casablanca", "Africa/Casablanca"],
    ["Nepal", "Kathmandu", "Asia/Kathmandu"],
    ["Netherlands", "Amsterdam", "Europe/Amsterdam"],
    ["New Zealand", "Auckland", "Pacific/Auckland"],
    ["Nigeria", "Lagos", "Africa/Lagos"],
    ["Norway", "Oslo", "Europe/Oslo"],
    ["Pakistan", "Karachi", "Asia/Karachi"],
    ["Peru", "Lima", "America/Lima"],
    ["Philippines", "Manila", "Asia/Manila"],
    ["Poland", "Warsaw", "Europe/Warsaw"],
    ["Portugal", "Lisbon", "Europe/Lisbon"],
    ["Romania", "Bucharest", "Europe/Bucharest"],
    ["Russia", "Moscow", "Europe/Moscow"],
    ["Russia", "Vladivostok", "Asia/Vladivostok"],
    ["Saudi Arabia", "Riyadh", "Asia/Riyadh"],
    ["Singapore", "Singapore", "Asia/Singapore"],
    ["South Africa", "Johannesburg", "Africa/Johannesburg"],
    ["South Korea", "Seoul", "Asia/Seoul"],
    ["Spain", "Madrid", "Europe/Madrid"],
    ["Sweden", "Stockholm", "Europe/Stockholm"],
    ["Switzerland", "Zurich", "Europe/Zurich"],
    ["Taiwan", "Taipei", "Asia/Taipei"],
    ["Thailand", "Bangkok", "Asia/Bangkok"],
    ["Turkey", "Istanbul", "Europe/Istanbul"],
    ["Ukraine", "Kyiv", "Europe/Kiev"],
    ["United Arab Emirates", "Dubai", "Asia/Dubai"],
    ["United Kingdom", "London", "Europe/London"],
    ["Vietnam", "Ho Chi Minh City", "Asia/Ho_Chi_Minh"],
  ];

  var placeLabels = {};
  US_ZONES.forEach(function (z) {
    placeLabels[z.tz] = "USA · " + z.name + " (" + z.city + ")";
  });
  COUNTRIES.forEach(function (c) {
    placeLabels[c[2]] = c[0] + " · " + c[1];
  });

  /* ---------- State ---------- */
  var KEY = "clock-app-v1";
  var state = {
    usaTz: "America/New_York",
    showOther: true,
    otherTz: "Europe/London",
    hour12: true,
    alerts: [],
  };

  function validTz(tz) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: tz });
      return true;
    } catch (e) {
      return false;
    }
  }
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return;
      var s = JSON.parse(raw);
      if (s && typeof s === "object") {
        if (
          US_ZONES.some(function (z) {
            return z.tz === s.usaTz;
          })
        )
          state.usaTz = s.usaTz;
        if (
          COUNTRIES.some(function (c) {
            return c[2] === s.otherTz;
          }) &&
          validTz(s.otherTz)
        )
          state.otherTz = s.otherTz;
        if (typeof s.showOther === "boolean") state.showOther = s.showOther;
        if (typeof s.hour12 === "boolean") state.hour12 = s.hour12;
        if (Array.isArray(s.alerts)) {
          state.alerts = s.alerts.filter(function (a) {
            return a && /^\d\d:\d\d$/.test(a.time) && validTz(a.tz);
          });
        }
      }
    } catch (e) {
      /* storage unavailable or empty */
    }
  }
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      /* ignore */
    }
  }

  /* ---------- Time helpers ---------- */
  var numFmt = {},
    abbrFmt = {};
  var dateFmtCache = {};

  function pad(n) {
    return (n < 10 ? "0" : "") + n;
  }
  function parts(tz, d) {
    var f =
      numFmt[tz] ||
      (numFmt[tz] = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }));
    var o = {},
      ps = f.formatToParts(d);
    for (var i = 0; i < ps.length; i++)
      if (ps[i].type !== "literal") o[ps[i].type] = ps[i].value;
    return {
      year: +o.year,
      month: +o.month,
      day: +o.day,
      hour: +o.hour % 24,
      minute: +o.minute,
      second: +o.second,
    };
  }
  function dayKey(p) {
    return p.year + "-" + p.month + "-" + p.day;
  }
  function offsetMin(tz, d) {
    var p = parts(tz, d);
    var asUTC = Date.UTC(
      p.year,
      p.month - 1,
      p.day,
      p.hour,
      p.minute,
      p.second,
    );
    return Math.round((asUTC - Math.floor(d.getTime() / 1000) * 1000) / 60000);
  }
  function offsetLabel(m) {
    var sign = m < 0 ? "−" : "+",
      a = Math.abs(m),
      h = Math.floor(a / 60),
      mm = a % 60;
    return "UTC" + sign + h + (mm ? ":" + pad(mm) : "");
  }
  function zoneAbbr(tz, d) {
    var f =
      abbrFmt[tz] ||
      (abbrFmt[tz] = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        timeZoneName: "short",
      }));
    var ps = f.formatToParts(d);
    for (var i = 0; i < ps.length; i++)
      if (ps[i].type === "timeZoneName") return ps[i].value;
    return "";
  }
  function fmtDur(m) {
    var h = Math.floor(m / 60),
      mm = m % 60;
    if (!h) return mm + " min";
    return h + " h" + (mm ? " " + mm + " min" : "");
  }
  function timeStrings(p) {
    var h = p.hour,
      ampm = "";
    if (state.hour12) {
      ampm = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12;
    }
    return {
      hm: (state.hour12 ? String(h) : pad(h)) + ":" + pad(p.minute),
      sec: pad(p.second),
      ampm: ampm,
    };
  }
  function digits(str) {
    return str
      .split("")
      .map(function (c) {
        return c === ":"
          ? '<span class="colon">:</span>'
          : '<span class="d">' + c + "</span>";
      })
      .join("");
  }
  function phaseOf(h) {
    if (h >= 21 || h < 5) return ["night", "Night"];
    if (h < 8) return ["dawn", "Early morning"];
    if (h < 17) return ["day", "Daytime"];
    return ["dusk", "Evening"];
  }
  function toMin(t) {
    return +t.slice(0, 2) * 60 + +t.slice(3, 5);
  }
  function fmtAlertTime(t) {
    var h = +t.slice(0, 2),
      m = t.slice(3, 5);
    if (!state.hour12) return pad(h) + ":" + m;
    return (
      (h % 12 || 12) +
      ":" +
      m +
      "<small>" +
      (h >= 12 ? "PM" : "AM") +
      "</small>"
    );
  }
  function fmtAlertTimePlain(t) {
    var h = +t.slice(0, 2),
      m = t.slice(3, 5);
    if (!state.hour12) return pad(h) + ":" + m;
    return (h % 12 || 12) + ":" + m + " " + (h >= 12 ? "PM" : "AM");
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c];
    });
  }
  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  /* ---------- Clock cards ---------- */
  function makeCard(id) {
    var el = document.getElementById(id);
    return {
      el: el,
      hm: $(".hm", el),
      sec: $(".sec", el),
      ampm: $(".ampm", el),
      sr: $(".sr-time", el),
      date: $(".date", el),
      tag: $(".tag", el),
      phase: $(".phase", el),
      off: $(".off", el),
      marker: $(".day i", el),
      rel: $(".rel", el),
      ticks: $(".ticks", el),
    };
  }
  var usaCard = makeCard("clock-usa");
  var otherCard = makeCard("clock-other");

  function buildTicks() {
    var labels = state.hour12
      ? ["12 am", "6 am", "noon", "6 pm", "12 am"]
      : ["0", "6", "12", "18", "24"];
    var html = "";
    for (var i = 0; i < 5; i++) {
      var pos = i * 25,
        tr = i === 0 ? "0" : i === 4 ? "-100%" : "-50%";
      html +=
        '<span style="left:' +
        pos +
        "%;transform:translateX(" +
        tr +
        ')">' +
        labels[i] +
        "</span>";
    }
    usaCard.ticks.innerHTML = html;
    otherCard.ticks.innerHTML = html;
  }

  function updateCard(card, tz, now, usaParts) {
    var p = parts(tz, now),
      t = timeStrings(p);
    if (card.hm.dataset.v !== t.hm) {
      card.hm.dataset.v = t.hm;
      card.hm.innerHTML = digits(t.hm);
      card.sr.textContent =
        t.hm + (t.ampm ? " " + t.ampm : "") + " in " + placeLabels[tz];
    }
    if (card.sec.dataset.v !== t.sec) {
      card.sec.dataset.v = t.sec;
      card.sec.innerHTML = digits(t.sec);
    }
    if (card.ampm.textContent !== t.ampm) card.ampm.textContent = t.ampm;

    var dk = dayKey(p);
    if (card.date.dataset.v !== dk) {
      card.date.dataset.v = dk;
      card.date.textContent = formatDate(p);
    }

    var ph = phaseOf(p.hour);
    if (card.el.dataset.phase !== ph[0]) card.el.dataset.phase = ph[0];
    if (card.phase.textContent !== ph[1]) card.phase.textContent = ph[1];
    card.marker.style.left =
      (((p.hour * 60 + p.minute) / 1440) * 100).toFixed(2) + "%";

    var off = offsetMin(tz, now),
      abbr = zoneAbbr(tz, now);
    var offText =
      /^GMT|^UTC/.test(abbr) || !abbr
        ? offsetLabel(off)
        : abbr + " (" + offsetLabel(off) + ")";
    if (card.off.textContent !== offText) card.off.textContent = offText;

    if (usaParts) {
      var dayDiff = Math.round(
        (Date.UTC(p.year, p.month - 1, p.day) -
          Date.UTC(usaParts.p.year, usaParts.p.month - 1, usaParts.p.day)) /
          86400000,
      );
      var tag = dayDiff === 1 ? "Tomorrow" : dayDiff === -1 ? "Yesterday" : "";
      card.tag.textContent = tag;
      card.tag.hidden = !tag;
      var diff = off - usaParts.off,
        rel;
      if (diff === 0) rel = "Same time as the USA clock";
      else
        rel =
          fmtDur(Math.abs(diff)) +
          (diff > 0 ? " ahead of" : " behind") +
          " the USA clock";
      if (card.rel.textContent !== rel) card.rel.textContent = rel;
    }
    return { p: p, off: off };
  }
  function formatDate(p) {
    var f =
      dateFmtCache.f ||
      (dateFmtCache.f = new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      }));
    return f.format(new Date(Date.UTC(p.year, p.month - 1, p.day, 12)));
  }

  /* ---------- Alerts ---------- */
  var listEl = $("#al-list"),
    statusEl = $("#status"),
    statusTimer;
  var baseTitle = document.title;

  function uid() {
    return (
      "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    );
  }
  function findAlert(id) {
    for (var i = 0; i < state.alerts.length; i++)
      if (state.alerts[i].id === id) return state.alerts[i];
    return null;
  }
  function setStatus(msg, isErr) {
    statusEl.textContent = msg;
    statusEl.className = "status" + (isErr ? " err" : "");
    clearTimeout(statusTimer);
    if (msg)
      statusTimer = setTimeout(function () {
        statusEl.textContent = "";
      }, 4500);
  }

  function fmtCountdown(s) {
    s = Math.max(0, Math.ceil(s));
    var h = Math.floor(s / 3600),
      m = Math.floor((s % 3600) / 60),
      sec = s % 60;
    if (h > 0) return h + " h " + m + " min";
    if (m > 0) return m + " min " + pad(sec) + " s";
    return sec + " s";
  }
  function nextText(a, now) {
    var t = now.getTime();
    if (a.snoozeUntil > t)
      return (
        "Snoozed, rings again in " + fmtCountdown((a.snoozeUntil - t) / 1000)
      );
    if (!a.on) return "Off";
    var p = parts(a.tz, now);
    var d = toMin(a.time) * 60 - (p.hour * 3600 + p.minute * 60 + p.second);
    if (d <= 0) d += 86400;
    return "Rings in " + fmtCountdown(d);
  }

  function renderAlerts() {
    if (!state.alerts.length) {
      listEl.innerHTML =
        '<li class="empty">No alerts yet. Choose a time above and select Add alert.</li>';
      return;
    }
    listEl.innerHTML = state.alerts
      .map(function (a) {
        var name = a.label ? esc(a.label) : "Alert";
        var plain = fmtAlertTimePlain(a.time);
        return (
          '<li class="alert' +
          (a.on ? "" : " off") +
          '" data-id="' +
          a.id +
          '">' +
          '<div class="a-time">' +
          fmtAlertTime(a.time) +
          "</div>" +
          '<div class="a-info"><div class="a-label">' +
          name +
          "</div>" +
          '<div class="a-sub">' +
          esc(placeLabels[a.tz] || a.tz) +
          ", " +
          (a.repeat === "daily" ? "every day" : "once") +
          "</div>" +
          '<div class="a-cd" data-cd="' +
          a.id +
          '"></div></div>' +
          '<input type="checkbox" class="switch" role="switch" data-act="toggle" ' +
          (a.on ? "checked" : "") +
          ' aria-label="' +
          name +
          " at " +
          plain +
          ' is on">' +
          '<button type="button" class="btn ghost small" data-act="delete" aria-label="Delete ' +
          name +
          " at " +
          plain +
          '">Delete</button>' +
          "</li>"
        );
      })
      .join("");
    updateCountdowns(new Date());
  }
  function updateCountdowns(now) {
    var els = listEl.querySelectorAll("[data-cd]");
    for (var i = 0; i < els.length; i++) {
      var a = findAlert(els[i].getAttribute("data-cd"));
      if (a) {
        var t = nextText(a, now);
        if (els[i].textContent !== t) els[i].textContent = t;
      }
    }
  }

  function rebuildClockChoices() {
    var sel = $("#al-clock"),
      prev = sel.value;
    var opts = [state.usaTz];
    if (state.showOther) opts.push(state.otherTz);
    sel.innerHTML = opts
      .map(function (tz) {
        return (
          '<option value="' + tz + '">' + esc(placeLabels[tz]) + "</option>"
        );
      })
      .join("");
    if (opts.indexOf(prev) !== -1) sel.value = prev;
  }

  function addAlert() {
    ensureAudio();
    var timeEl = $("#al-time"),
      time = timeEl.value;
    if (!time) {
      setStatus("Choose a time for the alert.", true);
      timeEl.focus();
      return;
    }
    var tz = $("#al-clock").value;
    var a = {
      id: uid(),
      time: time,
      label: $("#al-label").value.trim(),
      tz: tz,
      repeat: $("#al-repeat").value,
      on: true,
      lastFired: "",
      snoozeUntil: 0,
    };
    var p = parts(tz, new Date());
    if (p.hour * 60 + p.minute > toMin(time)) a.lastFired = dayKey(p); // already passed today, so first ring is tomorrow
    state.alerts.push(a);
    state.alerts.sort(function (x, y) {
      return x.time < y.time ? -1 : x.time > y.time ? 1 : 0;
    });
    save();
    renderAlerts();
    $("#al-label").value = "";
    setStatus(
      "Alert added for " +
        fmtAlertTimePlain(time) +
        ", " +
        placeLabels[tz] +
        ".",
    );
  }

  listEl.addEventListener("click", function (e) {
    var btn = e.target.closest('[data-act="delete"]');
    if (!btn) return;
    var id = btn.closest(".alert").getAttribute("data-id");
    state.alerts = state.alerts.filter(function (a) {
      return a.id !== id;
    });
    var ri = ringing.indexOf(id);
    if (ri !== -1) {
      ringing.splice(ri, 1);
      showRing();
    }
    save();
    renderAlerts();
    setStatus("Alert deleted.");
  });
  listEl.addEventListener("change", function (e) {
    var box = e.target.closest('[data-act="toggle"]');
    if (!box) return;
    var a = findAlert(box.closest(".alert").getAttribute("data-id"));
    if (!a) return;
    a.on = box.checked;
    if (!a.on) a.snoozeUntil = 0;
    if (a.on) {
      var p = parts(a.tz, new Date());
      if (p.hour * 60 + p.minute > toMin(a.time)) a.lastFired = dayKey(p);
    }
    save();
    renderAlerts();
  });

  /* ---------- Ringing ---------- */
  var ringing = [];
  var ringEl = $("#ring"),
    ctx = null,
    soundTimer = null,
    soundStop = null;

  function ensureAudio() {
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === "suspended") ctx.resume();
    } catch (e) {
      /* audio unavailable */
    }
  }
  function beep() {
    if (!ctx) return;
    try {
      var t = ctx.currentTime;
      for (var i = 0; i < 3; i++) {
        var o = ctx.createOscillator(),
          g = ctx.createGain(),
          s = t + i * 0.24;
        o.type = "sine";
        o.frequency.value = 880;
        g.gain.setValueAtTime(0.0001, s);
        g.gain.linearRampToValueAtTime(0.28, s + 0.02);
        g.gain.linearRampToValueAtTime(0.0001, s + 0.18);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(s);
        o.stop(s + 0.2);
      }
    } catch (e) {
      /* ignore */
    }
  }
  function startSound() {
    if (soundTimer) return;
    beep();
    soundTimer = setInterval(beep, 1400);
    soundStop = setTimeout(stopSound, 60000);
  }
  function stopSound() {
    clearInterval(soundTimer);
    clearTimeout(soundStop);
    soundTimer = soundStop = null;
  }

  function ring(a) {
    if (ringing.indexOf(a.id) !== -1) return;
    ringing.push(a.id);
    showRing();
    startSound();
    try {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(a.label || "Alert", {
          body: fmtAlertTimePlain(a.time) + ", " + placeLabels[a.tz],
        });
      }
    } catch (e) {
      /* notifications unavailable */
    }
  }
  function showRing() {
    if (!ringing.length) {
      ringEl.hidden = true;
      stopSound();
      document.title = baseTitle;
      return;
    }
    var a = findAlert(ringing[0]);
    if (!a) {
      ringing.shift();
      showRing();
      return;
    }
    $("#ring-title").textContent = a.label || "Alert";
    $("#ring-sub").textContent =
      fmtAlertTimePlain(a.time) + ", " + placeLabels[a.tz];
    var more = $("#ring-more");
    more.hidden = ringing.length < 2;
    more.textContent =
      ringing.length > 1 ? ringing.length - 1 + " more ringing" : "";
    document.title = "🔔 " + (a.label || "Alert");
    var wasHidden = ringEl.hidden;
    ringEl.hidden = false;
    if (wasHidden) $("#ring-dismiss").focus();
  }
  $("#ring-dismiss").addEventListener("click", function () {
    ringing.shift();
    showRing();
  });
  $("#ring-snooze").addEventListener("click", function () {
    var a = findAlert(ringing[0]);
    if (a) {
      a.snoozeUntil = Date.now() + 5 * 60000;
      save();
      renderAlerts();
    }
    ringing.shift();
    showRing();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !ringEl.hidden) {
      ringing.shift();
      showRing();
    }
  });

  function checkAlerts(now) {
    var changed = false,
      t = now.getTime();
    for (var i = 0; i < state.alerts.length; i++) {
      var a = state.alerts[i];
      if (a.snoozeUntil && t >= a.snoozeUntil) {
        a.snoozeUntil = 0;
        changed = true;
        ring(a);
      }
      if (!a.on) continue;
      var p = parts(a.tz, now),
        key = dayKey(p),
        nowMin = p.hour * 60 + p.minute,
        am = toMin(a.time);
      if (a.lastFired !== key && nowMin >= am && nowMin < am + 2) {
        a.lastFired = key;
        changed = true;
        if (a.repeat === "once") a.on = false;
        ring(a);
      }
    }
    if (changed) {
      save();
      renderAlerts();
    }
  }

  /* ---------- Main tick ---------- */
  var lastSecond = -1;
  function tick(force) {
    var now = new Date(),
      s = Math.floor(now.getTime() / 1000);
    if (!force && s === lastSecond) return;
    lastSecond = s;
    var u = updateCard(usaCard, state.usaTz, now, null);
    if (state.showOther) updateCard(otherCard, state.otherTz, now, u);
    checkAlerts(now);
    updateCountdowns(now);
  }

  /* ---------- Controls ---------- */
  function fillSelects() {
    $("#usa-select").innerHTML = US_ZONES.map(function (z) {
      return (
        '<option value="' + z.tz + '">' + esc(placeLabels[z.tz]) + "</option>"
      );
    }).join("");
    $("#usa-select").value = state.usaTz;
    $("#other-select").innerHTML = COUNTRIES.filter(function (c) {
      return validTz(c[2]);
    })
      .map(function (c) {
        return (
          '<option value="' + c[2] + '">' + esc(placeLabels[c[2]]) + "</option>"
        );
      })
      .join("");
    $("#other-select").value = state.otherTz;
  }
  function applyFormat() {
    $("#fmt12").setAttribute("aria-pressed", String(state.hour12));
    $("#fmt24").setAttribute("aria-pressed", String(!state.hour12));
    buildTicks();
    [usaCard, otherCard].forEach(function (c) {
      c.hm.dataset.v = "";
      c.sec.dataset.v = "";
    });
    renderAlerts();
  }
  function applySecond() {
    otherCard.el.hidden = !state.showOther;
    $("#second-toggle").checked = state.showOther;
    rebuildClockChoices();
  }

  $("#usa-select").addEventListener("change", function (e) {
    state.usaTz = e.target.value;
    save();
    rebuildClockChoices();
    tick(true);
  });
  $("#other-select").addEventListener("change", function (e) {
    state.otherTz = e.target.value;
    save();
    rebuildClockChoices();
    tick(true);
  });
  $("#second-toggle").addEventListener("change", function (e) {
    state.showOther = e.target.checked;
    save();
    applySecond();
    tick(true);
  });
  $("#fmt12").addEventListener("click", function () {
    state.hour12 = true;
    save();
    applyFormat();
    tick(true);
  });
  $("#fmt24").addEventListener("click", function () {
    state.hour12 = false;
    save();
    applyFormat();
    tick(true);
  });

  $("#al-add").addEventListener("click", addAlert);
  ["#al-time", "#al-label"].forEach(function (s) {
    $(s).addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        addAlert();
      }
    });
  });
  $("#al-test").addEventListener("click", function () {
    ensureAudio();
    beep();
    setStatus("Playing a test sound.");
  });

  var notifBtn = $("#al-notif");
  function updateNotifBtn() {
    try {
      notifBtn.hidden =
        !("Notification" in window) || Notification.permission !== "default";
    } catch (e) {
      notifBtn.hidden = true;
    }
  }
  notifBtn.addEventListener("click", function () {
    try {
      var r = Notification.requestPermission();
      if (r && r.then) r.then(updateNotifBtn, updateNotifBtn);
      else updateNotifBtn();
    } catch (e) {
      notifBtn.hidden = true;
    }
  });

  ["pointerdown", "keydown"].forEach(function (ev) {
    window.addEventListener(ev, ensureAudio, { once: true });
  });

  /* ---------- Start ---------- */
  load();
  fillSelects();
  applySecond();
  applyFormat();
  updateNotifBtn();
  tick(true);
  setInterval(function () {
    tick(false);
  }, 250);
})();
