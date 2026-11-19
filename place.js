(function () {
  var body = document.body;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ---------- kinetic text ---------- */
  Array.prototype.forEach.call(document.querySelectorAll("[data-split]"), function (el) {
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
          c.className = "c"; c.style.setProperty("--i", i++); c.textContent = ch;
          w.appendChild(c);
        });
      } else {
        var inner = document.createElement("span");
        inner.className = "wi"; inner.style.setProperty("--i", i++); inner.textContent = word;
        w.appendChild(inner);
      }
      el.appendChild(w);
      if (wi < arr.length - 1) el.appendChild(document.createTextNode(" "));
    });
  });

  var hero = document.querySelector(".pl-hero-img img");
  var fontReady = document.fonts && document.fonts.load
    ? document.fonts.load("300 1em 'Fraunces Var'").catch(function () {}) : Promise.resolve();
  var heroReady = new Promise(function (r) {
    if (!hero || hero.complete) return r();
    hero.addEventListener("load", r, { once: true }); hero.addEventListener("error", r, { once: true });
  });
  Promise.race([Promise.all([fontReady, heroReady]), new Promise(function (r) { setTimeout(r, 1800); })]).then(function () {
    requestAnimationFrame(function () {
      body.classList.add("is-ready");
      var t = document.querySelector(".pl-title"); if (t) t.classList.add("is-in");
    });
  });

  /* ---------- reveal photos and text as they arrive ---------- */
  var figs = Array.prototype.slice.call(document.querySelectorAll(".pf"));
  var reveal = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        // photos in the same row come in one after the other
        var row = e.target.parentNode, k = Array.prototype.indexOf.call(row.children, e.target);
        e.target.style.transitionDelay = (k * 0.12) + "s";
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -12% 0px" });
    figs.concat(reveal).forEach(function (el) { io.observe(el); });
  } else {
    figs.concat(reveal).forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- gentle parallax: hero drifts, each photo shifts inside its frame ---------- */
  var vh = window.innerHeight, ticking = false;
  function onScroll() {
    if (ticking || reduce) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var y = window.scrollY;
      if (hero && y < vh * 1.2) hero.style.transform = "translateY(" + (y * 0.25).toFixed(1) + "px) scale(1.04)";
      figs.forEach(function (f) {
        if (!f.classList.contains("is-in")) return;
        var r = f.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        var t = (r.top + r.height / 2 - vh / 2) / vh;       // -1 … 1 across the screen
        f.style.setProperty("--py", (t * -18).toFixed(1) + "px");
      });
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", function () { vh = window.innerHeight; onScroll(); });

  /* ---------- lightbox ---------- */
  var lb = document.querySelector(".lb");
  var lbImg = lb.querySelector(".lb-img");
  var lbCount = lb.querySelector(".lb-count");
  var current = -1, lastFocus = null;
  var fulls = figs.map(function (f) { return f.querySelector("img").getAttribute("data-full"); });

  function preload(i) { if (fulls[i]) { var im = new Image(); im.src = fulls[i]; } }
  function show(i, dir) {
    i = (i + figs.length) % figs.length;
    var go = function () {
      current = i;
      lbImg.src = fulls[i];
      lbCount.textContent = (i + 1) + " / " + figs.length;
      preload(i + 1); preload(i - 1);
    };
    if (current === -1 || reduce) { go(); return; }
    lbImg.style.setProperty("--dir", (dir || 0) * -24 + "px");
    lbImg.classList.add("is-swapping");
    setTimeout(function () {
      go();
      lbImg.style.setProperty("--dir", (dir || 0) * 24 + "px");
      var done = function () { lbImg.classList.remove("is-swapping"); };
      if (lbImg.complete) requestAnimationFrame(done); else lbImg.addEventListener("load", done, { once: true });
    }, 220);
  }
  function open(i) {
    lastFocus = document.activeElement;
    current = -1;
    lb.hidden = false;
    body.classList.add("lb-open");
    document.documentElement.style.overflow = "hidden";
    show(i, 0);
    requestAnimationFrame(function () { lb.classList.add("is-open"); });
    lb.querySelector(".lb-close").focus();
  }
  function close() {
    lb.classList.remove("is-open");
    body.classList.remove("lb-open");
    document.documentElement.style.overflow = "";
    setTimeout(function () { lb.hidden = true; lbImg.removeAttribute("src"); current = -1; }, reduce ? 0 : 350);
    if (lastFocus) lastFocus.focus();
  }

  figs.forEach(function (f, i) {
    f.addEventListener("click", function () { open(i); });
    f.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(i); }
    });
  });
  lb.querySelector(".lb-close").addEventListener("click", close);
  lb.querySelector(".lb-prev").addEventListener("click", function () { show(current - 1, -1); });
  lb.querySelector(".lb-next").addEventListener("click", function () { show(current + 1, 1); });
  lb.addEventListener("click", function (e) { if (e.target === lb) close(); });
  document.addEventListener("keydown", function (e) {
    if (lb.hidden) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowRight") show(current + 1, 1);
    else if (e.key === "ArrowLeft") show(current - 1, -1);
    else if (e.key === "Tab") {                       // keep focus inside the viewer
      var btns = lb.querySelectorAll("button"), first = btns[0], last = btns[btns.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  var sx = null;
  lb.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", function (e) {
    if (sx === null) return;
    var dx = e.changedTouches[0].clientX - sx; sx = null;
    if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  }, { passive: true });
})();
