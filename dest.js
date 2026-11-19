(function () {
  var body = document.body;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- kinetic text (same treatment as the About page) ---------- */
  Array.prototype.forEach.call(document.querySelectorAll("[data-split]"), function (el) {
    var text = el.textContent.trim().replace(/\s+/g, " ");
    el.setAttribute("aria-label", text);
    el.textContent = "";
    var i = 0;
    text.split(" ").forEach(function (word, wi, arr) {
      var w = document.createElement("span");
      w.className = "w";
      w.setAttribute("aria-hidden", "true");
      Array.from(word).forEach(function (ch) {
        var c = document.createElement("span");
        c.className = "c";
        c.style.setProperty("--i", i++);
        c.textContent = ch;
        w.appendChild(c);
      });
      el.appendChild(w);
      if (wi < arr.length - 1) el.appendChild(document.createTextNode(" "));
    });
  });

  var fontReady = document.fonts && document.fonts.load
    ? document.fonts.load("300 1em 'Fraunces Var'").catch(function () {}) : Promise.resolve();
  Promise.race([fontReady, new Promise(function (r) { setTimeout(r, 1200); })]).then(function () {
    requestAnimationFrame(function () {
      body.classList.add("is-ready");
      Array.prototype.forEach.call(document.querySelectorAll("[data-split]"), function (el) { el.classList.add("is-in"); });
    });
  });

  /* ---------- places ---------- */
  var HOME = { name: "Lausanne", lonlat: [6.63, 46.52] };
  var PLACES = {
    bangalore: { name: "Bangalore", lonlat: [77.59, 12.97], zoom: 3.2 },
    hampi:     { name: "Hampi",     lonlat: [76.46, 15.34], zoom: 3.4 },
    varanasi:  { name: "Varanasi",  lonlat: [82.97, 25.32], zoom: 3.2 },
    taj:       { name: "Agra",      lonlat: [78.04, 27.18], zoom: 3.2 },
    nepal:     { name: "Kathmandu", lonlat: [85.32, 27.72], zoom: 3.2 }
  };
  var BASE = PLACES.bangalore.lonlat;
  var OVERVIEW = { lonlat: [44, 30], zoom: 1.05 };

  var canvas = document.querySelector(".dest-globe canvas");
  var label = document.querySelector(".dest-pin-label");
  var list = document.querySelector(".dest-list");
  var items = Array.prototype.slice.call(document.querySelectorAll(".dest-item"));
  var previews = Array.prototype.slice.call(document.querySelectorAll(".dest-previews img"));
  if (!canvas || !window.d3 || !window.topojson) return;

  var ctx = canvas.getContext("2d");
  var W = 0, H = 0, dpr = 1;
  var projection = d3.geoOrthographic().clipAngle(90).precision(0.4);
  var path = d3.geoPath(projection, ctx);
  var graticule = d3.geoGraticule10();
  var sphere = { type: "Sphere" };
  var land = null, borders = null, detail = [];

  // camera: where the globe looks, and how close
  var cam = { center: HOME.lonlat.slice(), zoom: 1.7 };
  var flight = null;
  var active = null;
  var routeProgress = reduce ? 1 : 0;
  var colors = {};

  function readColors() {
    var cs = getComputedStyle(body);
    ["land", "land-hl", "border", "grid", "sea", "route", "pin"].forEach(function (k) {
      colors[k] = cs.getPropertyValue("--globe-" + k).trim();
    });
    colors.line = cs.getPropertyValue("--line").trim();
  }

  function size() {
    var r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  // Fly the camera along the great circle, pulling back a little mid-way.
  function flyTo(lonlat, zoom, ms) {
    var from = cam.center.slice(), z0 = cam.zoom;
    var dist = d3.geoDistance(from, lonlat);
    if (reduce) { cam.center = lonlat.slice(); cam.zoom = zoom; return; }
    flight = {
      interp: d3.geoInterpolate(from, lonlat),
      z0: z0, z1: zoom,
      dip: Math.min(z0, zoom) * (dist > 0.3 ? 0.55 : 0.85),
      t0: performance.now(),
      ms: ms || Math.max(900, Math.min(1800, dist * 2600))
    };
  }

  function step(now) {
    if (flight) {
      var t = Math.min(1, (now - flight.t0) / flight.ms), e = easeInOut(t);
      cam.center = flight.interp(e);
      var zl = flight.z0 + (flight.z1 - flight.z0) * e;
      var dipAmt = Math.sin(Math.PI * e);
      cam.zoom = zl + (Math.min(zl, flight.dip) - zl) * dipAmt;
      if (t >= 1) flight = null;
    }
  }

  function arc(a, b, k) {
    if (k >= 1) return { type: "LineString", coordinates: [a, b] };
    var ip = d3.geoInterpolate(a, b), pts = [];
    for (var i = 0; i <= 32; i++) pts.push(ip(k * i / 32));
    return { type: "LineString", coordinates: pts };
  }

  function visible(lonlat) { return d3.geoDistance(lonlat, cam.center) < Math.PI / 2 - 0.05; }

  function draw(now) {
    step(now);
    var R = Math.min(W, H) / 2 * 0.94;
    projection.translate([W / 2, H / 2]).scale(R * cam.zoom).rotate([-cam.center[0], -cam.center[1]]);
    ctx.clearRect(0, 0, W, H);

    ctx.beginPath(); path(sphere); ctx.fillStyle = colors.sea; ctx.fill();
    ctx.beginPath(); path(graticule); ctx.strokeStyle = colors.grid; ctx.lineWidth = 1; ctx.stroke();

    if (land) {
      ctx.beginPath(); path(land); ctx.fillStyle = colors.land; ctx.fill();
      detail.forEach(function (f) {
        ctx.beginPath(); path(f); ctx.fillStyle = colors["land-hl"]; ctx.fill();
      });
      ctx.beginPath(); path(borders); ctx.strokeStyle = colors.border; ctx.lineWidth = 0.8; ctx.stroke();
      detail.forEach(function (f) {
        ctx.beginPath(); path(f); ctx.strokeStyle = colors.border; ctx.lineWidth = 0.8; ctx.stroke();
      });
    }

    ctx.beginPath(); path(sphere); ctx.strokeStyle = colors.line; ctx.lineWidth = 1; ctx.stroke();

    // Route: home to Bangalore, then Bangalore to each trip.
    if (!reduce && routeProgress < 1) routeProgress = Math.min(1, routeProgress + 0.006);
    var k1 = easeInOut(Math.min(1, routeProgress * 1.6));
    var k2 = easeInOut(Math.max(0, (routeProgress - 0.55) / 0.45));
    ctx.lineCap = "round";
    ctx.strokeStyle = colors.route;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([]);
    ctx.beginPath(); path(arc(HOME.lonlat, BASE, k1)); ctx.stroke();
    if (k2 > 0) {
      ctx.setLineDash([3, 4]);
      Object.keys(PLACES).forEach(function (key) {
        if (key === "bangalore") return;
        ctx.globalAlpha = active && active !== key ? 0.25 : 0.85;
        ctx.beginPath(); path(arc(BASE, PLACES[key].lonlat, k2)); ctx.stroke();
      });
      ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1;

    // Pins
    function pin(lonlat, isActive, isHome) {
      if (!visible(lonlat)) return null;
      var p = projection(lonlat);
      if (isActive) {
        var pulse = reduce ? 0 : (now / 1400) % 1;
        ctx.beginPath(); ctx.arc(p[0], p[1], 6 + pulse * 16, 0, Math.PI * 2);
        ctx.strokeStyle = colors.route; ctx.globalAlpha = 1 - pulse; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.beginPath(); ctx.arc(p[0], p[1], isActive ? 5 : isHome ? 3.2 : 3.6, 0, Math.PI * 2);
      ctx.fillStyle = isHome ? colors.sea : colors.pin; ctx.fill();
      ctx.lineWidth = isHome ? 1.4 : 2; ctx.strokeStyle = isHome ? colors.pin : colors.sea; ctx.stroke();
      return p;
    }
    pin(HOME.lonlat, false, true);
    var labelAt = null;
    Object.keys(PLACES).forEach(function (key) {
      var p = pin(PLACES[key].lonlat, key === active, false);
      if (key === active) labelAt = p;
    });

    if (labelAt && active) {
      label.textContent = PLACES[active].name;
      label.style.transform = "translate(" + (labelAt[0] + 14).toFixed(1) + "px," + (labelAt[1] - 12).toFixed(1) + "px)";
      label.classList.add("is-on");
    } else {
      label.classList.remove("is-on");
    }

    requestAnimationFrame(draw);
  }

  /* ---------- interaction ---------- */
  var leaveTimer = null;
  function setActive(key) {
    clearTimeout(leaveTimer);
    if (key === active) return;
    active = key;
    list.classList.toggle("has-active", !!key);
    items.forEach(function (it) { it.classList.toggle("is-active", it.getAttribute("data-key") === key); });
    previews.forEach(function (im) { im.classList.toggle("is-on", im.getAttribute("data-key") === key); });
    if (key) flyTo(PLACES[key].lonlat, PLACES[key].zoom);
    else flyTo(OVERVIEW.lonlat, OVERVIEW.zoom);
  }

  var touch = window.matchMedia("(max-width: 900px), (hover: none)").matches;
  if (!touch) {
    items.forEach(function (it) {
      var key = it.getAttribute("data-key");
      it.addEventListener("mouseenter", function () { setActive(key); });
      it.addEventListener("focus", function () { setActive(key); });
    });
    list.addEventListener("mouseleave", function () {
      leaveTimer = setTimeout(function () { setActive(null); }, 500);
    });
    list.addEventListener("focusout", function (e) {
      if (!list.contains(e.relatedTarget)) setActive(null);
    });
  } else if ("IntersectionObserver" in window) {
    // On phones the place under the middle of the screen drives the globe.
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) setActive(e.target.getAttribute("data-key")); });
    }, { rootMargin: "-62% 0px -30% 0px" });
    items.forEach(function (it) { io.observe(it); });
  }

  /* ---------- boot ---------- */
  readColors();
  size();
  window.addEventListener("resize", size);
  window.addEventListener("themechange", readColors);
  requestAnimationFrame(draw);

  Promise.all([
    fetch("assets/geo/countries-110m.json").then(function (r) { return r.json(); }),
    fetch("assets/geo/highlight.json").then(function (r) { return r.json(); })
  ]).then(function (res) {
    var world = res[0], hl = res[1];
    // India, Nepal and Switzerland come from the finer map, so drop their coarse shapes.
    var skip = { "356": 1, "524": 1, "756": 1 };
    var geoms = world.objects.countries.geometries.filter(function (g) { return !skip[g.id]; });
    land = topojson.merge(world, geoms);
    borders = topojson.mesh(world, { type: "GeometryCollection", geometries: geoms }, function (a, b) { return a !== b; });
    detail = Object.keys(hl).map(function (k) { return { type: "Feature", properties: { name: k }, geometry: hl[k] }; });
  }).catch(function () {});

  // Opening move: leave Lausanne and travel to the overview while the route draws.
  setTimeout(function () { if (!active) flyTo(OVERVIEW.lonlat, OVERVIEW.zoom, 2400); }, 500);
})();
