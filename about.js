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

  /* ---------- 2. Page-load sequence ---------- */
  var portrait = document.querySelector(".ab-portrait img");
  var fontsReady = document.fonts && document.fonts.load
    ? document.fonts.load("300 1em 'Fraunces Var'").catch(function () {})
    : Promise.resolve();
  var imgReady = new Promise(function (resolve) {
    if (!portrait || portrait.complete) return resolve();
    portrait.addEventListener("load", resolve, { once: true });
    portrait.addEventListener("error", resolve, { once: true });
  });
  var timeout = new Promise(function (r) { setTimeout(r, 1500); });

  Promise.race([Promise.all([fontsReady, imgReady]), timeout]).then(function () {
    requestAnimationFrame(function () {
      body.classList.add("is-ready");
      Array.prototype.forEach.call(
        document.querySelectorAll(".ab-intro [data-split]"),
        function (el) { el.classList.add("is-in"); }
      );
    });
  });

  /* ---------- 3. Reveal on scroll ---------- */
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

  /* ---------- 4. Roam montage (scroll-linked) ---------- */
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
  }

  // Reveal the giant word when the section arrives.
  if (wordText && "IntersectionObserver" in window) {
    var wo = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { wordText.classList.add("is-in"); wo.disconnect(); }
    }, { threshold: 0.15 });
    wo.observe(pin);
  } else if (wordText) {
    wordText.classList.add("is-in");
  }

  /* ---------- 5. Photo strip drifts sideways with scroll ---------- */
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
