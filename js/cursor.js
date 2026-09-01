/* ==========================================================================
 * cursor.js · 自定义流星鼠标指针系统
 * --------------------------------------------------------------------------
 * 指针本体：#cursorStar —— 纯代码绘制的镂空纤细五角星（流星头部）
 * 流星拖尾：#cursorTrail —— Canvas 半透明渐变拖尾，由粗到细自然淡出
 * 启用条件：仅「真鼠标 + 可悬停」的 PC 环境（pointer:fine & hover:hover）
 * 且用户未开启「减少动态」。移动端/触屏自动禁用，不留任何痕迹。
 * ========================================================================== */
(function () {
  "use strict";

  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!fine || reduced) return; // 不符合条件，直接不启用

  var body = document.body;
  var star = document.getElementById("cursorStar");
  var canvas = document.getElementById("cursorTrail");
  var ctx = canvas.getContext("2d");

  var W = 0, H = 0;
  var cur = { x: innerWidth / 2, y: innerHeight / 2 };
  var tgt = { x: cur.x, y: cur.y };
  var points = [];       // 拖尾采样点队列
  var tailColor = "#35568c";
  var rafId = null;
  var downScale = 1;     // 按下时的轻微缩小

  body.classList.add("cursor-mode");

  /* ---- 尺寸与主题色 ---- */
  function readColor() {
    var c = getComputedStyle(document.documentElement).getPropertyValue("--logo").trim();
    if (c) tailColor = c;
  }
  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  readColor(); resize();

  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("themechange", readColor);

  /* ---- 采样跟随 ---- */
  window.addEventListener("pointermove", function (e) {
    tgt.x = e.clientX; tgt.y = e.clientY;
    var last = points[points.length - 1];
    if (!last || Math.hypot(e.clientX - last.x, e.clientY - last.y) > 2.6) {
      points.push({ x: e.clientX, y: e.clientY, t: performance.now() });
      if (points.length > 26) points.shift();
    }
  }, { passive: true });

  window.addEventListener("pointerdown", function () {
    star.style.opacity = "0.65";
    downScale = 0.86;
  }, { passive: true });
  window.addEventListener("pointerup", function () {
    star.style.opacity = "";
    downScale = 1;
  }, { passive: true });

  /* 移入可点击元素：星形放大提亮 */
  var HOVER_SEL = "a, button, [role=tab], .work-card, .honor-media, .int-chip, .social-link, input, textarea, select, label";
  document.addEventListener("mouseover", function (e) {
    if (e.target.closest(HOVER_SEL)) star.classList.add("hover");
    else star.classList.remove("hover");
  }, { passive: true });

  /* 页面离开时隐藏指针 */
  document.addEventListener("mouseleave", function () { points = []; star.style.opacity = "0"; });
  document.addEventListener("mouseenter", function () { star.style.opacity = ""; });

  /* ---- 主循环：星形缓动跟随 + 拖尾绘制 ---- */
  function loop() {
    rafId = requestAnimationFrame(loop);
    var now = performance.now();

    /* 星形头部：lerp 缓动，悬浮感 */
    cur.x += (tgt.x - cur.x) * 0.24;
    cur.y += (tgt.y - cur.y) * 0.24;
    star.style.transform = "translate3d(" + cur.x.toFixed(1) + "px," + cur.y.toFixed(1) + "px,0) scale(" + downScale + ")";

    /* 拖尾：过期点清理 + 渐变绘制（透明度整体 30%–50%） */
    while (points.length && now - points[0].t > 150) points.shift();
    ctx.clearRect(0, 0, W, H);
    if (points.length > 1) {
      var i, p, prev, prog;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (i = 1; i < points.length; i++) {
        prev = points[i - 1]; p = points[i];
        prog = i / points.length;                       // 越靠近头部越实
        ctx.strokeStyle = "rgba(" + hexToRgb(tailColor) + "," + (prog * 0.46).toFixed(3) + ")";
        ctx.lineWidth = 0.8 + prog * 2.4;               // 由细到粗
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
    }
  }

  /* 将 #rrggbb 转为 "r,g,b" 供 rgba 拼接 */
  function hexToRgb(hex) {
    var m = hex.replace("#", "");
    if (m.length === 3) m = m[0] + m[0] + m[1] + m[1] + m[2] + m[2];
    var n = parseInt(m, 16);
    return ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255);
  }

  rafId = requestAnimationFrame(loop);

  /* 页面不可见时暂停循环，避免空转耗电 */
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { if (rafId) cancelAnimationFrame(rafId); rafId = null; }
    else if (!rafId) rafId = requestAnimationFrame(loop);
  });
})();