(function () {
  if (!window.matchMedia("(pointer: fine)").matches) return;

  var cursor = document.createElement("div");
  cursor.className = "cursor";
  document.body.appendChild(cursor);

  var mx = window.innerWidth / 2, my = window.innerHeight / 2;
  var cx = mx, cy = my;

  window.addEventListener("mousemove", function (e) {
    mx = e.clientX;
    my = e.clientY;
    cursor.classList.add("cursor--visible");
  });

  // event delegation so dynamically added elements (lightbox, theme toggle) work too
  document.addEventListener("mouseover", function (e) {
    if (e.target.closest("a, button, .frame")) cursor.classList.add("cursor--big");
  });
  document.addEventListener("mouseout", function (e) {
    if (e.target.closest("a, button, .frame")) cursor.classList.remove("cursor--big");
  });

  function tick() {
    cx += (mx - cx) * 0.16;
    cy += (my - cy) * 0.16;
    cursor.style.transform = "translate(" + cx + "px," + cy + "px) translate(-50%,-50%)";
    requestAnimationFrame(tick);
  }
  tick();
})();
