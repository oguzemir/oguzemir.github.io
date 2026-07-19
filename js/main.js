/* ============================================================
   OĞUZ EMİR — main.js
   Language switching, hero rig canvas, typewriter, reveals
   ============================================================ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ============ LANGUAGE ============ */
  var LANG_KEY = "oe-lang";
  var lang = localStorage.getItem(LANG_KEY) || "en";
  if (!window.I18N[lang]) lang = "en";

  function t(key) {
    var dict = window.I18N[lang];
    return dict[key] !== undefined ? dict[key] : (window.I18N.en[key] || key);
  }

  function applyLang() {
    document.documentElement.lang = lang;
    document.title = t("meta.title");
    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", t("meta.desc"));

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    // Keys whose values are trusted HTML from our own dictionary
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      el.innerHTML = t(el.getAttribute("data-i18n-html"));
    });
    document.querySelectorAll(".lang-btn").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-lang") === lang);
    });

    renderSkills();
    renderTimeline();
    renderProjects();
    restartTypewriter();
  }

  document.querySelectorAll(".lang-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var next = btn.getAttribute("data-lang");
      if (next === lang) return;
      lang = next;
      localStorage.setItem(LANG_KEY, lang);
      applyLang();
    });
  });

  /* ============ SOCIAL LINKS ============ */
  function renderSocials(containerId) {
    var el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = window.SOCIALS.map(function (s) {
      return '<a class="social-link" href="' + s.url + '" target="_blank" rel="noopener" aria-label="' + s.name + '">' +
        s.icon + "<span>" + s.name + "</span></a>";
    }).join("");
  }
  renderSocials("heroSocials");
  renderSocials("contactSocials");

  /* ============ SKILLS ============ */
  function renderSkills() {
    var grid = document.getElementById("skillsGrid");
    if (!grid) return;
    grid.innerHTML = window.SKILLS.map(function (s) {
      var logos = s.logos.map(function (l) {
        return '<img src="assets/img/logos/' + l + '.svg" alt="' + l + '">';
      }).join("");
      return (
        '<div class="skill-card reveal">' +
          '<span class="skill-icon' + (s.logos.length > 1 ? " duo" : "") + '">' + logos + "</span>" +
          "<h3>" + s.title[lang] + "</h3>" +
          "<p>" + s.desc[lang] + "</p>" +
          '<div class="skill-tags">' +
            s.tags.map(function (tag) { return '<span class="tag">' + tag + "</span>"; }).join("") +
          "</div>" +
        "</div>"
      );
    }).join("");
    observeReveals(grid);
    bindCardGlow(grid);
  }

  function bindCardGlow(scope) {
    scope.querySelectorAll(".skill-card").forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty("--mx", (e.clientX - r.left) + "px");
        card.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });
  }

  /* ============ TIMELINE ============ */
  var VISIBLE_ROLES = 5;
  var timelineExpanded = false;
  var showFreelance = false;

  function badgeLabel(badge) {
    if (badge === "now") return t("exp.present");
    if (badge === "freelance") return "FREELANCE";
    if (badge === "part-time") return lang === "tr" ? "YARI ZAMANLI" : "PART-TIME";
    return "";
  }

  function renderTimeline() {
    var wrap = document.getElementById("timeline");
    if (!wrap) return;
    var jobs = window.EXPERIENCE.filter(function (job) {
      return showFreelance || job.badge !== "freelance";
    });
    wrap.innerHTML = jobs.map(function (job, i) {
      var hidden = !timelineExpanded && i >= VISIBLE_ROLES ? " hidden-role" : "";
      var badge = job.badge
        ? '<span class="tl-badge' + (job.badge === "now" ? " now" : "") + '">' + badgeLabel(job.badge) + "</span>"
        : "";
      return (
        '<div class="tl-item reveal' + hidden + '">' +
          '<div class="tl-date mono">' + job.date[lang] + badge + "</div>" +
          '<h3 class="tl-role">' + job.role[lang] + "</h3>" +
          '<div class="tl-company"><b>' + job.company + "</b> · " + job.type[lang] + "</div>" +
          '<p class="tl-desc">' + job.desc[lang] + "</p>" +
          '<div class="tl-tags">' +
            job.tags.map(function (tag) { return '<span class="tag">' + tag + "</span>"; }).join("") +
          "</div>" +
        "</div>"
      );
    }).join("");
    var moreBtn = document.getElementById("timelineMore");
    if (moreBtn) moreBtn.textContent = timelineExpanded ? t("exp.less") : t("exp.more");
    observeReveals(wrap);
  }

  var freelanceToggle = document.getElementById("freelanceToggle");
  if (freelanceToggle) {
    freelanceToggle.addEventListener("change", function () {
      showFreelance = freelanceToggle.checked;
      renderTimeline();
    });
  }

  var moreBtn = document.getElementById("timelineMore");
  if (moreBtn) {
    moreBtn.addEventListener("click", function () {
      timelineExpanded = !timelineExpanded;
      renderTimeline();
      if (!timelineExpanded) {
        document.getElementById("experience").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
      }
    });
  }

  /* ============ PROJECTS ============ */
  function renderProjects() {
    var grid = document.getElementById("projectsGrid");
    if (!grid) return;
    grid.innerHTML = window.PROJECTS.map(function (p) {
      var linkDefs = p.links || (p.url ? [{ label: null, url: p.url }] : []);
      var link = linkDefs.map(function (l) {
        return '<a class="proj-link" href="' + l.url + '" target="_blank" rel="noopener">' +
          (l.label || t("proj.visit")) + " ↗</a>";
      }).join("");
      var imgFile = "assets/img/projects/" + (p.img || p.slug + ".jpg");
      return (
        '<article class="proj-card reveal">' +
          '<div class="proj-media">' +
            '<div class="proj-fallback" data-hint="' + imgFile + '">' + p.initials + "</div>" +
            '<img src="' + imgFile + '" alt="' + p.title + '" loading="lazy" onerror="this.remove()">' +
          "</div>" +
          '<div class="proj-body">' +
            '<span class="proj-type mono">' + p.type[lang] + "</span>" +
            '<div class="proj-top"><h3 class="proj-title">' + p.title + '</h3><div class="proj-links">' + link + "</div></div>" +
            '<p class="proj-desc">' + p.desc[lang] + "</p>" +
            '<div class="proj-tags">' +
              p.tags.map(function (tag) { return '<span class="tag">' + tag + "</span>"; }).join("") +
            "</div>" +
          "</div>" +
        "</article>"
      );
    }).join("");
    observeReveals(grid);
  }

  /* ============ TYPEWRITER ============ */
  var typeTimer = null;
  function restartTypewriter() {
    var el = document.getElementById("typewriter");
    if (!el) return;
    clearTimeout(typeTimer);
    var roles = t("hero.roles");
    if (!Array.isArray(roles)) roles = ["Game Animator"];
    if (reduceMotion) { el.textContent = roles[0]; return; }

    var roleIdx = 0, charIdx = 0, deleting = false;
    function tick() {
      var current = roles[roleIdx];
      if (!deleting) {
        charIdx++;
        el.textContent = current.slice(0, charIdx);
        if (charIdx === current.length) {
          deleting = true;
          typeTimer = setTimeout(tick, 2100);
          return;
        }
        typeTimer = setTimeout(tick, 46 + Math.random() * 50);
      } else {
        charIdx--;
        el.textContent = current.slice(0, charIdx);
        if (charIdx === 0) {
          deleting = false;
          roleIdx = (roleIdx + 1) % roles.length;
        }
        typeTimer = setTimeout(tick, 22);
      }
    }
    tick();
  }

  /* ============ REVEAL ON SCROLL ============ */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("in");
        io.unobserve(entry.target);
        if (entry.target.querySelector && entry.target.querySelector(".stat-num[data-count]")) {
          animateCounters(entry.target);
        }
      }
    });
  }, { threshold: 0.12 });

  function observeReveals(scope) {
    (scope || document).querySelectorAll(".reveal:not(.in)").forEach(function (el) { io.observe(el); });
  }
  observeReveals(document);

  /* ============ STAT COUNTERS ============ */
  var countersDone = false;
  function animateCounters(scope) {
    if (countersDone) return;
    countersDone = true;
    scope.querySelectorAll(".stat-num[data-count]").forEach(function (el) {
      var target = parseInt(el.getAttribute("data-count"), 10);
      if (reduceMotion) { el.textContent = target; return; }
      var start = null;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / 1200, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }
  // About stats sit inside a .reveal that may already be in view on load;
  // also watch it directly.
  var aboutText = document.querySelector(".about-text");
  if (aboutText) io.observe(aboutText);

  /* ============ NAV ============ */
  var nav = document.getElementById("nav");
  var progress = document.querySelector(".scroll-progress");
  function onScroll() {
    nav.classList.toggle("scrolled", window.scrollY > 30);
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + "%";
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var burger = document.getElementById("navBurger");
  var navLinks = document.getElementById("navLinks");
  if (burger && navLinks) {
    burger.addEventListener("click", function () {
      var open = navLinks.classList.toggle("open");
      burger.classList.toggle("open", open);
      burger.setAttribute("aria-expanded", open);
    });
    navLinks.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        navLinks.classList.remove("open");
        burger.classList.remove("open");
        burger.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ============ CUSTOM CURSOR ============ */
  var dot = document.querySelector(".cursor-dot");
  var ring = document.querySelector(".cursor-ring");
  var hasFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (hasFinePointer && dot && ring && !reduceMotion) {
    var mx = -100, my = -100, rx = -100, ry = -100;
    document.addEventListener("pointermove", function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = "translate(" + (mx - 3.5) + "px," + (my - 3.5) + "px)";
    });
    (function ringLoop() {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      ring.style.transform = "translate(" + (rx - 18) + "px," + (ry - 18) + "px)";
      requestAnimationFrame(ringLoop);
    })();
    document.addEventListener("pointerover", function (e) {
      document.body.classList.toggle("cursor-hover", !!e.target.closest("a, button, .skill-card, .proj-card"));
    });
  } else {
    if (dot) dot.remove();
    if (ring) ring.remove();
  }

  /* ============ CV MODAL ============ */
  var cvModal = document.getElementById("cvModal");
  var cvFrame = document.getElementById("cvFrame");
  var CV_PDF = "assets/cv/oguz-emir-cv.pdf";

  function openCv() {
    if (!cvFrame.getAttribute("src")) {
      cvFrame.setAttribute("src", CV_PDF + "#view=FitH");
    }
    cvModal.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function closeCv() {
    cvModal.hidden = true;
    document.body.style.overflow = "";
  }
  document.querySelectorAll(".cv-open").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      openCv();
    });
  });
  if (cvModal) {
    cvModal.querySelectorAll("[data-cv-close]").forEach(function (el) {
      el.addEventListener("click", closeCv);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !cvModal.hidden) closeCv();
    });
  }

  /* ============ MARQUEE — duplicate content until it can loop seamlessly ============ */
  var marqueeTrack = document.getElementById("marqueeTrack");
  if (marqueeTrack) {
    marqueeTrack.innerHTML += marqueeTrack.innerHTML;
    var guard = 0;
    while (marqueeTrack.scrollWidth < window.innerWidth * 2 && guard++ < 6) {
      marqueeTrack.innerHTML += marqueeTrack.innerHTML;
    }
  }

  /* ============ FOOTER YEAR ============ */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ============================================================
     HERO CANVAS — IK bone chains that reach for the cursor
     (because that's literally the job)
     ============================================================ */
  var canvas = document.getElementById("rigCanvas");
  if (canvas && !reduceMotion) {
    var ctx = canvas.getContext("2d");
    var W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    var mouse = { cx: -1, cy: -1, active: false, lastMove: 0 };
    var chains = [];

    var ACCENT = "198, 244, 50";
    var VIOLET = "148, 120, 255";

    function Chain(ax, ay, segs, len, color, phase) {
      this.ax = ax; this.ay = ay;          // anchor (relative 0..1)
      this.color = color;
      this.phase = phase;
      this.n = segs + 1;
      this.ren = [];                        // joint render positions
      for (var i = 0; i < this.n; i++) this.ren.push({ x: 0, y: 0 });
      this.len = len;                       // relative segment length
      this.tx = 0; this.ty = 0;             // sprung effector target
      this.vx = 0; this.vy = 0;
      this.inited = false;
    }

    Chain.prototype.solve = function (targetX, targetY, tSec) {
      var n = this.n;
      var anchorX = this.ax * W, anchorY = this.ay * H;
      var reach = this.len * Math.min(W, H) * (n - 1);

      if (!this.inited) {
        this.tx = targetX; this.ty = targetY;
        this.inited = true;
      }

      // spring-damped target → fluid motion with a hint of overshoot
      this.vx = (this.vx + (targetX - this.tx) * 0.02) * 0.9;
      this.vy = (this.vy + (targetY - this.ty) * 0.02) * 0.9;
      this.tx += this.vx; this.ty += this.vy;

      // keep the goal inside comfortable reach
      var ddx = this.tx - anchorX, ddy = this.ty - anchorY;
      var dist = Math.max(Math.hypot(ddx, ddy), 0.0001);
      var maxR = reach * 0.82;
      var gx = this.tx, gy = this.ty;
      if (dist > maxR) {
        gx = anchorX + (ddx / dist) * maxR;
        gy = anchorY + (ddy / dist) * maxR;
        ddx = gx - anchorX; ddy = gy - anchorY;
        dist = maxR;
      }

      // spline-IK style body: a cubic Bézier from root to effector whose
      // control points breathe over time — always a clean S-curve, never a
      // taut straight line
      var nxu = -ddy / dist, nyu = ddx / dist;   // unit normal
      var s1 = dist * (0.16 * Math.sin(tSec * 0.45 + this.phase) + 0.11);
      var s2 = dist * (0.16 * Math.sin(tSec * 0.38 + this.phase * 1.7 + 2.1) - 0.11);
      var c1x = anchorX + ddx * 0.33 + nxu * s1;
      var c1y = anchorY + ddy * 0.33 + nyu * s1;
      var c2x = anchorX + ddx * 0.67 + nxu * s2;
      var c2y = anchorY + ddy * 0.67 + nyu * s2;

      for (var i = 0; i < n; i++) {
        var u = i / (n - 1), v = 1 - u;
        var bx = v * v * v * anchorX + 3 * v * v * u * c1x + 3 * v * u * u * c2x + u * u * u * gx;
        var by = v * v * v * anchorY + 3 * v * v * u * c1y + 3 * v * u * u * c2y + u * u * u * gy;
        // subtle traveling ripple, pinned at both ends
        var pin = u * (1 - u) * 4;
        var rip = Math.sin(tSec * 1.1 + this.phase * 2 + u * 5) * dist * 0.02 * pin;
        this.ren[i].x = bx + nxu * rip;
        this.ren[i].y = by + nyu * rip;
      }
    };

    Chain.prototype.draw = function (tSec) {
      var p = this.ren, n = this.n, col = this.color;

      // smooth tapered body — quadratic spline through segment midpoints
      ctx.lineCap = "round";
      for (var i = 0; i < n - 1; i++) {
        var t = i / (n - 1);
        var x0 = i === 0 ? p[0].x : (p[i - 1].x + p[i].x) / 2;
        var y0 = i === 0 ? p[0].y : (p[i - 1].y + p[i].y) / 2;
        var x1 = i === n - 2 ? p[n - 1].x : (p[i].x + p[i + 1].x) / 2;
        var y1 = i === n - 2 ? p[n - 1].y : (p[i].y + p[i + 1].y) / 2;
        ctx.strokeStyle = "rgba(" + col + ", " + (0.18 + t * 0.34) + ")";
        ctx.lineWidth = 1.4 + (1 - t) * 3.8;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(p[i].x, p[i].y, x1, y1);
        ctx.stroke();
      }

      // joint rings, Maya-style wireframe joints
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(" + col + ", 0.38)";
      for (var j = 1; j < n - 1; j++) {
        ctx.beginPath();
        ctx.arc(p[j].x, p[j].y, 2.6, 0, Math.PI * 2);
        ctx.stroke();
      }

      // root controller — rotated square outline
      ctx.save();
      ctx.translate(p[0].x, p[0].y);
      ctx.rotate(Math.PI / 4);
      ctx.strokeStyle = "rgba(" + col + ", 0.5)";
      ctx.lineWidth = 1.2;
      ctx.strokeRect(-8, -8, 16, 16);
      ctx.restore();

      // effector — NURBS-circle controller with manipulator ring + axis ticks
      var e = p[n - 1];
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(tSec * 0.5 + this.phase);
      ctx.strokeStyle = "rgba(" + col + ", 0.85)";
      ctx.lineWidth = 1.4;
      ctx.setLineDash([10, 6]);
      ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(0, 0, 8.5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-19, 0); ctx.lineTo(-11, 0);
      ctx.moveTo(11, 0); ctx.lineTo(19, 0);
      ctx.moveTo(0, -19); ctx.lineTo(0, -11);
      ctx.moveTo(0, 11); ctx.lineTo(0, 19);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = "rgba(" + col + ", 0.9)";
      ctx.beginPath(); ctx.arc(e.x, e.y, 3, 0, Math.PI * 2); ctx.fill();
      var g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, 20);
      g.addColorStop(0, "rgba(" + col + ", 0.2)");
      g.addColorStop(1, "rgba(" + col + ", 0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(e.x, e.y, 20, 0, Math.PI * 2); ctx.fill();
    };

    function buildChains() {
      chains = [
        new Chain(0.06, 1.04, 13, 0.07, ACCENT, 0),
        new Chain(0.32, 1.08, 15, 0.062, VIOLET, 1.9),
        new Chain(0.97, 1.04, 14, 0.068, ACCENT, 4.1),
        new Chain(1.04, 0.32, 12, 0.07, VIOLET, 2.7)
      ];
      if (W < 720) chains = chains.slice(0, 2);
    }

    function resize() {
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildChains();
    }
    resize();
    window.addEventListener("resize", resize);

    // track the pointer in viewport space; convert to canvas space per frame
    // so scrolling can't leave stale coordinates behind
    var hero = canvas.parentElement;
    window.addEventListener("pointermove", function (e) {
      mouse.cx = e.clientX;
      mouse.cy = e.clientY;
      mouse.active = true;
      mouse.lastMove = performance.now();
    }, { passive: true });
    document.documentElement.addEventListener("mouseleave", function () { mouse.active = false; });
    window.addEventListener("blur", function () { mouse.active = false; });

    function drawGrid() {
      ctx.fillStyle = "rgba(233, 235, 242, 0.045)";
      var gap = 44;
      for (var x = gap / 2; x < W; x += gap) {
        for (var y = gap / 2; y < H; y += gap) {
          ctx.fillRect(x, y, 1.4, 1.4);
        }
      }
    }

    function drawFrame(now) {
      ctx.clearRect(0, 0, W, H);
      drawGrid();

      var tSec = now / 1000;
      // fresh canvas-space cursor position every frame (survives scrolling)
      var rect = canvas.getBoundingClientRect();
      var mx = mouse.cx - rect.left, my = mouse.cy - rect.top;
      var inside = mx > -80 && mx < W + 80 && my > -80 && my < H + 80;
      var idle = !mouse.active || !inside || now - mouse.lastMove > 3500;

      for (var i = 0; i < chains.length; i++) {
        var c = chains[i];
        var tx, ty;
        if (idle) {
          // lazy figure-8 wander per chain
          tx = W * 0.5 + Math.sin(tSec * 0.32 + c.phase) * W * 0.3;
          ty = H * 0.42 + Math.sin(tSec * 0.55 + c.phase * 2) * H * 0.22;
        } else {
          // orbit gently around the cursor so effectors don't stack
          tx = mx + Math.cos(tSec * 0.8 + c.phase * 2.4) * 34;
          ty = my + Math.sin(tSec * 0.7 + c.phase * 2.4) * 34;
        }
        c.solve(tx, ty, tSec);
        c.draw(tSec);
      }
    }

    var running = true;
    function loop(now) {
      if (!running) return;
      drawFrame(now);
      requestAnimationFrame(loop);
    }
    // paint one frame immediately so the hero is never empty,
    // then hand off to the rAF loop
    drawFrame(performance.now());
    requestAnimationFrame(loop);

    // pause when hero is off-screen
    new IntersectionObserver(function (entries) {
      var visible = entries[0].isIntersecting;
      if (visible && !running) { running = true; requestAnimationFrame(loop); }
      running = visible;
    }, { threshold: 0.02 }).observe(hero);
  } else if (canvas) {
    canvas.remove();
  }

  /* ============ INIT ============ */
  applyLang();
})();
