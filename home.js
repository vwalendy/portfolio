(function () {
  var body = document.body;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  Array.prototype.forEach.call(document.querySelectorAll("[data-split]"), function (el) {
    var text = el.textContent.trim();
    el.setAttribute("aria-label", text);
    el.textContent = "";
    var w = document.createElement("span");
    w.className = "w";
    w.setAttribute("aria-hidden", "true");
    Array.from(text).forEach(function (ch, i) {
      var c = document.createElement("span");
      c.className = "c"; c.style.setProperty("--i", i); c.textContent = ch;
      w.appendChild(c);
    });
    el.appendChild(w);
  });

  var img = document.querySelector(".hm-photo img");
  var fontReady = document.fonts && document.fonts.load
    ? document.fonts.load("300 1em 'Fraunces Var'").catch(function () {}) : Promise.resolve();
  var imgReady = new Promise(function (r) {
    if (!img || img.complete) return r();
    img.addEventListener("load", r, { once: true }); img.addEventListener("error", r, { once: true });
  });
  Promise.race([Promise.all([fontReady, imgReady]), new Promise(function (r) { setTimeout(r, 1500); })]).then(function () {
    requestAnimationFrame(function () {
      body.classList.add("is-ready");
      Array.prototype.forEach.call(document.querySelectorAll("[data-split]"), function (el) { el.classList.add("is-in"); });
    });
  });

  // the photograph follows the pointer very slightly
  if (!reduce && img && window.matchMedia("(pointer: fine)").matches) {
    var tx = 0, ty = 0, x = 0, y = 0, running = false;
    window.addEventListener("pointermove", function (e) {
      tx = (e.clientX / window.innerWidth - 0.5) * -14;
      ty = (e.clientY / window.innerHeight - 0.5) * -8;
      if (!running) { running = true; requestAnimationFrame(step); }
    }, { passive: true });
    function step() {
      x += (tx - x) * 0.06; y += (ty - y) * 0.06;
      img.style.transform = "translate(" + x.toFixed(2) + "px," + y.toFixed(2) + "px) scale(1.04)";
      if (Math.abs(tx - x) > 0.05 || Math.abs(ty - y) > 0.05) requestAnimationFrame(step);
      else running = false;
    }
  }
})();
