/* ==========================================================================
 * main.js · 全站交互主逻辑
 * 覆盖：主题切换 / 导航联动 / 滚动淡入 / 问候语 / 3D 标签云 / 作品分类 /
 *       大图预览 / 幕后故事 / 复制与 Toast / 打招呼弹窗 / 点亮星星 /
 *       回到顶部进度 / 底部彩蛋 / 双击流星雨 / 背景音乐（程序化生成）
 * ========================================================================== */
(function () {
  "use strict";

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function storageGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function storageSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* 隐私模式下静默 */ } }

  /* ================================================================
   * 1. 深浅主题切换（持久化 + 跟随系统偏好）
   * ================================================================ */
  var metaTheme = $('meta[name="theme-color"]');
  function applyTheme(dark, save) {
    document.documentElement.classList.toggle("dark", dark);
    if (metaTheme) metaTheme.setAttribute("content", dark ? "#05070f" : "#f5f8fd");
    if (save) storageSet("zm-theme", dark ? "dark" : "light");
    window.dispatchEvent(new CustomEvent("themechange"));
  }
  (function initTheme() {
    var stored = storageGet("zm-theme");
    var dark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(dark, false);
  })();
  var themeBtn = $("#themeToggle");
  if (themeBtn) themeBtn.addEventListener("click", function () {
    applyTheme(!document.documentElement.classList.contains("dark"), true);
  });

  /* ================================================================
   * 2. 导航：滚动磨砂、汉堡菜单、滚动高亮
   * ================================================================ */
  var topbar = $("#topbar");
  var menuBtn = $("#menuBtn");
  var mobileMenu = $("#mobileMenu");
  var isMenuOpen = false;

  window.addEventListener("scroll", function () {
    var y = window.scrollY || document.documentElement.scrollTop || 0;
    if (topbar) topbar.classList.toggle("is-scrolled", y > 12);
    updateBackTop();
  }, { passive: true });

  function toggleMenu(force) {
    isMenuOpen = typeof force === "boolean" ? force : !isMenuOpen;
    mobileMenu.classList.toggle("open", isMenuOpen);
    menuBtn.setAttribute("aria-expanded", String(isMenuOpen));
  }
  if (menuBtn) menuBtn.addEventListener("click", function () { toggleMenu(); });
  $$("a", mobileMenu).forEach(function (a) {
    a.addEventListener("click", function () { toggleMenu(false); });
  });
  window.addEventListener("resize", function () {
    if (innerWidth >= 1024) toggleMenu(false);
  }, { passive: true });

  /* 滚动到对应模块时导航项自动高亮 */
  var sectionIds = ["home", "about", "journey", "works", "honors", "moments", "interests", "contact"];
  function activeObserve() {
    if (!("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          $$("[data-nav]").forEach(function (l) {
            l.classList.toggle("active", l.getAttribute("data-nav") === en.target.id);
          });
        }
      });
    }, { rootMargin: "-38% 0px -55% 0px" });
    sectionIds.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) io.observe(el);
    });
  }
  activeObserve();

  /* ================================================================
   * 3. 滚动淡入入场动画（只进不出，独立触发）
   * ================================================================ */
  /* 同组元素依次延迟递进（stagger） */
  $$(".stagger").forEach(function (group) {
    $$(".reveal", group).forEach(function (el, i) {
      el.style.setProperty("--d", (i * 0.09).toFixed(2) + "s");
    });
  });

  if ("IntersectionObserver" in window) {
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("revealed");
          revealIO.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    $$(".reveal").forEach(function (el) { revealIO.observe(el); });
  } else {
    $$(".reveal").forEach(function (el) { el.classList.add("revealed"); });
  }

  /* ================================================================
   * 4. 时间自适应问候语
   * ================================================================ */
  (function greeting() {
    var text = $("#greetText"), emo = $("#greetEmo");
    if (!text) return;
    var h = new Date().getHours(), g = "你好", e = "✦";
    if (h < 5) { g = "夜深了"; e = "🌙"; }
    else if (h < 9) { g = "早上好"; e = "☀️"; }
    else if (h < 12) { g = "上午好"; e = "🌈"; }
    else if (h < 14) { g = "中午好"; e = "☀️"; }
    else if (h < 18) { g = "下午好"; e = "🍃"; }
    else if (h < 22) { g = "晚上好"; e = "🌙"; }
    else { g = "夜深了"; e = "✨"; }
    text.textContent = g;
    emo.textContent = e;
  })();

  /* ================================================================
   * 5. 三维标签云（PC / 平板：Canvas 球面旋转；移动端：静态 chips）
   *    身份标签已填真实信息；人格 / 热爱标签为示例，可自由替换
   * ================================================================ */
  var TAG_DATA = [
    /* 身份标签 */
    { t: "羽毛球爱好者", c: "id" },
    { t: "前端静态网页开发者", c: "id" },
    { t: "AI技术实践者", c: "id" },
    { t: "魔方爱好者", c: "id" },
    { t: "喜欢动手做项目，拒绝纸上谈兵", c: "id" },
    { t: "擅长社交，我是“社恐”", c: "id" },
    /* 人格标签（示例） */
    { t: "真诚慢热", c: "pf" }, { t: "行动派", c: "pf" }, { t: "理想主义", c: "pf" }, { t: "靠谱担当", c: "pf" }, { t: "细节控", c: "pf" },
    /* 热爱标签（示例） */
    { t: "星空", c: "lv" }, { t: "游戏", c: "lv" }, { t: "话剧", c: "lv" }, { t: "旅行", c: "lv" }, { t: "音乐", c: "lv" }, { t: "摄影", c: "lv" }
  ];

  /* ================================================================
   * 5.5 日常碎片相册数据（files 为相对路径；.mp4 自动渲染为视频）
   *     新增相册时照此格式加一条即可
   * ================================================================ */
  var ALBUMS = {
    friends: {
      title: "和朋友们",
      files: [
        "和朋友们/微信图片_20260901140305_35_11.jpg",
        "和朋友们/微信图片_20260901140307_36_11.png",
        "和朋友们/微信图片_20260901140308_37_11.png",
        "和朋友们/微信图片_20260901140309_38_11.jpg",
        "和朋友们/微信图片_20260901140309_39_11.jpg",
        "和朋友们/微信图片_20260901140310_40_11.jpg",
        "和朋友们/微信图片_20260901140311_41_11.jpg",
        "和朋友们/微信图片_20260901140312_42_11.jpg",
        "和朋友们/微信图片_20260901140313_43_11.jpg"
      ]
    },
    club: {
      title: "某次社团团建",
      files: [
        "某次社团团建/微信图片_20260901140700_105_11.jpg",
        "某次社团团建/微信图片_20260901140701_106_11.jpg",
        "某次社团团建/微信图片_20260901140702_107_11.jpg",
        "某次社团团建/微信图片_20260901140702_108_11.jpg",
        "某次社团团建/微信图片_20260901140703_109_11.jpg",
        "某次社团团建/微信图片_20260901140704_110_11.jpg",
        "某次社团团建/微信图片_20260901140705_111_11.jpg",
        "某次社团团建/微信图片_20260901140706_112_11.jpg",
        "某次社团团建/微信图片_20260901140707_113_11.jpg",
        "某次社团团建/微信图片_20260901140708_114_11.jpg",
        "某次社团团建/微信图片_20260901140708_116_11.jpg"
      ]
    },
    travel: {
      title: "旅行途中的一站",
      files: [
        "旅行途中的一站/微信图片_20260901140429_45_11.jpg",
        "旅行途中的一站/微信图片_20260901140430_46_11.jpg",
        "旅行途中的一站/微信图片_20260901140431_47_11.jpg",
        "旅行途中的一站/微信图片_20260901140432_48_11.jpg",
        "旅行途中的一站/微信图片_20260901140433_49_11.jpg",
        "旅行途中的一站/微信图片_20260901140434_50_11.jpg",
        "旅行途中的一站/微信图片_20260901140435_51_11.jpg",
        "旅行途中的一站/微信图片_20260901140436_52_11.jpg",
        "旅行途中的一站/微信图片_20260901140437_53_11.jpg",
        "旅行途中的一站/微信图片_20260901140438_54_11.jpg",
        "旅行途中的一站/微信图片_20260901140438_55_11.jpg",
        "旅行途中的一站/微信图片_20260901140439_56_11.jpg",
        "旅行途中的一站/微信图片_20260901140440_57_11.jpg",
        "旅行途中的一站/微信图片_20260901140441_58_11.jpg",
        "旅行途中的一站/微信图片_20260901140442_59_11.jpg",
        "旅行途中的一站/微信图片_20260901140443_60_11.jpg",
        "旅行途中的一站/微信图片_20260901140444_61_11.jpg",
        "旅行途中的一站/微信图片_20260901140445_62_11.jpg",
        "旅行途中的一站/微信图片_20260901140446_63_11.png",
        "旅行途中的一站/微信图片_20260901140447_64_11.jpg",
        "旅行途中的一站/微信图片_20260901140448_65_11.jpg",
        "旅行途中的一站/微信图片_20260901140449_66_11.jpg",
        "旅行途中的一站/微信图片_20260901140450_67_11.jpg",
        "旅行途中的一站/微信图片_20260901140451_68_11.jpg",
        "旅行途中的一站/微信图片_20260901140452_69_11.jpg",
        "旅行途中的一站/微信图片_20260901140453_70_11.jpg",
        "旅行途中的一站/微信图片_20260901140454_71_11.jpg",
        "旅行途中的一站/微信图片_20260901140455_72_11.jpg",
        "旅行途中的一站/微信图片_20260901140456_73_11.jpg",
        "旅行途中的一站/微信图片_20260901140457_74_11.jpg",
        "旅行途中的一站/微信图片_20260901140458_75_11.jpg",
        "旅行途中的一站/微信图片_20260901140459_76_11.jpg",
        "旅行途中的一站/微信图片_20260901140500_77_11.jpg",
        "旅行途中的一站/微信图片_20260901140501_78_11.jpg",
        "旅行途中的一站/微信图片_20260901140502_79_11.jpg",
        "旅行途中的一站/微信图片_20260901140502_80_11.jpg",
        "旅行途中的一站/微信图片_20260901140503_81_11.jpg",
        "旅行途中的一站/微信图片_20260901140504_82_11.jpg",
        "旅行途中的一站/微信图片_20260901140505_83_11.jpg",
        "旅行途中的一站/微信图片_20260901140506_84_11.jpg",
        "旅行途中的一站/微信图片_20260901140507_85_11.jpg",
        "旅行途中的一站/微信图片_20260901140508_86_11.jpg",
        "旅行途中的一站/微信图片_20260901140509_87_11.jpg",
        "旅行途中的一站/微信图片_20260901140510_88_11.jpg",
        "旅行途中的一站/微信图片_20260901140511_89_11.jpg",
        "旅行途中的一站/微信图片_20260901140513_90_11.jpg",
        "旅行途中的一站/微信图片_20260901140513_91_11.jpg",
        "旅行途中的一站/微信图片_20260901140514_92_11.jpg",
        "旅行途中的一站/微信图片_20260901140515_93_11.jpg",
        "旅行途中的一站/微信图片_20260901140516_94_11.jpg",
        "旅行途中的一站/微信图片_20260901140517_95_11.jpg",
        "旅行途中的一站/微信图片_20260901140518_96_11.jpg",
        "旅行途中的一站/微信图片_20260901140519_97_11.jpg",
        "旅行途中的一站/微信图片_20260901140520_98_11.jpg",
        "旅行途中的一站/微信图片_20260901140521_99_11.jpg",
        "旅行途中的一站/微信图片_20260901140522_100_11.jpg",
        "旅行途中的一站/微信图片_20260901140523_101_11.jpg",
        "旅行途中的一站/微信图片_20260901140524_102_11.jpg",
        "旅行途中的一站/微信图片_20260901140525_103_11.jpg"
      ]
    },
    life: {
      title: "认真生活的证明",
      files: [
        "认真生活的证明/微信图片_20260901140807_118_11.jpg",
        "认真生活的证明/微信图片_20260901140808_119_11.jpg",
        "认真生活的证明/微信图片_20260901140809_120_11.jpg",
        "认真生活的证明/微信图片_20260901140810_121_11.jpg",
        "认真生活的证明/微信图片_20260901140810_122_11.jpg",
        "认真生活的证明/微信图片_20260901140811_124_11.jpg",
        "认真生活的证明/微信图片_20260901140812_125_11.jpg",
        "认真生活的证明/微信图片_20260901140813_126_11.jpg",
        "认真生活的证明/微信图片_20260901140814_127_11.jpg",
        "认真生活的证明/微信图片_20260901140823_128_11.jpg",
        "认真生活的证明/微信图片_20260901140824_129_11.jpg",
        "认真生活的证明/e6ba13832bd7819779766bc7f8c71047.mp4"
      ]
    },
    campus: {
      title: "校园日常",
      files: ["校园日常/微信图片_20260901172512_143_11.jpg"]
    },
    stars: {
      title: "抬头遇见的星星",
      files: ["抬头遇见的星星/微信图片_20260901172515_144_11.jpg"]
    }
  };

  var cloud = $("#tagCloud");
  var chipCloud = $("#chipCloud");

  /* 移动端静态标签 */
  if (chipCloud) {
    chipCloud.innerHTML = TAG_DATA.map(function (x) {
      return '<span class="chip">' + x.t + "</span>";
    }).join("");
  }

  (function tagCloud3D() {
    if (!cloud) return;
    var ctx = cloud.getContext("2d");
    var CW = 0, CH = 300, DPR = 1;

    /* 球面均匀分布（Fibonacci 球） */
    var N = TAG_DATA.length;
    var RADIUS = Math.min(110, 38 * Math.sqrt(N));
    var pts = TAG_DATA.map(function (d, i) {
      var y = 1 - (i / (N - 1)) * 2;
      var r = Math.sqrt(1 - y * y);
      var theta = i * Math.PI * (3 - Math.sqrt(5));
      return { d: d, x: Math.cos(theta) * r, y: y, z: Math.sin(theta) * r };
    });

    var yaw = 0.4, pitch = 0.16;
    var autoSpeed = 0.0016;
    var dragging = false, lastX = 0, lastY = 0;
    var paused = false, running = false, rafId = null;

    function fit() {
      var rect = cloud.getBoundingClientRect();
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      CW = Math.max(280, rect.width);
      cloud.width = Math.round(CW * DPR);
      cloud.height = Math.round(CH * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    function project(p) {
      var cy = Math.cos(yaw), sy = Math.sin(yaw);
      var cp = Math.cos(pitch), sp = Math.sin(pitch);
      /* 绕 Y 轴 */
      var x1 = p.x * cy + p.z * sy, z1 = -p.x * sy + p.z * cy;
      /* 绕 X 轴 */
      var y2 = p.y * cp - z1 * sp, z2 = p.y * sp + z1 * cp;
      var f = 420, k = f / (f + z2 * RADIUS);
      return {
        X: CW / 2 + x1 * RADIUS * k,
        Y: CH / 2 + y2 * RADIUS * k,
        scale: k, z: z2
      };
    }

    function draw() {
      ctx.clearRect(0, 0, CW, CH);
      var dark = document.documentElement.classList.contains("dark");
      var list = pts.map(function (p) { p.proj = project(p); return p; })
        .sort(function (a, b) { return a.proj.z - b.proj.z; }); // 远的先画

      list.forEach(function (p) {
        var q = p.proj;
        var depth = (q.z + 1) / 2;   // 0 远 → 1 近
        var alpha = dark ? 0.22 + 0.75 * depth : 0.3 + 0.6 * depth;
        /* 长标签适当缩小字号，避免画布内文字互相挤压 */
        var size = (11 + 8 * depth) * Math.min(1, 8.5 / Math.max(8, p.d.t.length));
        ctx.globalAlpha = alpha;
        ctx.fillStyle = dark ? "#dbe9ff" : "#2c4a73";
        ctx.font = "600 " + size + 'px "Noto Sans SC","Manrope",sans-serif';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.d.t, q.X, q.Y);
      });
      ctx.globalAlpha = 1;
    }

    function loop() {
      if (!running) return;
      rafId = requestAnimationFrame(loop);
      if (!dragging && !paused) yaw += autoSpeed;
      draw();
    }

    function start() { if (running) return; running = true; rafId = requestAnimationFrame(loop); }
    function stop() { running = false; if (rafId) cancelAnimationFrame(rafId); }

    fit();
    draw();

    cloud.addEventListener("pointerdown", function (e) {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      try { cloud.setPointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }
    });
    cloud.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      yaw += (e.clientX - lastX) * 0.005;
      pitch = Math.max(-0.9, Math.min(0.9, pitch + (e.clientY - lastY) * 0.005));
      lastX = e.clientX; lastY = e.clientY;
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (ev) {
      cloud.addEventListener(ev, function () { dragging = false; });
    });

    /* 仅在视口内渲染，离开暂停 */
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { paused = !en.isIntersecting; });
      }, { threshold: 0.05 }).observe(cloud);
    }

    window.addEventListener("resize", function () { fit(); draw(); }, { passive: true });
    window.addEventListener("themechange", function () { draw(); });

    start();
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop(); else start();
    });
  })();

  /* ================================================================
   * 6. Toast 轻提示
   * ================================================================ */
  var toastEl = $("#toast"), toastTimer = null;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2200);
  }

  /* ================================================================
   * 7. 复制工具（含旧浏览器降级）
   * ================================================================ */
  function copyText(text, label) {
    function ok() { toast(label || "已复制：" + text); }
    function fail() {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;opacity:0;pointer-events:none";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); ok(); } catch (e) { toast("复制失败，请手动复制"); }
      ta.remove();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok, fail);
    } else fail();
  }

  document.addEventListener("click", function (e) {
    var cp = e.target.closest("[data-copy]");
    if (cp) {
      e.preventDefault();
      var copyVal = cp.getAttribute("data-copy");
      copyText(copyVal, "已复制邮箱：" + copyVal);
      return;
    }
    var cc = e.target.closest(".contact-copy");
    if (cc) {
      copyText(cc.getAttribute("data-copy-text"));
      return;
    }
    var cm = e.target.closest("[data-coming]");
    if (cm) {
      e.preventDefault();
      toast("🚧 " + cm.getAttribute("data-coming"));
    }
  });

  /* ================================================================
   * 8. 作品分类 Tab 过滤
   * ================================================================ */
  var tabs = $$(".work-tab");
  var workCards = $$("#workGrid .work-card");
  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      tabs.forEach(function (t) { t.classList.remove("active"); });
      tab.classList.add("active");
      var cat = tab.getAttribute("data-cat");
      workCards.forEach(function (card) {
        var show = cat === "all" || card.getAttribute("data-cat") === cat;
        card.style.display = show ? "" : "none";
      });
    });
  });

  /* ================================================================
   * 9. 大图预览模态框（作品 / 荣誉证书 / 相册共用）
   *    相册模式：点击照片堆打开，此时才按需加载其余照片（窗口预载 ±2 张）
   * ================================================================ */
  var lightbox = $("#lightbox");
  var lbMedia = $("#lbMedia");
  var lbCap = $("#lbCap");
  var lbClose = $("#lbClose");
  var lbPrev = $("#lbPrev");
  var lbNext = $("#lbNext");
  var lbCount = $("#lbCount");
  var lbPreload = $("#lbPreload");
  var albumView = null;   /* 相册浏览状态：{ key, idx } */

  function openLightbox(cap, imgSrc, ratio) {
    if (!lightbox) return;
    if (imgSrc) {
      lbMedia.innerHTML = '<img src="' + imgSrc + '" alt="' + (cap || "").replace(/"/g, "&quot;") + '">';
    } else {
      lbMedia.innerHTML =
        '<div class="img-slot" style="aspect-ratio:' + (ratio || "16/10") + ';min-height:280px">' +
        '<svg class="slot-logo" aria-hidden="true"><use href="#zm-full"/></svg>' +
        '<span class="slot-note">大图预览位 · 待补充</span></div>';
    }
    lbCap.textContent = cap || "";
    lightbox.classList.add("open");
    lightbox.classList.remove("album");
    document.documentElement.classList.add("no-scroll");
  }

  /* ---- 相册模式 ---- */
  function openAlbum(key) {
    if (!ALBUMS[key] || !lightbox) return;
    albumView = { key: key, idx: 0 };
    lightbox.classList.add("open", "album");
    document.documentElement.classList.add("no-scroll");
    renderAlbumView();
  }
  function renderAlbumView() {
    if (!albumView) return;
    var a = ALBUMS[albumView.key];
    var curFile = a.files[albumView.idx];
    if (curFile.indexOf(".mp4") > -1) {
      /* 视频文件渲染为播放器 */
      lbMedia.innerHTML = '<video class="lb-video" controls autoplay muted playsinline loop src="' + curFile + '"></video>';
    } else {
      var img = document.createElement("img");
      img.src = curFile;
      img.alt = a.title + " · 第 " + (albumView.idx + 1) + " 张";
      img.style.opacity = "0";
      img.style.transition = "opacity .3s ease";
      lbMedia.innerHTML = "";
      lbMedia.appendChild(img);
      setTimeout(function () { img.style.opacity = "1"; }, 30);
    }
    var pos = (albumView.idx + 1) + " / " + a.files.length;
    lbCap.textContent = a.title + " · " + pos;
    if (lbCount) lbCount.textContent = pos;
    albumEnsureAround();
  }
  /* 窗口预载：只提前取相邻 ±2 张，滑到哪加载到哪，避免一次性拉取几十张 */
  function albumEnsureAround() {
    if (!lbPreload || !albumView) return;
    lbPreload.innerHTML = "";
    var files = ALBUMS[albumView.key].files;
    for (var j = -2; j <= 2; j++) {
      var k = albumView.idx + j;
      if (k < 0 || k >= files.length || k === albumView.idx) continue;
      if (files[k].indexOf(".mp4") > -1) continue;
      var im = document.createElement("img");
      im.src = files[k];
      lbPreload.appendChild(im);
    }
  }
  function albumMove(d) {
    if (!albumView) return;
    var L = ALBUMS[albumView.key].files.length;
    albumView.idx = (albumView.idx + d + L) % L;
    renderAlbumView();
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove("open", "album");
    albumView = null;
    if (lbMedia) lbMedia.innerHTML = "";
    if (lbPreload) lbPreload.innerHTML = "";
    document.documentElement.classList.remove("no-scroll");
  }
  if (lbClose) lbClose.addEventListener("click", closeLightbox);
  if (lbPrev) lbPrev.addEventListener("click", function (e) { e.stopPropagation(); albumMove(-1); });
  if (lbNext) lbNext.addEventListener("click", function (e) { e.stopPropagation(); albumMove(1); });
  if (lightbox) {
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) closeLightbox();
    });
    /* 相册模式支持移动端左右滑动切换 */
    var lbTouchX = 0;
    lightbox.addEventListener("touchstart", function (e) { lbTouchX = e.touches[0].clientX; }, { passive: true });
    lightbox.addEventListener("touchend", function (e) {
      if (!albumView) return;
      var dx = e.changedTouches[0].clientX - lbTouchX;
      if (Math.abs(dx) > 42) albumMove(dx < 0 ? 1 : -1);
    }, { passive: true });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (greetDialog && !greetDialog.hidden) greetDialog.hidden = true;
      if (bgmDialog && !bgmDialog.hidden) bgmDialog.hidden = true;
      closeLightbox();
    }
    /* 相册模式下支持 ← → 键盘翻页 */
    if (albumView && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      e.preventDefault();
      albumMove(e.key === "ArrowLeft" ? -1 : 1);
    }
  });

  /* 证书：点击放大 */
  $$(".honor-media[data-lb]").forEach(function (m) {
    m.addEventListener("click", function () {
      var img = $("img", m);
      openLightbox(m.getAttribute("data-cap"), img ? img.getAttribute("src") : null, "4/5");
    });
  });
  /* 作品卡：点击预览（占位大图 / 真实图片自动识别） */
  $$(".work-card").forEach(function (card) {
    card.addEventListener("click", function () {
      var title = $(".work-title", card);
      var tag = $(".work-tag", card);
      var img = $(".img-slot img", card);
      openLightbox(
        (title ? title.textContent : "作品") + (tag ? " · " + tag.textContent : ""),
        img ? img.getAttribute("src") : null,
        "16/10"
      );
    });
  });

  /* ================================================================
   * 10. 成长轨迹「幕后故事」折叠
   * ================================================================ */
  $$(".tl-story-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var open = btn.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(open));
      btn.parentElement.querySelector(".tl-story-body").classList.toggle("open", open);
    });
  });

  /* ================================================================
   * 11. 兴趣标签 → 预设打招呼文案弹窗 + 一键复制
   * ================================================================ */
  var greetDialog = $("#greetDialog");
  var greetBody = $("#greetBody");
  var greetTitle = $("#greetTitle");
  $$(".int-chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      var name = chip.getAttribute("data-greet");
      var msg = "嗨！看到你也喜欢「" + name + "」，感觉会很有话聊～我是张海宁 Hayden Zhang，期待认识你 🙂";
      greetTitle.textContent = "✦ 关于「" + name + "」的打招呼";
      greetBody.textContent = msg;
      greetBody.setAttribute("data-msg", msg);
      greetDialog.hidden = false;
    });
  });
  var greetClose = $("#greetClose");
  if (greetClose) greetClose.addEventListener("click", function () { greetDialog.hidden = true; });
  var greetCopy = $("#greetCopy");
  if (greetCopy) greetCopy.addEventListener("click", function () {
    copyText(greetBody.getAttribute("data-msg"));
  });

  /* 弹窗背景点击关闭（含「关闭」按钮的 data-close） */
  document.addEventListener("click", function (e) {
    var dc = e.target.closest("[data-close]");
    if (dc) {
      var modal = dc.closest(".ui-modal");
      if (modal) modal.hidden = true;
    }
  });

  /* ================================================================
   * 12. 「为我点亮一颗星」互动（计数本地保存 + 星星上浮粒子）
   * ================================================================ */
  var starBtn = $("#starBtn");
  var starCountEl = $("#starCount");
  var starTotal = parseInt(storageGet("zm-stars") || "3", 10) || 3; // 预置 3 颗，氛围感更好
  if (starCountEl) starCountEl.textContent = starTotal;

  if (starBtn) starBtn.addEventListener("click", function () {
    starTotal += 1;
    storageSet("zm-stars", String(starTotal));
    if (starCountEl) starCountEl.textContent = starTotal;

    /* 按钮上方迸出小星星 */
    var r = starBtn.getBoundingClientRect();
    for (var i = 0; i < 5; i++) {
      var s = document.createElement("span");
      s.className = "star-fly";
      s.textContent = "✦";
      s.style.left = (r.left + r.width / 2 + (Math.random() * 40 - 20)) + "px";
      s.style.top = (r.top - 6) + "px";
      s.style.setProperty("--dx", ((Math.random() * 90 - 45).toFixed(0)) + "px");
      s.style.animationDelay = (i * 0.07).toFixed(2) + "s";
      document.body.appendChild(s);
      setTimeout(function () { s.remove(); }, 1400);
    }
    toast("已记录你的星光 ✨ 当前 " + starTotal + " 颗");
  });

  /* ================================================================
   * 13. 回到顶部按钮 + 环形滚动进度
   * ================================================================ */
  var backTop = $("#backTop");
  var ringFg = $("#ringFg");
  function updateBackTop() {
    if (!backTop) return;
    var y = window.scrollY || document.documentElement.scrollTop || 0;
    backTop.classList.toggle("show", y > 480);
    if (ringFg) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
      ringFg.style.strokeDashoffset = String(128 * (1 - p));
    }
  }
  if (backTop) backTop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  /* ================================================================
   * 14. 页脚彩蛋：滚动到底部渐显「感谢你看完我的小星球 ✨」
   * ================================================================ */
  var footerEgg = $("#footerEgg");
  if (footerEgg && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          footerEgg.classList.add("show");
        }
      });
    }, { threshold: 0.4 }).observe($("#footer"));
  } else if (footerEgg) footerEgg.classList.add("show");

  /* ================================================================
   * 15. 隐藏彩蛋：双击大标题 → 小型流星雨
   * ================================================================ */
  var heroTitle = $("#heroTitle");
  if (heroTitle) heroTitle.addEventListener("dblclick", function () {
    var n = 22;
    for (var i = 0; i < n; i++) {
      var m = document.createElement("span");
      m.className = "meteor";
      m.style.setProperty("--mx", (Math.random() * 100).toFixed(1) + "vw");
      m.style.setProperty("--mh", (70 + Math.random() * 90).toFixed(0) + "px");
      m.style.setProperty("--mr", (26 + Math.random() * 20).toFixed(0) + "deg");
      m.style.setProperty("--mt", (0.9 + Math.random() * 0.8).toFixed(2) + "s");
      m.style.setProperty("--mend", (75 + Math.random() * 55).toFixed(0) + "vh");
      m.style.setProperty("--mc", Math.random() < 0.3 ? "rgba(156,195,255,.95)" : "rgba(210,228,255,.95)");
      m.style.animationDelay = (Math.random() * 0.45).toFixed(2) + "s";
      document.body.appendChild(m);
      setTimeout(function () { m.remove(); }, 2600);
    }
    toast("送给你一场小流星雨 ✨");
  });

  /* ================================================================
   * 15.5 层叠式照片堆（日常碎片相册）
   *  - 滚动进入视口：才开始加载「前几张」并启动轮播（离开视口自动暂停）
   *  - 轮播：不同照片按随机顺序从右往左滑入淡入，层叠相纸错落摆放
   *  - 点击打开相册大图模式后，才按需加载其余照片（见 openAlbum）
   * ================================================================ */
  var PS_PRELOAD = 4;   /* 每个照片堆在网格中最多预载张数，其余进入相册后再加载 */

  function shuffleArr(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function initPhotoStacks() {
    $$(".photo-stack").forEach(function (stack) {
      var key = stack.getAttribute("data-album");
      var album = ALBUMS[key];
      if (!album) return;

      /* 预载候选：跳过视频，最多取前 PS_PRELOAD 张 */
      var candidates = [];
      for (var i = 0; i < album.files.length && candidates.length < PS_PRELOAD; i++) {
        if (album.files[i].indexOf(".mp4") === -1) candidates.push(i);
      }
      var order = shuffleArr(candidates);   /* 轮播出场顺序随机化 */
      var imgs = [];

      /* 先创建占位 <img>，不设 src —— 划入视口才开始真正加载 */
      candidates.forEach(function (fileIdx) {
        var img = document.createElement("img");
        img.className = "ps-img";
        img.alt = album.title + " · 照片 " + (fileIdx + 1);
        /* 随机旋转与偏移，营造相纸层叠错落感 */
        img.style.setProperty("--r", (Math.random() * 6 - 3).toFixed(1) + "deg");
        img.style.setProperty("--x", (Math.random() * 10 - 5).toFixed(1) + "px");
        img.style.setProperty("--y", (Math.random() * 8 - 4).toFixed(1) + "px");
        img.setAttribute("data-file", album.files[fileIdx]);
        img.addEventListener("load", function () { img.classList.add("ready"); });
        img.addEventListener("error", function () { img.classList.add("ready"); });
        stack.appendChild(img);
        imgs.push(img);
      });

      var started = false, cur = -1, timer = null;

      function play(i) {
        if (!started || document.hidden || !imgs.length) return;
        cur = i % imgs.length;
        imgs.forEach(function (im) { im.classList.remove("is-top", "is-in"); });
        var top = imgs[cur];
        top.classList.add("is-top", "is-in");      /* 新照片从右往左滑入淡入 */
        setTimeout(function () { top.classList.remove("is-in"); }, 700);
      }
      function resumeTimer() {
        if (timer || imgs.length <= 1) return;  // 单张相册不做轮播
        timer = setInterval(function () { play(cur + 1); }, 3400);
      }
      function startShow() {
        if (started) { resumeTimer(); return; }
        started = true;
        /* 划入视口：加载前几张（此时才设置 src） */
        imgs.forEach(function (im) {
          if (!im.getAttribute("src")) im.setAttribute("src", im.getAttribute("data-file"));
        });
        play(0);
        resumeTimer();
      }
      function stopShow() {
        if (timer) { clearInterval(timer); timer = null; }
      }

      /* 视口进入 → 加载并轮播；离开 → 暂停省资源 */
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) startShow(); else stopShow();
          });
        }, { threshold: 0.15 }).observe(stack);
      } else {
        startShow();
      }
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) stopShow();
      });

      /* 点击 / 键盘 Enter、Space → 打开相册大图模式 */
      stack.addEventListener("click", function () { openAlbum(key); });
      stack.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openAlbum(key); }
      });
    });
  }

  /* ================================================================
   * 16. 图片懒加载淡入（所有 .lazy 图片就绪后淡入）
   * ================================================================ */
  $$("img.lazy").forEach(function (img) {
    function done() {
      img.classList.add("loaded");
      img.removeEventListener("load", done);
      img.removeEventListener("error", done);
    }
    if (img.complete) done();
    else {
      img.addEventListener("load", done);
      img.addEventListener("error", done);
    }
  });

  /* ================================================================
   * 17. 背景音乐（两首随机选一首，进入网站默认开启）
   *     - 受浏览器自动播放策略限制，实际在用户点击「无需关闭」后才开始播放
   *     - 提示框用于提醒可能处于不宜出声的场合
   * ================================================================ */
  var BGM_FILES = ["背景音乐/Audio-17-34-39.mp3", "背景音乐/Audio-17-34-44.mp3"];
  var bgmBtn = $("#bgmToggle");
  var bgmDialog = $("#bgmDialog");
  var bgmOn = true;              /* 进入网站音乐默认处于开启状态 */
  var bgmAudio = new Audio();    /* 单例，随机选曲后设置 src */
  bgmAudio.loop = true;
  bgmAudio.volume = 0.32;

  function bgmSyncUI() {
    if (bgmBtn) {
      bgmBtn.classList.toggle("on", bgmOn);
      bgmBtn.setAttribute("aria-label", bgmOn ? "关闭背景音乐" : "开启背景音乐");
    }
  }
  function bgmPlayRandom() {
    var f = BGM_FILES[Math.floor(Math.random() * BGM_FILES.length)];
    bgmAudio.src = f;
    bgmAudio.play().catch(function () { /* 自动播放策略拦截时静默忽略 */ });
  }
  function bgmStopMusic() { bgmAudio.pause(); }

  /* 导航栏音乐按钮：随时手动开关 */
  if (bgmBtn) bgmBtn.addEventListener("click", function () {
    bgmOn = !bgmOn;
    bgmSyncUI();
    if (bgmOn) { bgmPlayRandom(); toast("正在播放背景音乐 🎵"); }
    else bgmStopMusic();
  });

  /* 提示框按钮：无需关闭 / 关闭 */
  function closeBgmDialog() { if (bgmDialog) bgmDialog.hidden = true; }
  var bgmKeep = $("#bgmKeep");
  var bgmClose = $("#bgmClose");
  if (bgmKeep) bgmKeep.addEventListener("click", function () {
    closeBgmDialog();
    bgmOn = true; bgmSyncUI(); bgmPlayRandom();
  });
  if (bgmClose) bgmClose.addEventListener("click", function () {
    closeBgmDialog();
    bgmOn = false; bgmSyncUI(); bgmStopMusic();
  });

  /* 开场动画结束后弹出提示；另有定时兜底，防止 intro 事件未触发 */
  var bgmShown = false;
  function showBgmDialog() {
    if (bgmShown || !bgmDialog) return;
    bgmShown = true;
    bgmDialog.hidden = false;
  }
  window.addEventListener("intro:done", function () { setTimeout(showBgmDialog, 700); });
  setTimeout(showBgmDialog, 4500);   /* 兜底：intro 异常未派发事件时也会弹出 */
  bgmSyncUI();

  /* 初始化照片堆与回到顶部进度环 */
  initPhotoStacks();
  updateBackTop();
})();

