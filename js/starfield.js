/* ==========================================================================
 * starfield.js · 沉浸式多层星空动态背景
 * --------------------------------------------------------------------------
 * 三层视差结构：
 *   底层：深空渐变 + 弥散星云（由 #sky / .nebula 的 CSS 层实现，呼吸式漂移）
 *   中层：中密度随机闪烁星点（随滚动轻微视差）
 *   顶层：少量高亮星点缓慢漂移（随鼠标轻微视差）+ 偶发划过的流星
 * 性能策略：
 *   - DPR 上限 2，帧率监控自动降级（低性能设备自动转为低频/静态渲染）
 *   - 页面不可见时暂停 rAF；移动端自动降级为静态渲染
 * ========================================================================== */
(function () {
  "use strict";

  var canvas = document.getElementById("starfield");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");

  var coarse = window.matchMedia("(pointer: coarse)").matches;
  var staticMode = coarse; // 静态模式（移动端）：绘制一次，事件触发时重绘

  var W = 0, H = 0, DPR = 1;
  var stars = [];   // 中层闪烁星点
  var bright = [];  // 顶层漂移亮星
  var meteors = []; // 偶发流星
  var rafId = null, running = false;
  var lowPerf = false, slowFrames = 0;
  var lastTs = 0, startTs = performance.now();
  var scrollY = 0, ptrX = 0, ptrY = 0, hasPtr = false;
  var nextMeteorAt = 0;
  var resizeTimer = null;

  /* 主题色透明度基数：浅色弱化星点，深色全亮 */
  function envAlpha() {
    return document.documentElement.classList.contains("dark") ? 1 : 0.55;
  }

  /* 随机工具 */
  function rand(a, b) { return a + Math.random() * (b - a); }
  function wrap(v, m) { return ((v % m) + m) % m; }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  /* ---- 星点工厂 ---- */
  function makeMidStar() {
    return {
      x: rand(0, 1), y: rand(0, 1),
      r: rand(0.35, 1.45),
      phase: rand(0, Math.PI * 2),
      speed: rand(0.35, 1.7),        // 闪烁速度（rad/s）
      base: rand(0.22, 0.85),        // 基础亮度
      warm: Math.random() < 0.1      // 少量暖白星
    };
  }
  var TOP_COLORS = ["#cfe1ff", "#e8f0ff", "#9fc3ff", "#dcd6ff"];
  function makeTopStar() {
    return {
      x: rand(0, 1), y: rand(0, 1),
      r: rand(0.8, 2.05),
      phase: rand(0, Math.PI * 2),
      speed: rand(0.15, 0.6),
      base: rand(0.5, 1),
      vx: rand(-0.5, 0.5), vy: rand(-0.35, 0.35), // 单位：%视口/秒，极慢漂移
      color: TOP_COLORS[(Math.random() * TOP_COLORS.length) | 0]
    };
  }

  /* ---- 数量控制（含性能降级） ---- */
  function build() {
    var area = W * H;
    var factor = coarse ? 0.55 : 1;
    if (lowPerf) factor *= 0.55;
    var midN = clamp(Math.round((area / 9000) * factor), 40, 200);
    var topN = Math.max(6, Math.round(midN * 0.13));
    stars = []; bright = [];
    for (var i = 0; i < midN; i++) stars.push(makeMidStar());
    for (var j = 0; j < topN; j++) bright.push(makeTopStar());
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, lowPerf ? 1.5 : 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    build();
    draw();
  }

  /* ---- 渲染 ---- */
  function draw() {
    if (!W) return;
    ctx.clearRect(0, 0, W, H);
    var t = (performance.now() - startTs) / 1000;
    var env = envAlpha();
    var dark = document.documentElement.classList.contains("dark");
    var midOff = scrollY * 0.03;                 // 中层随滚动视差
    var topOffY = scrollY * 0.055;               // 顶层视差更大
    var topOffX = hasPtr ? ptrX * 10 : 0;
    var topOffPy = hasPtr ? ptrY * 8 : 0;
    var i, s, x, y, a;

    /* 中层：随机闪烁星点 */
    ctx.fillStyle = dark ? "#eaf1ff" : "#5c7aa6";
    for (i = 0; i < stars.length; i++) {
      s = stars[i];
      y = wrap(s.y * H - midOff, H);
      x = wrap(s.x * W, W);
      a = s.base * (0.62 + 0.38 * Math.sin(t * s.speed + s.phase)) * env;
      if (a < 0.02) continue;
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(x, y, s.r, 0, 6.2832);
      ctx.fill();
    }

    /* 顶层：高亮漂移星（外圈光晕 + 内芯） */
    var dt = clamp((performance.now() - lastTs) / 1000, 0, 0.05) || 0.016;
    for (i = 0; i < bright.length; i++) {
      s = bright[i];
      s.x = wrap(s.x + (s.vx * dt) / 100, 1);
      s.y = wrap(s.y + (s.vy * dt) / 100, 1);
      y = wrap(s.y * H - topOffY - topOffPy, H);
      x = wrap(s.x * W - topOffX, W);
      a = s.base * (0.72 + 0.28 * Math.sin(t * s.speed + s.phase)) * env;
      ctx.globalAlpha = a * 0.22;
      ctx.fillStyle = s.color;
      ctx.beginPath(); ctx.arc(x, y, s.r * 2.5, 0, 6.2832); ctx.fill();
      ctx.globalAlpha = a;
      ctx.beginPath(); ctx.arc(x, y, s.r, 0, 6.2832); ctx.fill();
    }

    /* 偶发流星（浅色弱化、深色明显） */
    if (!staticMode) {
      if (performance.now() > nextMeteorAt) {
        meteors.push({
          x: rand(0.05, 0.9) * W, y: rand(-0.1, 0.25) * H,
          vx: rand(280, 480), vy: rand(120, 220),
          life: 0, max: rand(0.7, 1.15),
          tail: rand(70, 130)
        });
        nextMeteorAt = performance.now() + rand(4500, 11000);
      }
      for (i = meteors.length - 1; i >= 0; i--) {
        var m = meteors[i];
        m.life += dt;
        if (m.life >= m.max) { meteors.splice(i, 1); continue; }
        var hx = m.x + m.vx * m.life, hy = m.y + m.vy * m.life;
        var tx = hx - m.vx * (m.tail / 900), ty = hy - m.vy * (m.tail / 900);
        var prog = m.life / m.max;
        var mAlpha = Math.min(1, prog * 6) * (1 - prog) * env * 0.85;
        var grad = ctx.createLinearGradient(hx, hy, tx, ty);
        grad.addColorStop(0, "rgba(255,255,255," + mAlpha + ")");
        grad.addColorStop(1, "rgba(190,215,255,0)");
        ctx.globalAlpha = 1;
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.3;
        ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
        ctx.globalAlpha = mAlpha;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath(); ctx.arc(hx, hy, 1.4, 0, 6.2832); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  /* ---- 主循环（帧率监控与自动降级） ---- */
  function loop(ts) {
    rafId = requestAnimationFrame(loop);
    var dt = ts - lastTs;
    lastTs = ts;
    if (dt > 45) { slowFrames++; if (slowFrames > 120 && !lowPerf) { lowPerf = true; resize(); } }
    else slowFrames = Math.max(0, slowFrames - 1);
    draw();
  }

  function start() {
    if (running) return;
    if (staticMode) { draw(); return; }
    running = true;
    lastTs = performance.now();
    rafId = requestAnimationFrame(loop);
  }
  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  /* ---- 事件绑定（全部 passive，避免影响滚动性能） ---- */
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 160);
  }, { passive: true });

  window.addEventListener("scroll", function (e) {
    scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    if (staticMode) draw();
  }, { passive: true });

  if (!coarse) {
    window.addEventListener("pointermove", function (e) {
      ptrX = e.clientX - W / 2; ptrY = e.clientY - H / 2; hasPtr = true;
    }, { passive: true });
  }

  /* 主题切换后立即重绘，保证透明度与色调同步 */
  window.addEventListener("themechange", function () {
    if (staticMode) draw();
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop(); else start();
  });

  /* 初始化（等待首帧布局稳定） */
  if (document.readyState === "complete") { resize(); start(); }
  else window.addEventListener("load", function () { resize(); start(); });
})();