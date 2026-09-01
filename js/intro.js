/* ==========================================================================
 * intro.js · 网站开场动画（Z-shaped Meteor Logo / 张海宁专属流星符号）
 * --------------------------------------------------------------------------
 * 流程（总时长约 2.1s，克制不拖沓）：
 *   ① 深空暗幕中，流星从左上方划入，轨迹逐段画出 Z 字流星符号（约 0.9s）
 *   ② 符号在屏幕中央停留、轻发光，星尘粒子迸发（约 0.6s）
 *   ③ 拖尾向头部收敛，符号顺势飞入导航栏 Logo 位置（约 0.5s）
 *   ④ 收尾：首屏内容（含「张海宁 / Hayden Zhang」）依次显现
 * 保护策略：prefers-reduced-motion 时直接跳过；任何异常都会兜底显示首屏，
 *           保证姓名永远不会因动画问题而丢失。
 * ========================================================================== */
(function () {
  "use strict";

  var intro = document.getElementById("intro");
  var stage = document.getElementById("introStage");
  var path = document.getElementById("introPath");
  var head = document.getElementById("introHead");
  var spark = document.getElementById("introSpark");
  var halo = document.getElementById("introHalo");
  var veil = intro ? intro.querySelector(".intro-veil") : null;
  var navLogo = document.getElementById("navLogo");

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finished = false;
  var DUR = { draw: 900, hold: 420, converge: 320, fly: 520 };

  function rafP(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  /* 让头部星点与四射光芒跟随轨迹顶点 */
  function placeHead(px, py) {
    head.setAttribute("cx", px);
    head.setAttribute("cy", py);
    spark.setAttribute("d", "M" + px + " " + (py - 8) + " v16 M" + (px - 8) + " " + py + " h16");
  }

  /* 符号形成瞬间：向四周迸发的星尘粒子 */
  function spawnDust(n) {
    for (var i = 0; i < n; i++) {
      var d = document.createElement("span");
      d.className = "intro-dot";
      var ang = Math.random() * Math.PI * 2;
      var dist = 30 + Math.random() * 50;
      d.style.setProperty("--dx", (Math.cos(ang) * dist).toFixed(1) + "px");
      d.style.setProperty("--dy", (Math.sin(ang) * dist).toFixed(1) + "px");
      stage.appendChild(d);
      setTimeout(function () { d.remove(); }, 1100);
    }
  }

  /* 收尾：解锁滚动、显示首屏内容 */
  function finish() {
    if (finished) return;
    finished = true;
    document.documentElement.classList.remove("no-scroll");
    document.body.classList.remove("intro-active");
    document.body.classList.add("intro-done");
    if (intro) intro.style.display = "none";
  }

  async function play() {
    if (!path || !stage) return finish();
    try {
      var L = path.getTotalLength();
      path.style.strokeDasharray = L;
      path.style.strokeDashoffset = L;
      head.style.opacity = "0";
      spark.style.opacity = "0";

      /* ---- ① 流星划过，画出 Z 字轨迹（rAF 步进，头部星点同步滑动） ---- */
      await new Promise(function (resolve) {
        var t0 = performance.now();
        function step(ts) {
          var p = Math.min(1, (ts - t0) / DUR.draw);
          var e = easeOut(p);
          path.style.strokeDashoffset = String(L * (1 - e));
          var pt = path.getPointAtLength(L * e);
          placeHead(pt.x, pt.y);
          if (e > 0.12) { head.style.opacity = "1"; spark.style.opacity = "0.95"; }
          if (p < 1) requestAnimationFrame(step);
          else resolve();
        }
        requestAnimationFrame(step);
      });

      /* ---- ② 停留 + 发光 + 星尘 ---- */
      halo.classList.add("on");
      spawnDust(7);
      head.setAttribute("r", "3.2");
      spark.animate(
        [{ opacity: 0.95 }, { opacity: 0.2 }, { opacity: 0.95 }],
        { duration: 260, iterations: 2 }
      );
      await rafP(DUR.hold);

      /* ---- ③ 拖尾向头部收敛（亮段滑向流星头部） ---- */
      path.style.strokeDasharray = (L * 0.32) + " " + L;
      await path.animate(
        [{ strokeDashoffset: "0px" }, { strokeDashoffset: (-L * 0.68) + "px" }],
        { duration: DUR.converge, easing: "cubic-bezier(.65,.05,.8,.55)", fill: "forwards" }
      ).finished;

      /* ---- ④ 飞入导航栏 Logo 位置，与页面底色融合 ---- */
      var sr = stage.getBoundingClientRect();
      var lr = navLogo ? navLogo.getBoundingClientRect() : { left: 0, top: 0, width: 24, height: 24 };
      var dx = (lr.left || 40) + lr.width / 2 - (sr.left + sr.width / 2);
      var dy = lr.top + lr.height / 2 - (sr.top + sr.height / 2);
      var s = Math.max(0.08, Math.min(lr.width / sr.width, lr.height / sr.height) * 1.02);

      if (veil) veil.style.opacity = "1"; // 星幕与页面背景自然过渡
      await stage.animate(
        [
          { transform: "translate3d(0,0,0) scale(1)" },
          { transform: "translate3d(" + dx + "px," + dy + "px,0) scale(" + s.toFixed(3) + ")" }
        ],
        { duration: DUR.fly, easing: "cubic-bezier(.45,.05,.26,1)" }
      ).finished;

      /* ---- ⑤ 淡出收尾：首屏显现 + 导航 Logo 弹入 ---- */
      halo.classList.remove("on");
      intro.classList.remove("play");
      intro.style.opacity = "0";
      await rafP(320);

      /* 还原，避免二次播放残留样式 */
      path.style.strokeDasharray = "";
      path.style.strokeDashoffset = "";
      head.setAttribute("r", "2.6");
      head.style.opacity = "";
      spark.style.opacity = "";
      if (veil) veil.style.opacity = "0";
      finish();

      if (navLogo && !reduced) {
        navLogo.animate(
          [
            { transform: "scale(.25)", opacity: 0 },
            { transform: "scale(1)", opacity: 1 }
          ],
          { duration: 460, easing: "cubic-bezier(.3,1.45,.6,1)" }
        );
      }
    } catch (err) {
      /* 动画异常兜底：直接显示首屏，绝不影响姓名展示 */
      finish();
    }
  }

  function start() {
    if (reduced || !intro || !path) { finish(); return; }

    document.documentElement.classList.add("no-scroll");
    document.body.classList.add("intro-active");
    intro.classList.add("play");

    /* 播放期间窗口尺寸突变时提前收尾，保证符号落点正确 */
    var onResize = function () { finish(); window.removeEventListener("resize", onResize); };
    window.addEventListener("resize", onResize);

    play().then(function () {
      window.removeEventListener("resize", onResize);
    });
  }

  /* 等待首帧绘制后开始（load 已发生则直接开始） */
  if (document.readyState === "complete") setTimeout(start, 60);
  else window.addEventListener("load", function () { setTimeout(start, 60); });
})();