(function () {
  var frames = Array.from(document.querySelectorAll(".gallery .frame"));
  if (!frames.length) return;

  var items = frames.map(function (f) {
    var img = f.querySelector("img");
    var caps = f.querySelectorAll(".cap span");
    return {
      src: img.getAttribute("src"),
      alt: img.getAttribute("alt"),
      left: caps[0] ? caps[0].textContent : "",
      right: caps[1] ? caps[1].textContent : ""
    };
  });

  var overlay = document.createElement("div");
  overlay.className = "lightbox";
  overlay.innerHTML =
    '<button class="lightbox-close" aria-label="Close">Close</button>' +
    '<button class="lightbox-nav prev" aria-label="Previous">&larr;</button>' +
    '<button class="lightbox-nav next" aria-label="Next">&rarr;</button>' +
    '<div class="lightbox-frame">' +
      '<img class="lightbox-img" src="" alt="">' +
      '<div class="lightbox-cap"><span class="lb-left"></span><span class="lb-right"></span></div>' +
    "</div>";
  document.body.appendChild(overlay);

  var imgEl = overlay.querySelector(".lightbox-img");
  var leftEl = overlay.querySelector(".lb-left");
  var rightEl = overlay.querySelector(".lb-right");
  var current = 0;

  function show(i) {
    current = (i + items.length) % items.length;
    var it = items[current];
    imgEl.setAttribute("src", it.src);
    imgEl.setAttribute("alt", it.alt);
    leftEl.textContent = it.left;
    rightEl.textContent = it.right;
  }

  function open(i) {
    show(i);
    overlay.classList.add("lightbox--open");
    document.body.classList.add("no-scroll");
  }

  function close() {
    overlay.classList.remove("lightbox--open");
    document.body.classList.remove("no-scroll");
  }

  frames.forEach(function (f, i) {
    f.addEventListener("click", function () { open(i); });
  });

  overlay.querySelector(".lightbox-close").addEventListener("click", close);
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) close();
  });
  overlay.querySelector(".prev").addEventListener("click", function () { show(current - 1); });
  overlay.querySelector(".next").addEventListener("click", function () { show(current + 1); });

  document.addEventListener("keydown", function (e) {
    if (!overlay.classList.contains("lightbox--open")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") show(current - 1);
    if (e.key === "ArrowRight") show(current + 1);
  });
})();
