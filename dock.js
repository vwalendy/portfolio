(function () {
  var root = document.documentElement;
  var btn = document.querySelector(".dock-theme");
  if (!btn) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function isDark() { return root.getAttribute("data-theme") === "dark"; }
  function label() {
    var next = isDark() ? "Light mode" : "Dark mode";
    btn.setAttribute("data-tip", next);
    btn.setAttribute("aria-label", "Switch to " + next.toLowerCase());
  }
  function apply() {
    if (isDark()) root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", "dark");
    try { localStorage.setItem("theme", isDark() ? "dark" : "light"); } catch (e) {}
    label();
    window.dispatchEvent(new CustomEvent("themechange"));
  }

  btn.addEventListener("click", function () {
    if (reduce || !document.startViewTransition) return apply();
    // New theme grows as a circle from the button.
    var r = btn.getBoundingClientRect();
    var x = r.left + r.width / 2, y = r.top + r.height / 2;
    var end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    var vt = document.startViewTransition(apply);
    vt.ready.then(function () {
      root.animate(
        { clipPath: ["circle(0px at " + x + "px " + y + "px)", "circle(" + end + "px at " + x + "px " + y + "px)"] },
        { duration: 700, easing: "cubic-bezier(0.65, 0, 0.35, 1)", pseudoElement: "::view-transition-new(root)" }
      );
    });
  });

  label();
})();
