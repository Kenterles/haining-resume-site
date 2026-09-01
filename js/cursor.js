/* ==========================================================================
 * cursor.js · 流星指针系统（桌面鼠标 + 移动触屏双端一致）
 * --------------------------------------------------------------------------
 * 指针本体：#cursorStar —— 纯代码绘制的镂空纤细五角星（流星头部）
 * 拖尾  ：#cursorTrail —— 柔和渐变尾迹 + 沿路散落的星尘粒子（非单一实线）
 * 桌面端：跟随鼠标移动，移入可点击元素时放大提亮，隐藏系统光标
 * 移动端：跟随手指滑动，松手后星形淡出、尾迹与星尘自然消散
 * ========================================================================== */
(function () {
  "use strict";

  var star = document.getElementById("cursorStar");
  var canvas = document.getElementById("cursorTrail");
  if (!star || !canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");

  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var coarse = window.matchMedia("(pointer: coarse)").matches;

  var body = document.body;
  var W = 0, H = 0;
  var cur = { x: innerWidth / 2, y: innerHeight / 2 };
  var tgt = { x: cur.x, y: cur.y };
  var points = [];       // 拖尾主体采样点队列
  var particles = [];    // 星尘粒子（拖尾光点）
  var tailColor = "#35568c";
  var rafId = null;
  var downScale = 1;     // 按下时的轻微缩小
  var lastInputAt = 0;   // 最近一次有效输入时间（触屏用于淡出）

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

  /* 将 #rrggbb 转为 "r,g,b" 供 rgba 拼接 */
  function hexToRgb(hex) {
    var m = hex.replace("#", "");
    if (m.length === 3) m = m[0] + m[0] + m[1] + m[1] + m[2] + m[2];
    var n = parseInt(m, 16);
    return ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255);
  }

  /* 采样一个轨迹点 + 沿途撒落几颗星尘粒子 */
  function pushPoint(x, y) {
    var last = points[points.length - 1];
    if (!last || Math.hypot(x - last.x, y - last.y) > 2.6) {
      points.push({ x: x, y: y, t: performance.now() });
      if (points.length > 26) points.shift();
      var n = Math.random() < 0.4 ? 2 : 1;   // 偶尔多撒一颗，更丰富
      for (var k = 0; k < n; k++) {
        if (particles.length >= 80) break;
        particles.push({
          x: x + (Math.random() * 8 - 4),
          y: y + (Math.random() * 8 - 4),
          vx: (Math.random() - 0.5) * 0.7,
          vy: (Math.random() - 0.5) * 0.7 - 0.12,
          r: Math.random() * 1.5 + 0.6,
          life: 1,
          decay: Math.random() * 0.028 + 0.018
        });
      }
    }
  }

  /* ================= 桌面端：鼠标指针 ================= */
  if (fine) {
    body.classList.add("cursor-mode");

    window.addEventListener("pointermove", function (e) {
      tgt.x = e.clientX; tgt.y = e.clientY;
      lastInputAt = performance.now();
      star.style.opacity = "1";
      pushPoint(e.clientX, e.clientY);
    }, { passive: true });

    window.addEventListener("pointerdown", function () {
      star.style.opacity = "0.65"; downScale = 0.86;
    }, { passive: true });
    window.addEventListener("pointerup", function () {
      star.style.opacity = "1"; downScale = 1;
    }, { passive: true });

    var HOVER_SEL = "a, button, [role=tab], .work-card, .honor-media, .int-chip, .social-link, input, textarea, select, label";
    document.addEventListener("mouseover", function (e) {
      if (e.target.closest(HOVER_SEL)) star.classList.add("hover");
      else star.classList.remove("hover");
    }, { passive: true });

    document.addEventListener("mouseleave", function () { points = []; particles = []; star.style.opacity = "0"; });
    document.addEventListener("mouseenter", function () { star.style.opacity = "1"; });
  }

  /* ================= 移动端：触屏流星 ================= */
  if (coarse) {
    function onTouch(e) {
      if (!e.touches || !e.touches.length) return;
      var t = e.touches[0];
      tgt.x = t.clientX; tgt.y = t.clientY;
      lastInputAt = performance.now();
      star.style.opacity = "1";
      downScale = 0.9;
      pushPoint(t.clientX, t.clientY);
    }
    function onTouchEnd() {
      downScale = 1;
      star.style.opacity = "0";   // 松手后星形淡出
    }
    document.addEventListener("touchstart", onTouch, { passive: true });
    document.addEventListener("touchmove", onTouch, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("touchcancel", onTouchEnd, { passive: true });
  }

  /* ---- 主循环：星形缓动跟随 + 尾迹/星尘绘制（双端共用） ---- */
  function loop() {
    rafId = requestAnimationFrame(loop);
    var now = performance.now();

    /* 星形头部：lerp 缓动，悬浮感 */
    cur.x += (tgt.x - cur.x) * 0.24;
    cur.y += (tgt.y - cur.y) * 0.24;
    star.style.transform = "translate3d(" + cur.x.toFixed(1) + "px," + cur.y.toFixed(1) + "px,0) scale(" + downScale + ")";

    /* 触屏松手后：若长时间无输入，清空轨迹与星尘 */
    if (coarse && now - lastInputAt > 180) {
      points.length = 0;
      particles.length = 0;
    }

    /* 过期点清理 */
    while (points.length && now - points[0].t > 150) points.shift();
    ctx.clearRect(0, 0, W, H);

    /* ① 柔和渐变尾迹：主体光带，由细到粗、越近头部越实 */
    if (points.length > 1) {
      var i, p, prev, prog;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (i = 1; i < points.length; i++) {
        prev = points[i - 1]; p = points[i];
        prog = i / points.length;
        ctx.strokeStyle = "rgba(" + hexToRgb(tailColor) + "," + (prog * 0.3).toFixed(3) + ")";
        ctx.lineWidth = 0.6 + prog * 1.8;
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
    }

    /* ② 星尘粒子：沿途光点缓慢飘散、渐隐，带轻光晕 */
    for (var pi = particles.length - 1; pi >= 0; pi--) {
      var pt = particles[pi];
      pt.x += pt.vx; pt.y += pt.vy; pt.life -= pt.decay;
      if (pt.life <= 0) { particles.splice(pi, 1); continue; }
      var a = pt.life;
      ctx.fillStyle = tailColor;
      ctx.globalAlpha = a * 0.55;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r * 2.2, 0, 6.2832);   // 外圈光晕
      ctx.fill();
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r, 0, 6.2832);          // 内核亮点
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  rafId = requestAnimationFrame(loop);

  /* 页面不可见时暂停循环，避免空转耗电 */
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { if (rafId) cancelAnimationFrame(rafId); rafId = null; }
    else if (!rafId) { rafId = requestAnimationFrame(loop); }
  });
})();