/* ================================================================
 * 图片加载失败自愈（追加，不改动原有业务代码）
 * ------------------------------------------------------------------
 *  - 破损 / 404 图片加 .img-broken-hide 隐藏，脱离文档流、不留占位
 *  - 图片全失效的卡片整体隐藏，网格靠 row dense 自动填补空缺
 *  - 整个板块图片全失效时，隐藏该板块（含标题），后续内容自然上移
 *  - 用捕获阶段监听 error，可覆盖懒加载与动态插入的图片
 * ================================================================ */
(function () {
  "use strict";

  var CARD_SEL = ".work-card, .honor-card, .mom-item, .qr-box";

  function hide(el) { if (el) el.classList.add("img-broken-hide"); }

  /* 板块内所有卡片都隐藏后，隐藏整个板块（含标题） */
  function refreshSection(section) {
    if (!section) return;
    var cards = section.querySelectorAll(CARD_SEL);
    var alive = false;
    for (var i = 0; i < cards.length; i++) {
      if (!cards[i].classList.contains("img-broken-hide")) { alive = true; break; }
    }
    if (cards.length && !alive) hide(section);
  }

  /* 单张图失效：隐藏图片 → 卡片内再无有效图则隐藏卡片 → 级联板块 */
  function onBroken(img) {
    if (!img || img.classList.contains("img-broken-hide")) return;
    hide(img);
    var card = img.closest(CARD_SEL);
    if (card && !card.querySelector("img:not(.img-broken-hide)")) {
      hide(card);
      var section = card.closest("section");
      if (section) refreshSection(section);
    }
  }

  /* 捕获阶段监听：img 的 error 不冒泡但可捕获，并覆盖后续动态插入的图片 */
  document.addEventListener("error", function (e) {
    var t = e.target;
    if (t && t.tagName === "IMG") onBroken(t);
  }, true);

  /* 兜底：扫描已被缓存判定为失败的既有图片（complete 但 naturalWidth 为 0） */
  function scan() {
    var imgs = document.querySelectorAll("img");
    for (var i = 0; i < imgs.length; i++) {
      var im = imgs[i];
      if (im.complete && im.naturalWidth === 0 && im.getAttribute("src")) onBroken(im);
    }
  }
  if (document.readyState === "complete") scan();
  else window.addEventListener("load", scan);
})();

