(function () {
  var panels = Array.from(document.querySelectorAll(".dest-panel"));
  if (!panels.length) return;

  var current = 0;
  var locked = false;
  var LOCK_MS = 900;

  function goTo(index) {
    index = Math.max(0, Math.min(panels.length - 1, index));
    if (index === current || locked) return;
    current = index;
    locked = true;
    panels[current].scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(function () { locked = false; }, LOCK_MS);
  }

  // wheel (desktop + trackpad)
  window.addEventListener(
    "wheel",
    function (e) {
      e.preventDefault();
      if (locked) return;
      if (e.deltaY > 12) goTo(current + 1);
      else if (e.deltaY < -12) goTo(current - 1);
    },
    { passive: false }
  );

  // touch (mobile swipe) — block native scroll during the gesture, decide on release
  var touchStartY = null;
  window.addEventListener(
    "touchstart",
    function (e) { touchStartY = e.touches[0].clientY; },
    { passive: true }
  );
  window.addEventListener(
    "touchmove",
    function (e) { e.preventDefault(); },
    { passive: false }
  );
  window.addEventListener(
    "touchend",
    function (e) {
      if (touchStartY === null) return;
      var dy = touchStartY - e.changedTouches[0].clientY;
      touchStartY = null;
      if (Math.abs(dy) < 40) return;
      if (dy > 0) goTo(current + 1);
      else goTo(current - 1);
    },
    { passive: true }
  );

  // keyboard
  window.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown" || e.key === "PageDown") { e.preventDefault(); goTo(current + 1); }
    if (e.key === "ArrowUp" || e.key === "PageUp") { e.preventDefault(); goTo(current - 1); }
  });

  // let CSS darken the top-left links specifically over Nepal, where the
  // difference blend mode ends up invisible against that photo
  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
          current = panels.indexOf(entry.target);
          var slug = (entry.target.getAttribute("href") || "").replace(".html", "");
          document.body.setAttribute("data-current-dest", slug);
        }
      });
    },
    { threshold: [0.6] }
  );
  panels.forEach(function (p) { io.observe(p); });
})();
