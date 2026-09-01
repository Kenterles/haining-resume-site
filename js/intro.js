/* ==========================================================================
 * intro.js · 网站开场动画（Z-shaped Meteor Logo / 张海宁专属流星符号）
 * --------------------------------------------------------------------------
 * 流程（总时长约 2.1s）：
 *   ① 流星从左上方划入，轨迹逐段画出 Z 字流星符号（约 0.9s，rAF 步进）
 *   ② 符号停留、轻发光，星尘粒子迸发（约 0.6s，CSS 闪烁）
 *   ③ 拖尾向头部收敛（约 0.32s，rAF 步进）
 *   ④ 符号飞入导航栏 Logo 位置（约 0.52s，CSS transition）
 *   ⑤ 收尾：首屏依次显现 + 导航 Logo 弹入
 * 说明：动画全程使用 rAF + CSS transition，不依赖 Web Animations API，
 *       以保证在低性能 / 旧内核设备上也能可靠播放；异常时兜底显示首屏。
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

  /* 收尾：解锁滚动、显示首屏内容，并通知 BGM 弹窗可弹出 */
  function finish() {
    if (finished) return;
    finished = true;
    document.documentElement.classList.remove("no-scroll");
    document.body.classList.remove("intro-active");
    document.body.classList.add("intro-done");
    if (intro) intro.style.display = "none";
    window.dispatchEvent(new CustomEvent("intro:done"));
  }

  async function play() {
    if (!path || !stage) return finish();
    try {
      var L = path.getTotalLength() || 80;
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
          if (pt) placeHead(pt.x, pt.y);
          if (e > 0.12) { head.style.opacity = "1"; spark.style.opacity = "0.95"; }
          if (p < 1) requestAnimationFrame(step);
          else resolve();
        }
        requestAnimationFrame(step);
      });

      /* ---- ② 停留 + 发光 + 星尘（CSS 闪烁两下） ---- */
      halo.classList.add("on");
      spawnDust(7);
      head.setAttribute("r", "3.2");
      spark.classList.add("blink");
      await rafP(DUR.hold);
      spark.classList.remove("blink");

      /* ---- ③ 拖尾向头部收敛（亮段滑向流星头部，rAF 步进） ---- */
      path.style.strokeDasharray = (L * 0.32) + " " + L;
      await new Promise(function (resolve) {
        var t0 = performance.now();
        function step(ts) {
          var p = Math.min(1, (ts - t0) / DUR.converge);
          path.style.strokeDashoffset = (-L * 0.68 * p) + "px";
          if (p < 1) requestAnimationFrame(step);
          else resolve();
        }
        requestAnimationFrame(step);
      });

      /* ---- ④ 飞入导航栏 Logo 位置（CSS transition） ---- */
      var sr = stage.getBoundingClientRect();
      var lr = navLogo ? navLogo.getBoundingClientRect() : { left: 0, top: 0, width: 24, height: 24 };
      var dx = (lr.left || 40) + lr.width / 2 - (sr.left + sr.width / 2);
      var dy = lr.top + lr.height / 2 - (sr.top + sr.height / 2);
      var s = Math.max(0.08, Math.min(lr.width / sr.width, lr.height / sr.height) * 1.02);

      if (veil) veil.style.opacity = "1"; // 星幕与页面背景自然过渡
      stage.style.transition = "none";
      stage.style.transform = "translate3d(0,0,0) scale(1)";
      void stage.offsetHeight;            // 强制回流，确保过渡从初始态开始
      stage.style.transition = "transform " + (DUR.fly / 1000).toFixed(3) + "s cubic-bezier(.45,.05,.26,1)";
      stage.style.transform = "translate3d(" + dx + "px," + dy + "px,0) scale(" + s.toFixed(3) + ")";
      await rafP(DUR.fly + 40);

      /* ---- ⑤ 淡出收尾：首屏显现 + 导航 Logo 弹入 ---- */
      halo.classList.remove("on");
      intro.classList.remove("play");
      intro.style.opacity = "0";
      await rafP(320);

      path.style.strokeDasharray = "";
      path.style.strokeDashoffset = "";
      head.setAttribute("r", "2.6");
      head.style.opacity = "";
      spark.style.opacity = "";
      if (veil) veil.style.opacity = "0";
      stage.style.transition = "";
      stage.style.transform = "";
      finish();

      if (navLogo) {
        navLogo.style.transition = "none";
        navLogo.style.transform = "scale(.25)";
        navLogo.style.opacity = "0";
        void navLogo.offsetHeight;
        navLogo.style.transition = "transform .46s cubic-bezier(.3,1.45,.6,1), opacity .46s ease";
        navLogo.style.transform = "scale(1)";
        navLogo.style.opacity = "1";
        setTimeout(function () {
          navLogo.style.transition = "";
          navLogo.style.transform = "";
          navLogo.style.opacity = "";
        }, 520);
      }
    } catch (err) {
      finish();
    }
  }

  function start() {
    if (!intro || !path) { finish(); return; }

    document.documentElement.classList.add("no-scroll");
    document.body.classList.add("intro-active");
    intro.classList.add("play");

    var onResize = function () { finish(); window.removeEventListener("resize", onResize); };
    window.addEventListener("resize", onResize);

    play().then(function () {
      window.removeEventListener("resize", onResize);
    });
  }

  /* 尽早启动：DOM 就绪即播，首帧渲染后开始 */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      requestAnimationFrame(start);
    });
  } else {
    requestAnimationFrame(start);
  }
})();