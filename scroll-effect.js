(function () {
  var panels = document.querySelectorAll(".dest-panel");
  if (!panels.length || !("IntersectionObserver" in window)) return;

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && entry.intersectionRatio > 0.55) {
          entry.target.classList.add("in-view");
        } else {
          entry.target.classList.remove("in-view");
        }
      });
    },
    { threshold: [0, 0.55, 1] }
  );

  panels.forEach(function (p) { io.observe(p); });
})();