/* ================================================================
 * 联系我 · 随机励志名言（每次加载随机、不重复抽 2 条，各放左右卡）
 * ================================================================ */
(function () {
  "use strict";

  var QUOTES = [
    { t: "满地都是六便士，他却抬头看见了月亮。", f: "毛姆《月亮与六便士》" },
    { t: "追风赶月莫停留，平芜尽处是春山。", f: "田锡《塞上曲》" },
    { t: "所有的惊艳，都来自长久的沉淀。", f: "《时间之书》" },
    { t: "发光并非太阳的专利，你也可以发光。", f: "郭沫若" },
    { t: "路漫漫其修远兮，吾将上下而求索。", f: "屈原《离骚》" },
    { t: "且视他人之疑目如盏盏鬼火，大胆去走你的夜路。", f: "史铁生" },
    { t: "凡是过去，皆为序章。", f: "莎士比亚《暴风雨》" },
    { t: "我们都在阴沟里，但仍有人仰望星空。", f: "王尔德" },
    { t: "每一个不曾起舞的日子，都是对生命的辜负。", f: "尼采" },
    { t: "人生如逆旅，我亦是行人。", f: "苏轼《临江仙·送钱穆父》" },
    { t: "心之所向，素履以往。", f: "七堇年" },
    { t: "日拱一卒，功不唐捐。", f: "胡适" },
    { t: "于无声处积蓄，于明亮时绽放。", f: "梭罗《瓦尔登湖》" },
    { t: "走过的每一步，都铺成了脚下的路。", f: "路遥《人生》" }
  ];

  /* Fisher-Yates 洗牌后取前两条，保证不重复 */
  function pickTwo() {
    var arr = QUOTES.slice();
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return [arr[0], arr[1]];
  }

  function fill(el, q) {
    if (!el || !q) return;
    var txt = el.querySelector(".quote-text");
    var from = el.querySelector(".quote-from");
    if (txt) txt.textContent = q.t;
    if (from) from.textContent = "——" + q.f;
    var card = el.closest(".contact-card");
    var btn = card ? card.querySelector(".contact-copy") : null;
    if (btn) btn.setAttribute("data-copy-text", q.t + "——" + q.f);
  }

  function init() {
    var friend = document.getElementById("quoteFriend");
    var campaign = document.getElementById("quoteCampaign");
    if (!friend && !campaign) return;
    var two = pickTwo();
    fill(friend, two[0]);
    fill(campaign, two[1]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();