(function () {
  var root = document.documentElement;

  var moonSVG = '<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17 11.6A7 7 0 118.4 3a5.6 5.6 0 008.6 8.6z" stroke="currentColor" stroke-width="1"/></svg>';
  var sunSVG = '<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="3.3" stroke="currentColor" stroke-width="1"/><path d="M10 1.6V4M10 16v2.4M18.4 10H16M4 10H1.6M15.6 4.4L14 6M6 14l-1.6 1.6M15.6 15.6L14 14M6 6L4.4 4.4" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg>';

  function isDark() { return root.getAttribute("data-theme") === "dark"; }

  var btn = document.createElement("button");
  btn.className = "theme-toggle";
  btn.setAttribute("aria-label", "Toggle theme");
  btn.innerHTML = isDark() ? sunSVG : moonSVG;
  document.body.appendChild(btn);

  btn.addEventListener("click", function () {
    if (isDark()) {
      root.removeAttribute("data-theme");
      localStorage.setItem("theme", "light");
    } else {
      root.setAttribute("data-theme", "dark");
      localStorage.setItem("theme", "dark");
    }
    btn.innerHTML = isDark() ? sunSVG : moonSVG;
  });
})();
