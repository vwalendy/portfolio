/* Intro background: a slowly turning spiral of particles.
   Near the pointer, particles are pushed aside and bond to each other like molecules. */
(function () {
  var host = document.querySelector(".ab-intro");
  if (!host || !window.HTMLCanvasElement) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canvas = document.createElement("canvas");
  canvas.className = "ab-bg";
  canvas.setAttribute("aria-hidden", "true");
  host.insertBefore(canvas, host.firstChild);
  var ctx = canvas.getContext("2d");

  var W = 0, H = 0, dpr = 1, cx = 0, cy = 0, scale = 1;
  var parts = [];
  var mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999, active: false };
  var tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  var running = false, visible = true, last = 0;

  var INK = [214, 214, 214];
  var TEAL = [38, 159, 149];
  var SAND = [168, 157, 137];

  function rand(a, b) { return a + Math.random() * (b - a); }
  function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; }

  function build() {
    var rect = host.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width; H = rect.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var narrow = W < 900;
    cx = narrow ? W * 0.62 : W * 0.82;
    cy = narrow ? H * 0.7 : H * 0.52;
    scale = Math.max(W, H) * (narrow ? 0.62 : 0.5);

    var count = Math.round(Math.min(1500, (W * H) / 850));
    parts = [];
    var ARMS = 3;
    for (var i = 0; i < count; i++) {
      var halo = Math.random() < 0.22;
      var r = halo ? rand(0.05, 1.15) : Math.pow(Math.random(), 0.7) * 0.95;
      var arm = (i % ARMS) * (Math.PI * 2 / ARMS);
      var a = halo ? rand(0, Math.PI * 2) : arm + r * 3.4 + gauss() * (0.28 + r * 0.25);
      var tone = Math.random();
      parts.push({
        r: r,
        a: a,
        flat: halo ? rand(0.55, 0.9) : 0.62,      // ellipse squash: a tilted disc
        speed: (0.018 + 0.05 / (0.25 + r)) * (halo ? 0.5 : 1),
        size: halo ? rand(0.6, 1.2) : rand(0.8, 2.1) * (1.25 - r * 0.5),
        alpha: halo ? rand(0.18, 0.4) : rand(0.35, 0.9) * (1.15 - r * 0.55),
        col: tone < 0.07 ? TEAL : tone < 0.25 ? SAND : INK,
        ox: 0, oy: 0, vx: 0, vy: 0,                 // displacement from the pointer
        x: 0, y: 0
      });
    }
  }

  function frame(t) {
    var dt = Math.min(0.05, (t - (last || t)) / 1000);
    last = t;

    mouse.x += (mouse.tx - mouse.x) * 0.18;
    mouse.y += (mouse.ty - mouse.y) * 0.18;
    tilt.x += (tilt.tx - tilt.x) * 0.04;
    tilt.y += (tilt.ty - tilt.y) * 0.04;

    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";
    // soft core glow
    var core = ctx.createRadialGradient(cx + tilt.x * 40, cy + tilt.y * 28, 0, cx + tilt.x * 40, cy + tilt.y * 28, scale * 0.45);
    core.addColorStop(0, "rgba(168,157,137,0.16)");
    core.addColorStop(0.35, "rgba(38,159,149,0.05)");
    core.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = core;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";

    // The whole disc leans toward the pointer a little.
    var gx = cx + tilt.x * 40, gy = cy + tilt.y * 28;
    var rot = -0.35 + tilt.x * 0.08;
    var cr = Math.cos(rot), sr = Math.sin(rot);
    var R = 170, R2 = R * R;
    var near = [];

    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (!reduce) p.a += p.speed * dt;
      var ex = Math.cos(p.a) * p.r * scale;
      var ey = Math.sin(p.a) * p.r * scale * p.flat * (1 + tilt.y * 0.12);
      var bx = gx + ex * cr - ey * sr;
      var by = gy + ex * sr + ey * cr;

      // pointer pushes particles aside; a spring pulls them home
      var dx = bx + p.ox - mouse.x, dy = by + p.oy - mouse.y;
      var d2 = dx * dx + dy * dy;
      if (mouse.active && d2 < R2) {
        var d = Math.sqrt(d2) || 1, f = (1 - d / R);
        p.vx += (dx / d) * f * f * 420 * dt;
        p.vy += (dy / d) * f * f * 420 * dt;
      }
      p.vx += -p.ox * 6 * dt; p.vy += -p.oy * 6 * dt;
      p.vx *= 0.9; p.vy *= 0.9;
      p.ox += p.vx * dt * 10; p.oy += p.vy * dt * 10;

      p.x = bx + p.ox; p.y = by + p.oy;
      if (p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) continue;

      var glow = 0;
      if (mouse.active && d2 < R2 * 1.6) { glow = 1 - d2 / (R2 * 1.6); near.push(p); }
      var al = Math.min(1, p.alpha + glow * 0.5);
      ctx.fillStyle = "rgba(" + p.col[0] + "," + p.col[1] + "," + p.col[2] + "," + al.toFixed(3) + ")";
      var s = p.size + glow * 0.9;
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }

    // Molecular bonds between particles around the pointer.
    if (near.length) {
      var L = 64, L2 = L * L;
      ctx.lineWidth = 0.6;
      for (var a = 0; a < near.length; a++) {
        var pa = near[a], links = 0;
        for (var b = a + 1; b < near.length && links < 4; b++) {
          var pb = near[b];
          var lx = pa.x - pb.x, ly = pa.y - pb.y, l2 = lx * lx + ly * ly;
          if (l2 < L2) {
            var o = (1 - l2 / L2) * 0.38;
            var tint = pa.col === TEAL || pb.col === TEAL ? TEAL : INK;
            ctx.strokeStyle = "rgba(" + tint[0] + "," + tint[1] + "," + tint[2] + "," + o.toFixed(3) + ")";
            ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
            links++;
          }
        }
      }
    }

    if (running && visible && !reduce) requestAnimationFrame(frame);
    else running = false;
  }

  function start() {
    if (running || reduce) return;
    running = true; last = 0;
    requestAnimationFrame(frame);
  }

  function pointer(x, y) {
    var r = canvas.getBoundingClientRect();
    mouse.tx = x - r.left; mouse.ty = y - r.top;
    if (!mouse.active) { mouse.x = mouse.tx; mouse.y = mouse.ty; }
    mouse.active = true;
    tilt.tx = (x / window.innerWidth - 0.5) * 2;
    tilt.ty = (y / window.innerHeight - 0.5) * 2;
    if (reduce) frame(performance.now());
  }

  window.addEventListener("pointermove", function (e) { pointer(e.clientX, e.clientY); }, { passive: true });
  document.addEventListener("pointerleave", function () { mouse.active = false; tilt.tx = tilt.ty = 0; });
  window.addEventListener("resize", function () { build(); if (reduce) frame(performance.now()); });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible) start();
    }).observe(host);
  }

  build();
  if (reduce) frame(performance.now()); else start();
})();
