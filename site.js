/* Shared by every page: open each page at the top, and the dock's back button. */
(function () {
  // A new page always opens at its top (unless the link points to an anchor).
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  if (!location.hash) window.scrollTo(0, 0);
  window.addEventListener("pageshow", function (e) {
    if (e.persisted && !location.hash) window.scrollTo(0, 0);
  });

  // Back: return to the previous page of this site, otherwise to the page one level up.
  var back = document.querySelector(".dock-back");
  if (!back) return;
  back.addEventListener("click", function () {
    var fallback = back.getAttribute("data-fallback") || "index.html";
    var fromHere = false;
    try { fromHere = document.referrer && new URL(document.referrer).origin === location.origin; } catch (e) {}
    if (fromHere && history.length > 1) history.back();
    else location.href = fallback;
  });
})();
