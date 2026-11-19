(function () {
  var body = document.body;

  // Page-load reveal: wait for the portrait (and fonts when supported) so the
  // reveal plays once, on real content, rather than on an empty box.
  var portrait = document.querySelector(".ab-portrait img");
  var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  var imgReady = new Promise(function (resolve) {
    if (!portrait || portrait.complete) return resolve();
    portrait.addEventListener("load", resolve, { once: true });
    portrait.addEventListener("error", resolve, { once: true });
  });
  var timeout = new Promise(function (resolve) { setTimeout(resolve, 1200); });

  Promise.race([Promise.all([fontsReady, imgReady]), timeout]).then(function () {
    requestAnimationFrame(function () { body.classList.add("is-ready"); });
  });

  // Roam walkthrough: the step closest to the middle of the viewport drives the phone.
  var steps = Array.prototype.slice.call(document.querySelectorAll(".roam-step"));
  var screens = Array.prototype.slice.call(document.querySelectorAll(".roam-phone img"));
  var bars = Array.prototype.slice.call(document.querySelectorAll(".roam-progress button"));
  if (!steps.length) return;

  var current = -1;
  function setStep(i) {
    if (i === current) return;
    current = i;
    steps.forEach(function (s, k) { s.classList.toggle("is-active", k === i); });
    screens.forEach(function (s, k) { s.classList.toggle("is-active", k === i); });
    bars.forEach(function (b, k) {
      b.classList.toggle("is-active", k === i);
      b.classList.toggle("is-done", k < i);
    });
  }

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) setStep(Number(e.target.getAttribute("data-step")));
      });
    }, { rootMargin: "-50% 0px -50% 0px", threshold: 0 });
    steps.forEach(function (s) { io.observe(s); });
  }
  setStep(0);

  // Clicking a progress bar jumps to that step.
  bars.forEach(function (b) {
    b.addEventListener("click", function () {
      var target = steps[Number(b.getAttribute("data-go"))];
      if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });
})();
