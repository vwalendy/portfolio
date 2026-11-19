(function () {
  var body = document.body;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. Split text into animatable spans ---------- */
  function split(el) {
    var mode = el.getAttribute("data-split");
    var text = el.textContent.trim().replace(/\s+/g, " ");
    el.setAttribute("aria-label", text);
    el.textContent = "";
    var i = 0;
    text.split(" ").forEach(function (word, wi, arr) {
      var w = document.createElement("span");
      w.className = "w";
      w.setAttribute("aria-hidden", "true");
      if (mode === "chars") {
        Array.from(word).forEach(function (ch) {
          var c = document.createElement("span");
          c.className = "c";
          c.style.setProperty("--i", i++);
          c.textContent = ch;
          w.appendChild(c);
        });
      } else {
        var inner = document.createElement("span");
        inner.className = "wi";
        inner.style.setProperty("--i", i++);
        inner.textContent = word;
        w.appendChild(inner);
      }
      el.appendChild(w);
      if (wi < arr.length - 1) el.appendChild(document.createTextNode(" "));
    });
  }
  Array.prototype.forEach.call(document.querySelectorAll("[data-split]"), split);

  /* ---------- 2. Odometer: each digit is a reel of 0–9 that rolls into place ---------- */
  function Odo(el, digits) {
    this.el = el;
    this.group = el.hasAttribute("data-group");
    this.reels = [];
    this.build(digits);
  }
  Odo.prototype.build = function (n) {
    this.el.textContent = "";
    this.reels = [];
    for (var i = 0; i < n; i++) {
      if (this.group && i > 0 && (n - i) % 3 === 0) {
        var sep = document.createElement("span"); sep.className = "odo-sep"; this.el.appendChild(sep);
      }
      var d = document.createElement("span"); d.className = "odo-d";
      var reel = document.createElement("span"); reel.className = "odo-reel";
      for (var k = 0; k < 10; k++) { var s = document.createElement("span"); s.textContent = k; reel.appendChild(s); }
      d.appendChild(reel); this.el.appendChild(d);
      this.reels.push({ box: d, reel: reel });
    }
  };
  Odo.prototype.set = function (value, opts) {
    opts = opts || {};
    var str = String(Math.max(0, Math.round(value)));
    var n = this.reels.length;
    while (str.length < n) str = " " + str;
    for (var i = 0; i < n; i++) {
      var ch = str[i], r = this.reels[i];
      var blank = ch === " " && i < n - 1;
      r.box.classList.toggle("is-blank", blank);
      var digit = blank ? 0 : Number(ch);
      if (opts.stagger) {
        // left-most reels finish last, like a mechanical counter
        r.reel.style.setProperty("--dur", (1.2 + (n - i) * 0.18) + "s");
        r.reel.style.setProperty("--dl", (opts.delay || 0) + "s");
      }
      r.reel.style.transform = "translateY(" + (-digit * 10) + "%)";
    }
  };
  // For the stats: reset to zero, then roll every reel up to its digit.
  Odo.prototype.roll = function (value, delay) {
    var self = this;
    var str = String(value);
    this.build(str.length);
    this.reels.forEach(function (r) { r.reel.style.transition = "none"; r.reel.style.transform = "translateY(0)"; });
    void this.el.offsetWidth;
    this.reels.forEach(function (r) { r.reel.style.transition = ""; });
    self.set(value, { stagger: true, delay: delay || 0 });
  };

  /* ---------- 3. Loader: real progress of the assets the first screen needs ---------- */
  var root = document.documentElement;
  var loader = document.querySelector(".ab-loader");
  var countOdo = new Odo(loader.querySelector(".odo"), 3);
  countOdo.set(0);

  var seen = false;
  try { seen = sessionStorage.getItem("ab-loaded") === "1"; } catch (e) {}

  var critical = [
    "photos/portrait.jpg", "assets/roam/icon.png",
    "assets/roam/learn.webp", "assets/roam/snap.webp", "assets/roam/explore.webp",
    "assets/roam/identify.webp", "assets/roam/collection.webp", "assets/roam/wishlist.webp"
  ];
  var total = critical.length + 1, done = 0;
  function tick() { done++; }
  critical.forEach(function (src) {
    var im = new Image();
    im.onload = im.onerror = tick;
    im.src = src;
  });
  (document.fonts && document.fonts.load
    ? document.fonts.load("300 1em 'Fraunces Var'").catch(function () {})
    : Promise.resolve()).then(tick);

  function startIntro() {
    body.classList.add("is-ready");
    Array.prototype.forEach.call(
      document.querySelectorAll(".ab-intro [data-split]"),
      function (el) { el.classList.add("is-in"); }
    );
  }

  if (seen || reduce) {
    loader.classList.add("is-gone");
    requestAnimationFrame(startIntro);
  } else {
    root.classList.add("is-loading");
    var shown = 0, t0 = performance.now(), MIN = 1400, MAX = 6000;
    (function step(now) {
      var elapsed = now - t0;
      var real = done / total;
      var timeCap = Math.min(1, elapsed / MIN);           // never faster than MIN
      var goal = Math.min(real, timeCap) * 100;
      if (elapsed > MAX) goal = 100;                      // never stuck
      shown += (goal - shown) * 0.12;
      if (goal === 100 && shown > 99.4) shown = 100;
      countOdo.set(Math.floor(shown));
      loader.style.setProperty("--lp", shown.toFixed(1));
      loader.style.setProperty("--lw", (100 + shown * 3.4).toFixed(0));
      loader.style.setProperty("--lpx", (shown / 100).toFixed(3));
      if (shown < 100) return requestAnimationFrame(step);
      setTimeout(function () {
        loader.classList.add("is-done");
        root.classList.remove("is-loading");
        try { sessionStorage.setItem("ab-loaded", "1"); } catch (e) {}
        setTimeout(startIntro, 350);
        setTimeout(function () { loader.classList.add("is-gone"); }, 1200);
      }, 280);
    })(t0);
  }

  /* ---------- 4. Stats: numbers roll in when they appear ---------- */
  var stats = Array.prototype.slice.call(document.querySelectorAll(".roam-stats .odo"));
  var statOdos = stats.map(function (el) {
    var o = new Odo(el, String(el.getAttribute("data-value")).length);
    o.set(0);
    return o;
  });
  var statsList = document.querySelector(".roam-stats");
  if (statsList && "IntersectionObserver" in window) {
    var so = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      statOdos.forEach(function (o, i) {
        if (reduce) o.set(Number(o.el.getAttribute("data-value")));
        else o.roll(Number(o.el.getAttribute("data-value")), 0.15 + i * 0.12);
      });
      so.disconnect();
    }, { rootMargin: "0px 0px -15% 0px" });
    so.observe(statsList);
  } else {
    statOdos.forEach(function (o) { o.set(Number(o.el.getAttribute("data-value"))); });
  }

  /* ---------- 6. Reveal on scroll ---------- */
  var revealables = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); ro.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -12% 0px" });
    Array.prototype.forEach.call(revealables, function (el) { ro.observe(el); });
  } else {
    Array.prototype.forEach.call(revealables, function (el) { el.classList.add("is-in"); });
  }

  /* ---------- 7. Roam montage (scroll-linked) ---------- */
  var roam = document.querySelector(".roam");
  var pin = document.querySelector(".roam-pin");
  var word = document.querySelector(".roam-word");
  var wordText = word && word.querySelector("[data-split]");
  var phones = Array.prototype.slice.call(document.querySelectorAll(".ph"));
  var caps = Array.prototype.slice.call(document.querySelectorAll(".roam-cap"));

  // Final composition. x in phone widths, y in phone heights, from stage centre.
  // in: [start, end] of the scroll progress during which the phone flies in.
  // depth: how much it keeps drifting afterwards (closer = more).
  var LAYOUT = {
    identify:   { x: -0.38, y: -0.25, r: -4,  s: 0.68, z: 1, depth: 0.25, in: [0.04, 0.30], wide: false },
    collection: { x: -1.72, y: -0.03, r: -10, s: 0.78, z: 2, depth: 0.45, in: [0.08, 0.34], wide: true },
    wishlist:   { x:  1.72, y: -0.07, r:  9,  s: 0.76, z: 2, depth: 0.45, in: [0.20, 0.46], wide: true },
    snap:       { x: -0.92, y:  0.07, r: -6,  s: 0.90, z: 4, depth: 0.75, in: [0.12, 0.38], wide: false },
    explore:    { x:  0.92, y:  0.05, r:  5,  s: 0.90, z: 4, depth: 0.75, in: [0.17, 0.43], wide: false },
    learn:      { x:  0,    y:  0.02, r:  0,  s: 1.00, z: 6, depth: 1.00, in: [0.22, 0.50], wide: false }
  };
  phones.forEach(function (ph) {
    ph.cfg = LAYOUT[ph.getAttribute("data-ph")];
    ph.style.zIndex = ph.cfg.z;
  });

  var pw = 280, ph = 606, vw = 0, vh = 0, narrow = false;
  function measure() {
    vw = window.innerWidth;
    vh = window.innerHeight;
    narrow = vw < 760;
    var spread = narrow ? 2.45 : 4.6;          // total composition width in phone widths
    var maxH = vh * (narrow ? 0.6 : 0.64);
    pw = Math.min(vw / spread, maxH / 2.163);
    ph = pw * 2.163;
    roam.style.setProperty("--pw", pw + "px");
    phones.forEach(function (p) { p.style.display = narrow && p.cfg.wide ? "none" : ""; });
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  var target = 0, current = 0, running = false, capIndex = -2;
  var CAP_START = 0.52, CAP_STEP = 0.11;
  var capFor = caps.map(function (c) { return c.getAttribute("data-for"); });

  function progress() {
    var r = pin.getBoundingClientRect();
    return clamp(-r.top / (r.height - vh), 0, 1);
  }

  function render(p) {
    // Giant word: present at first, then recedes behind the phones.
    var wt = easeInOut(clamp(p / 0.4, 0, 1));
    word.style.opacity = String(1 - wt * 0.93);
    word.style.transform = "translateY(" + (-wt * 6) + "vh) scale(" + (1 + wt * 0.18) + ")";

    roam.classList.toggle("show-head", p > 0.3);

    // Which caption / highlighted phone
    var ci = p < CAP_START ? -1 : clamp(Math.floor((p - CAP_START) / CAP_STEP), 0, caps.length - 1);
    if (ci !== capIndex) {
      if (capIndex >= 0) { caps[capIndex].classList.remove("is-in"); caps[capIndex].classList.add("is-out"); }
      if (ci >= 0) { caps[ci].classList.remove("is-out"); caps[ci].classList.add("is-in"); }
      capIndex = ci;
    }
    var focus = ci >= 0 ? capFor[ci] : null;

    phones.forEach(function (el) {
      var c = el.cfg;
      var t = reduce ? 1 : easeOutCubic(clamp((p - c.in[0]) / (c.in[1] - c.in[0]), 0, 1));
      var after = reduce ? 0 : Math.max(0, p - c.in[1]);
      var isFocus = focus === el.getAttribute("data-ph");

      // start: below the stage, bunched toward the centre, over-rotated
      var x = (c.x * (0.35 + 0.65 * t)) * pw;
      var y = (c.y + (1 - t) * 1.25) * ph - after * c.depth * 0.32 * ph;
      var r = c.r * (1 + (1 - t) * 2.2);
      var s = c.s * (0.92 + 0.08 * t);
      if (isFocus) { y -= 0.035 * ph; s *= 1.04; }

      el.style.transform =
        "translate(-50%, -50%) translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0) rotate(" +
        r.toFixed(2) + "deg) scale(" + s.toFixed(4) + ")";
      el.style.zIndex = isFocus ? 10 : c.z;
      el.classList.toggle("is-dim", !!focus && !isFocus);
    });
  }

  function loop() {
    current += (target - current) * (reduce ? 1 : 0.1);
    if (Math.abs(target - current) < 0.0005) current = target;
    render(current);
    if (current !== target) requestAnimationFrame(loop);
    else running = false;
  }
  function onScroll() {
    target = progress();
    if (!running) { running = true; requestAnimationFrame(loop); }
    strip();
    transition();
  }

  // Reveal the giant word when the section arrives.
  if (wordText && "IntersectionObserver" in window) {
    var wo = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { wordText.classList.add("is-in"); wo.disconnect(); }
    }, { threshold: 0, rootMargin: "0px 0px -35% 0px" });
    wo.observe(pin);
  } else if (wordText) {
    wordText.classList.add("is-in");
  }

  /* ---------- 8. Transition: the Roam icon opens into the Roam section ---------- */
  var trans = document.querySelector(".ab-trans");
  var tPanel = document.querySelector(".ab-trans-panel");
  var tIcon = document.querySelector(".ab-trans-icon");
  var tText = document.querySelector(".ab-trans-text");
  var FROM = [38, 159, 149], TO = [25, 73, 66];   // icon teal → Roam section green

  if (trans && "IntersectionObserver" in window) {
    var to = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { trans.classList.add("is-in"); to.disconnect(); }
    }, { threshold: 0.2 });
    to.observe(trans);
  } else if (trans) { trans.classList.add("is-in"); }

  function hexToRgb(str) {
    var m = str.trim().match(/^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
    if (m) return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
    var n = str.match(/\d+(\.\d+)?/g);
    return n ? n.slice(0, 3).map(Number) : [255, 255, 255];
  }
  function mix(a, b, t) { return a.map(function (v, i) { return Math.round(v + (b[i] - v) * t); }); }
  var GREEN = [25, 73, 66], PALE = [238, 243, 241];

  function transition() {
    if (!trans) return;
    var r = trans.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh) return;
    var p = clamp(-r.top / (r.height - vh), 0, 1);
    var t = reduce ? (p > 0.5 ? 1 : 0) : clamp((p - 0.03) / 0.57, 0, 1);

    var cs = getComputedStyle(body);
    var BG = hexToRgb(cs.getPropertyValue("--navy"));
    var INKC = hexToRgb(cs.getPropertyValue("--navy-ink"));

    var s0 = Math.min(vw * 0.11, vh * 0.14, 120);
    var cxp = vw / 2, cyp = vh * 0.7;
    var far = Math.hypot(Math.max(cxp, vw - cxp), Math.max(cyp, vh - cyp));

    // Green spreads out of the icon like ink in water: a soft-edged disc that
    // grows past the corners, while the whole stage warms toward the same green.
    var e = easeInOut(t);
    var R = s0 * 0.5 + e * far * 1.45;
    var core = R * 0.45;
    var wash = mix(BG, GREEN, Math.pow(e, 1.6));
    var g = "rgb(" + GREEN.join(",") + ")";
    tPanel.style.clipPath = "none";
    tPanel.style.background =
      "radial-gradient(circle at " + cxp.toFixed(0) + "px " + cyp.toFixed(0) + "px, " +
      g + " " + core.toFixed(0) + "px, rgba(" + GREEN.join(",") + ",0) " + R.toFixed(0) + "px), " +
      "rgb(" + wash.join(",") + ")";
    tPanel.style.opacity = String(clamp(t * 6, 0, 1));

    // Icon swells gently and melts into the green.
    roam.style.setProperty("--is", s0 + "px");
    trans.style.setProperty("--is", s0 + "px");
    tIcon.style.transform = "translate(-50%, " + (cyp - s0 / 2).toFixed(1) + "px) scale(" + (1 + e * 0.9).toFixed(3) + ")";
    if (trans.classList.contains("is-in") && p > 0.01) {
      tIcon.classList.add("is-driven");
      tIcon.style.opacity = String(clamp(1 - e * 2.2, 0, 1));
      tIcon.style.filter = "blur(" + (e * 10).toFixed(1) + "px)";
    }

    // Heading sits above the green and turns pale as the green reaches it.
    var ct = clamp((e - 0.2) / 0.45, 0, 1);
    tText.style.color = "rgb(" + mix(INKC, PALE, ct).join(",") + ")";
    tText.style.transform = "translateY(" + (-e * 8).toFixed(2) + "vh)";
    tText.style.opacity = String(1 - clamp((e - 0.7) / 0.3, 0, 1));
  }

  /* ---------- 8b. Experience rows open and close ---------- */
  Array.prototype.forEach.call(document.querySelectorAll(".xp-head"), function (b) {
    b.addEventListener("click", function () {
      var item = b.parentNode;
      var open = !item.classList.contains("is-open");
      item.classList.toggle("is-open", open);
      b.setAttribute("aria-expanded", String(open));
    });
  });

  /* ---------- 9. Photo strip drifts sideways with scroll ---------- */
  var stripEl = document.querySelector(".ab-strip");
  var track = document.querySelector(".ab-strip-track");
  function strip() {
    if (!stripEl || reduce) return;
    var r = stripEl.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh) return;
    var t = clamp((vh - r.top) / (vh + r.height), 0, 1);
    var max = Math.max(0, track.scrollWidth - vw * 0.92);
    track.style.transform = "translate3d(" + (-t * max).toFixed(1) + "px,0,0)";
  }

  measure();
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", function () { measure(); onScroll(); render(current); });
})();
