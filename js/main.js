/* ==========================================================================
   Oguz Emir · v4
   1. boot + loader        5. hero IK rig (FABRIK)     9.  skill curves
   2. top bar + nav        6. spring letters           10. graph editor playground
   3. reveals + counters   7. page timeline HUD        11. small things
   4. smooth anchors       8. career dopesheet
   ========================================================================== */
(() => {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const pad = (n, l = 4) => String(Math.max(0, Math.round(n))).padStart(l, "0");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(pointer: fine)").matches;
  const root = document.documentElement;
  root.classList.add("js");

  const store = {
    get(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch { /* private mode */ } },
  };

  /* ------------------------------------------------------------------------
     1. BOOT + LOADER — counts frames 0 → 24, then wipes up
     ------------------------------------------------------------------------ */
  const loader = $("#loader");
  const onReady = [];
  function finishLoader() {
    loader.classList.add("is-done");
    setTimeout(() => loader.remove(), 900);
    onReady.forEach((fn) => fn());
  }
  if (reduced || store.get("v4-seen")) {
    loader.remove();
    setTimeout(() => onReady.forEach((fn) => fn()), 30);
  } else {
    store.set("v4-seen", "1");
    const lf = $("#loaderFrame"), lb = $("#loaderBar");
    const t0 = performance.now(), dur = 950;
    const tick = (t) => {
      const p = clamp((t - t0) / dur, 0, 1);
      lf.textContent = pad(p * 24);
      lb.style.width = p * 100 + "%";
      if (p < 1) requestAnimationFrame(tick); else setTimeout(finishLoader, 120);
    };
    requestAnimationFrame(tick);
  }

  /* ------------------------------------------------------------------------
     2. TOP BAR + MOBILE MENU
     ------------------------------------------------------------------------ */
  const top = $("#top"), nav = $("#nav"), menuBtn = $("#menuBtn");
  const setMenu = (open) => {
    nav.classList.toggle("is-open", open);
    top.classList.toggle("menu-open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };
  menuBtn.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
  addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

  /* ------------------------------------------------------------------------
     3. REVEALS + COUNTERS
     ------------------------------------------------------------------------ */
  const counters = new WeakSet();
  function runCounter(el) {
    if (counters.has(el)) return;
    counters.add(el);
    const to = +el.dataset.count, from = +(el.dataset.from || 0);
    if (reduced) { el.textContent = to; return; }
    const t0 = performance.now(), dur = 1400;
    const step = (t) => {
      const p = clamp((t - t0) / dur, 0, 1);
      const e = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(lerp(from, to, e));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function startReveals() {
    const io = new IntersectionObserver((entries) => {
      let i = 0;
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target;
        el.style.setProperty("--d", (i++ * 0.07).toFixed(2) + "s");
        el.classList.add("in");
        $$("[data-count]", el).forEach(runCounter);
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    $$(".reveal").forEach((el) => io.observe(el));
  }
  onReady.push(startReveals);

  /* ------------------------------------------------------------------------
     4. SMOOTH ANCHORS
     ------------------------------------------------------------------------ */
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute("href").slice(1);
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    e.preventDefault();
    setMenu(false);
    stopPlay();
    const y = id === "hero" ? 0 : target.getBoundingClientRect().top + scrollY - 8;
    scrollTo({ top: y, behavior: reduced ? "auto" : "smooth" });
    history.replaceState(null, "", "#" + id);
  });

  /* ------------------------------------------------------------------------
     5. HERO IK RIG — a FABRIK chain reaching for the cursor
     ------------------------------------------------------------------------ */
  const rig = (() => {
    const hero = $("#hero"), cvs = $("#rig"), ctx = cvs.getContext("2d");
    const hudTx = $("#hudTx"), hudTy = $("#hudTy"), hudFps = $("#hudFps");
    const layers = { skin: true, joints: true, wire: false };
    let W = 0, H = 0, dpr = 1, chains = [], running = false, visible = true;
    let pointer = null, lastMove = -1e9;
    const tgt = { x: 0, y: 0, vx: 0, vy: 0 };
    let hoverCtrl = false, fpsAcc = 0, fpsN = 0, fpsT = 0, t0 = performance.now(), lastT = t0;

    function makeChain(rx, ry, n, total, taper, w0, w1, lagK, lagD, offset) {
      const lens = [];
      let sum = 0;
      for (let i = 0; i < n - 1; i++) { const l = Math.pow(taper, i); lens.push(l); sum += l; }
      for (let i = 0; i < lens.length; i++) lens[i] *= total / sum;
      const pts = [];
      let y = ry;
      pts.push({ x: rx, y });
      for (const l of lens) { y -= l; pts.push({ x: rx, y }); }
      return { root: { x: rx, y: ry }, pts, lens, total, w0, w1, lagK, lagD, offset, bend: 0.36,
        t: { x: rx, y: ry - total * 0.7, vx: 0, vy: 0 } };
    }

    function layout() {
      const r = hero.getBoundingClientRect();
      W = r.width; H = r.height;
      dpr = Math.min(devicePixelRatio || 1, 2);
      cvs.width = Math.round(W * dpr); cvs.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const mobile = W < 860;
      const rx = mobile ? W * 0.82 : W * 0.76;
      const ry = H + 30;
      const L = mobile ? Math.min(H * 0.7, 560) : Math.min(H * 0.92, W * 0.62, 860);
      const s = mobile ? 0.72 : 1;
      chains = [
        makeChain(rx, ry, 15, L, 0.93, 62 * s, 6 * s, 0.10, 0.74, { a: 0, r: 0 }),
      ];
      tgt.x = rx - L * 0.35; tgt.y = H * 0.4;
    }

    // FABRIK with per-joint bend limits, starting from the last pose for continuity
    const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
    function solve(c, tx, ty) {
      const p = c.pts, n = p.length, rx = c.root.x, ry = c.root.y;
      for (let it = 0; it < 12; it++) {
        p[n - 1].x = tx; p[n - 1].y = ty;
        for (let i = n - 2; i >= 0; i--) {
          const ax = p[i].x - p[i + 1].x, ay = p[i].y - p[i + 1].y, l = Math.hypot(ax, ay) || 1e-6;
          p[i].x = p[i + 1].x + ax / l * c.lens[i]; p[i].y = p[i + 1].y + ay / l * c.lens[i];
        }
        p[0].x = rx; p[0].y = ry;
        let pa = -Math.PI / 2; // root points up
        for (let i = 1; i < n; i++) {
          let ang = Math.atan2(p[i].y - p[i - 1].y, p[i].x - p[i - 1].x);
          const lim = i === 1 ? 1.0 : c.bend;
          ang = pa + clamp(wrap(ang - pa), -lim, lim);
          p[i].x = p[i - 1].x + Math.cos(ang) * c.lens[i - 1];
          p[i].y = p[i - 1].y + Math.sin(ang) * c.lens[i - 1];
          pa = ang;
        }
        if (Math.hypot(p[n - 1].x - tx, p[n - 1].y - ty) < 0.5) break;
      }
    }

    function sides(c) {
      const p = c.pts, n = p.length, L = [], R = [];
      for (let i = 0; i < n; i++) {
        const a = p[Math.max(0, i - 1)], b = p[Math.min(n - 1, i + 1)];
        let tx = b.x - a.x, ty = b.y - a.y; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
        const w = lerp(c.w0, c.w1, Math.pow(i / (n - 1), 0.85)) / 2;
        L.push({ x: p[i].x - ty * w, y: p[i].y + tx * w });
        R.push({ x: p[i].x + ty * w, y: p[i].y - tx * w });
      }
      return { L, R };
    }

    function smoothPath(pts, move = true) {
      if (move) ctx.moveTo(pts[0].x, pts[0].y); else ctx.lineTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
      }
      const e = pts[pts.length - 1]; ctx.lineTo(e.x, e.y);
    }

    function drawSkin(c, alpha) {
      const { L, R } = sides(c), p = c.pts, tip = p[p.length - 1];
      ctx.save();
      ctx.globalAlpha = alpha;
      const g = ctx.createLinearGradient(p[0].x, p[0].y, tip.x, tip.y);
      g.addColorStop(0, "#1d1d23"); g.addColorStop(1, "#2a2a32");
      ctx.beginPath();
      smoothPath(L);
      ctx.arc(tip.x, tip.y, Math.max(c.w1 / 2, 1), 0, Math.PI * 2, false);
      smoothPath(R.slice().reverse(), false);
      ctx.closePath();
      ctx.fillStyle = g; ctx.fill();
      // rim light: key colour on one side, cool on the other
      ctx.lineWidth = 1.4;
      const rim = ctx.createLinearGradient(p[0].x, p[0].y, tip.x, tip.y);
      rim.addColorStop(0, "rgba(255,106,43,0)"); rim.addColorStop(.35, "rgba(255,106,43,.75)"); rim.addColorStop(1, "rgba(255,160,110,.9)");
      ctx.beginPath(); smoothPath(L); ctx.strokeStyle = rim; ctx.stroke();
      const rim2 = ctx.createLinearGradient(p[0].x, p[0].y, tip.x, tip.y);
      rim2.addColorStop(0, "rgba(111,195,255,0)"); rim2.addColorStop(1, "rgba(111,195,255,.35)");
      ctx.beginPath(); smoothPath(R); ctx.strokeStyle = rim2; ctx.stroke();
      ctx.restore();
    }

    function drawWire(c, alpha) {
      const { L, R } = sides(c), p = c.pts;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = "rgba(111,195,255,.5)"; ctx.lineWidth = 0.8;
      for (let i = 0; i < p.length; i++) { // edge loops
        ctx.beginPath(); ctx.moveTo(L[i].x, L[i].y); ctx.lineTo(R[i].x, R[i].y); ctx.stroke();
      }
      const mid = p.map((q, i) => ({ x: lerp(L[i].x, R[i].x, 0.25), y: lerp(L[i].y, R[i].y, 0.25) }));
      const mid2 = p.map((q, i) => ({ x: lerp(L[i].x, R[i].x, 0.75), y: lerp(L[i].y, R[i].y, 0.75) }));
      [L, R, mid, mid2].forEach((s) => { ctx.beginPath(); smoothPath(s); ctx.stroke(); });
      ctx.restore();
    }

    function drawJoints(c, alpha, scale) {
      const p = c.pts;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 1.2;
      for (let i = 0; i < p.length - 1; i++) { // Maya-style bone wedges
        const a = p[i], b = p[i + 1], dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
        const nx = -dy / l, ny = dx / l, r = Math.min(7, l * 0.22) * scale;
        const bx = a.x + dx * 0.18, by = a.y + dy * 0.18;
        ctx.beginPath();
        ctx.moveTo(a.x + nx * r * 0.2, a.y + ny * r * 0.2);
        ctx.lineTo(bx + nx * r, by + ny * r);
        ctx.lineTo(b.x, b.y);
        ctx.lineTo(bx - nx * r, by - ny * r);
        ctx.lineTo(a.x - nx * r * 0.2, a.y - ny * r * 0.2);
        ctx.closePath();
        ctx.fillStyle = "rgba(111,195,255,.08)"; ctx.fill();
        ctx.strokeStyle = "rgba(111,195,255,.75)"; ctx.stroke();
      }
      for (let i = 0; i < p.length; i++) {
        const r = (i === 0 ? 6 : 4) * scale;
        ctx.beginPath(); ctx.arc(p[i].x, p[i].y, r, 0, Math.PI * 2);
        ctx.fillStyle = "#0d0d0f"; ctx.fill();
        ctx.strokeStyle = i === p.length - 1 ? "#f4d35e" : "rgba(111,195,255,.95)"; ctx.stroke();
      }
      ctx.restore();
    }

    function drawControl(x, y, t) {
      const r = 26 + Math.sin(t * 2) * 1.5;
      ctx.save();
      // ik handle line (root → effector)
      const c = chains[0];
      ctx.setLineDash([4, 6]); ctx.strokeStyle = "rgba(236,232,225,.16)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(c.root.x, c.root.y); ctx.lineTo(x, y); ctx.stroke();
      ctx.setLineDash([]);
      // NURBS circle control, slightly tilted like a perspective view
      ctx.translate(x, y);
      ctx.strokeStyle = hoverCtrl ? "#f4d35e" : "#ff6a2b"; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.55, -0.35, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.moveTo(0, -8); ctx.lineTo(0, 8); ctx.stroke();
      ctx.font = "500 10px 'JetBrains Mono', monospace";
      ctx.fillStyle = hoverCtrl ? "#f4d35e" : "rgba(255,106,43,.9)";
      ctx.fillText("ctrl_hand_IK", r + 8, -r * 0.35);
      ctx.restore();
    }

    function frame(now) {
      if (!running) return;
      const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
      const t = (now - t0) / 1000;
      const k = dt * 60;

      // where does the effector want to be?
      let gx, gy;
      const idle = !pointer || now - lastMove > 2600;
      if (idle) {
        const c = chains[0];
        gx = c.root.x - c.total * 0.42 + Math.sin(t * 0.55) * c.total * 0.32;
        gy = c.root.y - c.total * 0.62 + Math.sin(t * 1.1) * c.total * 0.14;
      } else { gx = pointer.x; gy = pointer.y; }

      // springy follow = overlapping action for free
      const kk = idle ? 0.03 : 0.11, dd = idle ? 0.86 : 0.72;
      tgt.vx = (tgt.vx + (gx - tgt.x) * kk * k) * Math.pow(dd, k);
      tgt.vy = (tgt.vy + (gy - tgt.y) * kk * k) * Math.pow(dd, k);
      tgt.x += tgt.vx * k; tgt.y += tgt.vy * k;

      ctx.clearRect(0, 0, W, H);

      // secondary chains trail behind with an orbit offset
      for (let i = chains.length - 1; i >= 0; i--) {
        const c = chains[i];
        let ax = tgt.x, ay = tgt.y;
        if (i > 0) { // aim the same way as the main chain, near full extension, with a lazy orbit
          const a = c.offset.a + t * 0.7;
          let dx = tgt.x - c.root.x, dy = tgt.y - c.root.y; const l = Math.hypot(dx, dy) || 1;
          const reach = c.total * (0.8 + Math.sin(a * 0.7) * 0.08);
          ax = c.root.x + dx / l * reach + Math.cos(a) * c.offset.r * 0.5;
          ay = c.root.y + dy / l * reach + Math.sin(a) * c.offset.r * 0.35;
        }
        c.t.vx = (c.t.vx + (ax - c.t.x) * c.lagK * k) * Math.pow(c.lagD, k);
        c.t.vy = (c.t.vy + (ay - c.t.y) * c.lagK * k) * Math.pow(c.lagD, k);
        c.t.x += c.t.vx * k; c.t.y += c.t.vy * k;
        if (i === 0) { c.t.x = tgt.x; c.t.y = tgt.y; }
        solve(c, c.t.x, c.t.y);
        const main = i === 0, a1 = main ? 1 : 0.55;
        if (layers.skin) drawSkin(c, a1);
        if (layers.wire) drawWire(c, main ? 0.9 : 0.5);
        if (layers.joints) drawJoints(c, main ? 1 : 0.5, main ? 1 : 0.7);
      }
      drawControl(tgt.x, tgt.y, t);

      // HUD readouts (in "cm" from the root)
      const c0 = chains[0];
      hudTx.textContent = ((tgt.x - c0.root.x) / 10).toFixed(2);
      hudTy.textContent = ((c0.root.y - tgt.y) / 10).toFixed(2);
      fpsAcc += dt; fpsN++;
      if (now - fpsT > 500) { hudFps.textContent = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; fpsT = now; }

      requestAnimationFrame(frame);
    }

    function setPointer(cx, cy) {
      const r = cvs.getBoundingClientRect();
      pointer = { x: cx - r.left, y: cy - r.top };
      lastMove = performance.now();
      hoverCtrl = Math.hypot(pointer.x - tgt.x, pointer.y - tgt.y) < 40;
    }
    hero.addEventListener("pointermove", (e) => { if (e.pointerType === "mouse" || e.pointerType === "pen") setPointer(e.clientX, e.clientY); });
    hero.addEventListener("pointerleave", () => { lastMove = -1e9; });
    hero.addEventListener("touchstart", (e) => setPointer(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    hero.addEventListener("touchmove", (e) => setPointer(e.touches[0].clientX, e.touches[0].clientY), { passive: true });

    $$(".rig-tools [data-layer]").forEach((b) => b.addEventListener("click", () => {
      const k = b.dataset.layer;
      layers[k] = !layers[k];
      if (!layers.skin && !layers.joints && !layers.wire) layers.joints = true, $('[data-layer="joints"]').classList.add("is-on");
      b.classList.toggle("is-on", layers[k]);
      b.setAttribute("aria-pressed", String(layers[k]));
      $$(".rig-tools [data-layer]").forEach((x) => x.setAttribute("aria-pressed", String(layers[x.dataset.layer])));
    }));

    function start() { if (!running && visible && !document.hidden) { running = true; lastT = performance.now(); requestAnimationFrame(frame); } }
    function stop() { running = false; }
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; visible ? start() : stop(); }).observe(hero);
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
    let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(layout, 120); });

    layout();
    if (reduced) { // one still pose, no loop
      chains.forEach((c) => solve(c, tgt.x, tgt.y));
      running = true; frame(performance.now()); running = false;
    } else start();
    return { layout };
  })();

  /* ------------------------------------------------------------------------
     6. SPRING LETTERS — the name is rigged too
     ------------------------------------------------------------------------ */
  const springs = (() => {
    const chars = [];
    $$("[data-spring]").forEach((el) => {
      const text = el.textContent;
      el.textContent = "";
      el.setAttribute("aria-hidden", el.closest("[aria-label]") ? "true" : "false");
      if (el.getAttribute("aria-hidden") === "false") el.setAttribute("aria-label", text), el.removeAttribute("aria-hidden");
      [...text].forEach((ch) => {
        const s = document.createElement("span");
        s.className = "spring-ch";
        s.textContent = ch;
        if (!el.hasAttribute("aria-hidden")) s.setAttribute("aria-hidden", "true");
        el.appendChild(s);
        chars.push({ el: s, y: 0, vy: 0, r: 0, vr: 0 });
      });
    });
    let running = false, last = { x: 0, y: 0, t: 0 }, prevT = 0, acc = 0;

    function loop(now) {
      let energy = 0;
      // fixed 60 Hz steps so the settle looks the same at any frame rate
      acc += Math.min(0.1, (now - (prevT || now)) / 1000); prevT = now;
      let steps = 0;
      while (acc >= 1 / 60 && steps < 8) {
        acc -= 1 / 60; steps++;
        for (const c of chars) {
          c.vy += -c.y * 0.12; c.vy *= 0.8; c.y += c.vy;
          c.vr += -c.r * 0.1; c.vr *= 0.82; c.r += c.vr;
        }
      }
      for (const c of chars) {
        const st = clamp(Math.abs(c.vy) * 0.012, 0, 0.3);
        c.el.style.transform = `translateY(${c.y.toFixed(2)}px) rotate(${c.r.toFixed(2)}deg) scale(${(1 - st * 0.6).toFixed(3)}, ${(1 + st).toFixed(3)})`;
        energy += Math.abs(c.y) + Math.abs(c.vy) + Math.abs(c.r) + Math.abs(c.vr);
      }
      if (energy > 0.05) requestAnimationFrame(loop);
      else { running = false; prevT = 0; acc = 0; chars.forEach((c) => (c.el.style.transform = "")); }
    }
    const kick = () => { if (!running) { running = true; prevT = 0; requestAnimationFrame(loop); } };

    if (!reduced && finePointer) {
      addEventListener("pointermove", (e) => {
        const dx = e.clientX - last.x, dy = e.clientY - last.y;
        last = { x: e.clientX, y: e.clientY };
        if (Math.abs(dx) + Math.abs(dy) < 1) return;
        let hit = false;
        for (const c of chars) {
          const r = c.el.getBoundingClientRect();
          if (r.bottom < 0 || r.top > innerHeight) continue;
          const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
          const d = Math.hypot(e.clientX - cx, e.clientY - cy), R = Math.max(90, r.height * 0.7);
          if (d < R) {
            const f = 1 - d / R;
            c.vy += clamp(dy, -40, 40) * 0.35 * f;
            c.vr += clamp(dx, -40, 40) * 0.18 * f;
            hit = true;
          }
        }
        if (hit) kick();
      }, { passive: true });
    }

    // intro: letters drop in and settle (pose → overshoot → settle)
    function drop() {
      if (reduced) return;
      $$(".hero__title .spring-ch").forEach((s, i) => {
        const c = chars.find((x) => x.el === s);
        c.y = -window.innerHeight * 0.35 - i * 26; c.vy = 0; c.r = (i % 2 ? 1 : -1) * (8 + i * 2);
        s.style.transform = `translateY(${c.y}px)`;
      });
      setTimeout(kick, 60);
    }
    return { drop, kick };
  })();
  onReady.unshift(springs.drop);

  /* ------------------------------------------------------------------------
     7. PAGE TIMELINE — scroll is the playhead, sections are keys
     ------------------------------------------------------------------------ */
  const FRAMES = 720; // 30 s @ 24 fps
  const tb = $("#timebar"), ruler = $("#tbRuler"), head = $("#tbHead"), headNum = $("#tbHeadNum");
  const tbFrame = $("#tbFrame"), tbShot = $("#tbShot"), tbKeys = $("#tbKeys"), tbTicks = $("#tbTicks");
  const navLinks = $$(".nav a");
  const sections = $$("[data-key]");
  $("#tbTotal").textContent = pad(FRAMES);
  let keys = [], maxScroll = 1;

  function measure() {
    maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    keys = sections.map((s, i) => ({
      el: s, name: s.dataset.key, shot: s.dataset.shot,
      p: i === 0 ? 0 : clamp((s.getBoundingClientRect().top + scrollY) / maxScroll, 0, 1),
    }));
    tbKeys.innerHTML = "";
    keys.forEach((k) => {
      const b = document.createElement("button");
      b.className = "tb-key";
      b.style.left = k.p * 100 + "%";
      b.setAttribute("aria-label", `Jump to ${k.name}`);
      b.innerHTML = `<span>${k.shot} · ${k.name}</span>`;
      b.addEventListener("pointerdown", (e) => e.stopPropagation());
      b.addEventListener("click", () => { stopPlay(); scrollTo({ top: k.p * maxScroll, behavior: reduced ? "auto" : "smooth" }); });
      k.btn = b;
      tbKeys.appendChild(b);
    });
    // frame range labels in section heads
    keys.forEach((k, i) => {
      const next = keys[i + 1] ? keys[i + 1].p : 1;
      const r = $("[data-range]", k.el);
      if (r) r.textContent = `f ${pad(k.p * FRAMES)} – ${pad(next * FRAMES)}`;
    });
    // ruler ticks
    const w = ruler.clientWidth, step = w < 500 ? 48 : 24;
    tbTicks.innerHTML = "";
    for (let f = 0; f <= FRAMES; f += step / 2) {
      const i = document.createElement("i");
      if (f % (step * 2) === 0) i.className = "maj";
      i.style.left = (f / FRAMES) * 100 + "%";
      tbTicks.appendChild(i);
    }
    update();
  }

  let ticking = false;
  function update() {
    ticking = false;
    const p = clamp(scrollY / maxScroll, 0, 1);
    const f = p * FRAMES;
    head.style.left = p * 100 + "%";
    headNum.textContent = Math.round(f);
    tbFrame.textContent = pad(f);
    ruler.setAttribute("aria-valuenow", Math.round(p * 100));
    let cur = keys[0];
    for (const k of keys) { if (p + 0.002 >= k.p) cur = k; k.btn && k.btn.classList.toggle("is-past", p + 0.002 >= k.p); }
    if (cur) {
      tbShot.textContent = `${cur.shot} · ${cur.name}`;
      navLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === "#" + cur.el.id));
    }
    top.classList.toggle("is-scrolled", scrollY > 20);
  }
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  let mt; addEventListener("resize", () => { clearTimeout(mt); mt = setTimeout(measure, 150); });
  addEventListener("load", measure);
  if (document.fonts) document.fonts.ready.then(measure);
  measure();

  // scrubbing
  function scrubTo(clientX) {
    const r = ruler.getBoundingClientRect();
    const p = clamp((clientX - r.left) / r.width, 0, 1);
    scrollTo(0, p * maxScroll);
  }
  ruler.addEventListener("pointerdown", (e) => {
    stopPlay();
    ruler.setPointerCapture(e.pointerId);
    scrubTo(e.clientX);
    const mv = (ev) => scrubTo(ev.clientX);
    const up = () => { ruler.removeEventListener("pointermove", mv); ruler.removeEventListener("pointerup", up); ruler.removeEventListener("pointercancel", up); };
    ruler.addEventListener("pointermove", mv);
    ruler.addEventListener("pointerup", up);
    ruler.addEventListener("pointercancel", up);
  });
  ruler.addEventListener("keydown", (e) => {
    const d = { ArrowRight: 0.02, ArrowLeft: -0.02, PageDown: 0.1, PageUp: -0.1 }[e.key];
    if (d === undefined) return;
    e.preventDefault();
    scrollTo(0, clamp(scrollY / maxScroll + d, 0, 1) * maxScroll);
  });

  // playback: the page plays itself like a shot
  const speeds = [0.5, 1, 2]; let speedI = 1;
  let playing = false, playPos = 0, playLast = 0;
  const BASE = 120; // px per second at 1×
  function playLoop(t) {
    if (!playing) return;
    const dt = Math.min(0.05, (t - playLast) / 1000); playLast = t;
    if (Math.abs(scrollY - playPos) > 4) playPos = scrollY; // user nudged it, follow along
    playPos += BASE * speeds[speedI] * dt;
    if (playPos >= maxScroll) { scrollTo(0, maxScroll); stopPlay(); toast("End of shot. Frame " + FRAMES); return; }
    scrollTo(0, playPos);
    requestAnimationFrame(playLoop);
  }
  function startPlay() {
    if (playing) return;
    if (scrollY >= maxScroll - 2) scrollTo(0, 0);
    playing = true; playPos = scrollY; playLast = performance.now();
    tb.classList.add("is-playing");
    $("#tbPlay").setAttribute("aria-label", "Pause (Space)");
    requestAnimationFrame(playLoop);
  }
  function stopPlay() {
    if (!playing) return;
    playing = false;
    tb.classList.remove("is-playing");
    $("#tbPlay").setAttribute("aria-label", "Play the page (Space)");
  }
  $("#tbPlay").addEventListener("click", () => (playing ? stopPlay() : startPlay()));
  $("#tbSpeed").addEventListener("click", (e) => { speedI = (speedI + 1) % speeds.length; e.currentTarget.textContent = speeds[speedI] + "×"; });
  addEventListener("wheel", stopPlay, { passive: true });
  addEventListener("touchstart", (e) => { if (!tb.contains(e.target)) stopPlay(); }, { passive: true });

  function jumpKey(dir) {
    const p = scrollY / maxScroll;
    const list = dir > 0 ? keys.filter((k) => k.p > p + 0.004) : keys.filter((k) => k.p < p - 0.004).reverse();
    const k = list[0] || (dir > 0 ? keys[keys.length - 1] : keys[0]);
    stopPlay();
    scrollTo({ top: k.p * maxScroll, behavior: reduced ? "auto" : "smooth" });
  }
  addEventListener("keydown", (e) => {
    const tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || e.target.isContentEditable || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.code === "Space" && tag !== "button" && tag !== "a" && !e.target.closest("[role=slider]")) {
      e.preventDefault(); playing ? stopPlay() : startPlay();
    } else if (e.key === "," || e.key === ".") {
      jumpKey(e.key === "." ? 1 : -1);
    } else if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End"].includes(e.key)) {
      stopPlay();
    }
  });

  /* ------------------------------------------------------------------------
     8. CAREER DOPESHEET
     ------------------------------------------------------------------------ */
  (() => {
    const sheet = $("#sheet"); if (!sheet) return;
    const ym = (s) => { const [y, m] = s.split("-").map(Number); return y * 12 + (m - 1); };
    const d = new Date(), now = d.getFullYear() * 12 + d.getMonth() + d.getDate() / 31;
    const from = ym(sheet.dataset.from), to = Math.max(ym(sheet.dataset.to), Math.ceil(now) + 2), span = to - from;
    const pct = (m) => ((m - from) / span) * 100;

    // ruler: years + months
    const ruler = $("#sheetRuler");
    for (let m = Math.ceil(from / 12) * 12; m < to; m += 12) {
      const y = document.createElement("span"); y.className = "yr"; y.style.left = pct(m) + "%"; y.textContent = "'" + String(m / 12).slice(2);
      ruler.appendChild(y);
    }
    for (let m = from; m < to; m += 3) {
      if (m % 12 === 0) continue;
      const t = document.createElement("span"); t.className = "mo"; t.style.left = pct(m) + "%"; ruler.appendChild(t);
    }
    // year grid lines across the lanes
    const lines = document.createElement("div"); lines.className = "sheet__lines"; lines.setAttribute("aria-hidden", "true");
    for (let m = Math.ceil(from / 12) * 12; m < to; m += 12) { const l = document.createElement("i"); l.style.left = pct(m) + "%"; lines.appendChild(l); }
    sheet.insertBefore(lines, ruler.nextSibling);
    $("#sheetNow").style.left = `calc(var(--label-w) + (100% - var(--label-w)) * ${pct(now) / 100})`;

    $$(".track", sheet).forEach((tr, i) => {
      const s = ym(tr.dataset.start), e = tr.dataset.end === "now" ? now : ym(tr.dataset.end) + 1;
      if (tr.dataset.end === "now") tr.classList.add("is-now");
      const bar = $(".track__bar", tr);
      bar.style.setProperty("--s", pct(s) + "%");
      bar.style.setProperty("--w", Math.max(0.8, pct(e) - pct(s)) + "%");
      bar.style.setProperty("--td", (0.15 + i * 0.09).toFixed(2) + "s");
      const body = $(".track__body", tr), inner = document.createElement("div");
      inner.className = "track__inner";
      while (body.firstChild) inner.appendChild(body.firstChild);
      body.appendChild(inner);
      const btn = $(".track__head", tr);
      const id = "trk" + i; inner.id = id; btn.setAttribute("aria-controls", id);
      const toggle = () => {
        const open = !tr.classList.contains("is-open");
        tr.classList.toggle("is-open", open);
        btn.setAttribute("aria-expanded", String(open));
        setTimeout(measure, 520);
      };
      btn.addEventListener("click", toggle);
      $(".track__lane", tr).addEventListener("click", toggle);
    });
  })();

  /* ------------------------------------------------------------------------
     9. SKILL CURVES — tiny animation curves with a ball riding them
     ------------------------------------------------------------------------ */
  $$(".curve[data-curve]").forEach((svg, n) => {
    const pts = svg.dataset.curve.split(" ").map((p) => p.split(",").map(Number));
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) { // flat tangents at every key, like a clamped curve
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], dx = (x1 - x0) * 0.45;
      d += ` C${x0 + dx},${y0} ${x1 - dx},${y1} ${x1},${y1}`;
    }
    const path = svg.querySelector("path");
    path.setAttribute("d", d);
    path.id = "cv" + n;
    const NS = "http://www.w3.org/2000/svg";
    pts.forEach(([x, y]) => {
      const c = document.createElementNS(NS, "circle");
      c.setAttribute("cx", x); c.setAttribute("cy", y); c.setAttribute("r", 2.6);
      svg.appendChild(c);
    });
    const len = path.getTotalLength();
    path.style.strokeDasharray = len; path.style.strokeDashoffset = len;
    path.style.transition = "stroke-dashoffset 1.4s cubic-bezier(.65,0,.35,1) .2s";
    if (!reduced) {
      const ball = document.createElementNS(NS, "circle");
      ball.setAttribute("r", 3.4); ball.setAttribute("class", "ball");
      ball.innerHTML = `<animateMotion dur="${2.2 + (n % 3) * 0.4}s" repeatCount="indefinite" calcMode="spline" keyTimes="0;1" keySplines=".65 0 .35 1"><mpath href="#cv${n}"/></animateMotion>`;
      svg.appendChild(ball);
    }
    const card = svg.closest(".reveal");
    const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { path.style.strokeDashoffset = 0; io.disconnect(); } }, { threshold: 0.4 });
    io.observe(card || svg);
  });

  /* ------------------------------------------------------------------------
     10. GRAPH EDITOR PLAYGROUND
     ------------------------------------------------------------------------ */
  (() => {
    const svg = $("#geSvg"); if (!svg) return;
    const NS = "http://www.w3.org/2000/svg";
    // plot space: x 0..240 = frames 0..24, value 1 at y=40, value 0 at y=180
    const X = (u) => u * 240, Y = (v) => 180 - v * 140;
    const U = (x) => x / 240, V = (y) => (180 - y) / 140;
    svg.setAttribute("viewBox", "-16 -28 272 272");
    const P = { x1: 0.65, y1: 0, x2: 0.35, y2: 1 };
    const opts = { onion: true, squash: true, arc: false };

    // grid
    const grid = $("#geGrid");
    for (let f = 0; f <= 24; f += 2) {
      const l = document.createElementNS(NS, "line");
      l.setAttribute("x1", X(f / 24)); l.setAttribute("x2", X(f / 24)); l.setAttribute("y1", -20); l.setAttribute("y2", 226);
      if (f === 0) l.setAttribute("class", "axis");
      grid.appendChild(l);
      if (f % 4 === 0) {
        const t = document.createElementNS(NS, "text");
        t.setAttribute("x", X(f / 24)); t.setAttribute("y", 238); t.setAttribute("text-anchor", "middle"); t.textContent = f;
        grid.appendChild(t);
      }
    }
    [-0.25, 0, 0.25, 0.5, 0.75, 1, 1.25].forEach((v) => {
      const l = document.createElementNS(NS, "line");
      l.setAttribute("x1", 0); l.setAttribute("x2", 240); l.setAttribute("y1", Y(v)); l.setAttribute("y2", Y(v));
      if (v === 0 || v === 1) l.setAttribute("class", "axis");
      grid.appendChild(l);
    });
    const keysEl = $$(".ge-key", svg);
    keysEl[0].setAttribute("cx", X(0)); keysEl[0].setAttribute("cy", Y(0));
    keysEl[1].setAttribute("cx", X(1)); keysEl[1].setAttribute("cy", Y(1));

    const ticksG = $("#geTicks"), ticks = [];
    for (let f = 0; f <= 24; f++) {
      const c = document.createElementNS(NS, "circle"); c.setAttribute("r", 1.8); c.setAttribute("class", "ge-tick");
      ticksG.appendChild(c); ticks.push(c);
    }

    // cubic-bezier easing: solve x(t) = u for t, return y(t)
    const bz = (t, a, b) => 3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t;
    const dbz = (t, a, b) => 3 * (1 - t) * (1 - t) * a + 6 * (1 - t) * t * (b - a) + 3 * t * t * (1 - b);
    function ease(u) {
      if (u <= 0) return 0; if (u >= 1) return 1;
      let t = u;
      for (let i = 0; i < 8; i++) { const x = bz(t, P.x1, P.x2) - u, d = dbz(t, P.x1, P.x2); if (Math.abs(x) < 1e-5) break; if (Math.abs(d) < 1e-6) break; t -= x / d; }
      if (t < 0 || t > 1 || Math.abs(bz(t, P.x1, P.x2) - u) > 1e-3) { // fall back to bisection
        let lo = 0, hi = 1; t = u;
        for (let i = 0; i < 30; i++) { const x = bz(t, P.x1, P.x2); if (x < u) lo = t; else hi = t; t = (lo + hi) / 2; }
      }
      return bz(t, P.y1, P.y2);
    }

    const h1 = $("#geH1"), h2 = $("#geH2"), code = $("#geCode");
    function draw() {
      $("#geCurve").setAttribute("d", `M${X(0)},${Y(0)} C${X(P.x1)},${Y(P.y1)} ${X(P.x2)},${Y(P.y2)} ${X(1)},${Y(1)}`);
      $("#geTan1").setAttribute("d", `M${X(0)},${Y(0)} L${X(P.x1)},${Y(P.y1)}`);
      $("#geTan2").setAttribute("d", `M${X(1)},${Y(1)} L${X(P.x2)},${Y(P.y2)}`);
      h1.setAttribute("cx", X(P.x1)); h1.setAttribute("cy", Y(P.y1));
      h2.setAttribute("cx", X(P.x2)); h2.setAttribute("cy", Y(P.y2));
      ticks.forEach((c, f) => { c.setAttribute("cx", X(f / 24)); c.setAttribute("cy", Y(ease(f / 24))); });
      const r = (n) => (+n.toFixed(2)).toString().replace(/^(-?)0\./, "$1.");
      code.textContent = `cubic-bezier(${r(P.x1)},${r(P.y1)},${r(P.x2)},${r(P.y2)})`;
      h1.setAttribute("aria-valuetext", `${r(P.x1)}, ${r(P.y1)}`);
      h2.setAttribute("aria-valuetext", `${r(P.x2)}, ${r(P.y2)}`);
    }
    const setP = (which, u, v) => {
      P["x" + which] = clamp(u, 0, 1);
      P["y" + which] = clamp(v, -0.35, 1.35);
      $$("[data-preset]").forEach((b) => b.classList.remove("is-on"));
      draw();
    };

    // dragging handles
    [[h1, 1], [h2, 2]].forEach(([h, which]) => {
      h.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        h.setPointerCapture(e.pointerId); h.classList.add("drag");
        const m = svg.getScreenCTM().inverse(), pt = svg.createSVGPoint();
        const mv = (ev) => { pt.x = ev.clientX; pt.y = ev.clientY; const q = pt.matrixTransform(m); setP(which, U(q.x), V(q.y)); };
        const up = () => { h.classList.remove("drag"); h.removeEventListener("pointermove", mv); h.removeEventListener("pointerup", up); h.removeEventListener("pointercancel", up); };
        h.addEventListener("pointermove", mv); h.addEventListener("pointerup", up); h.addEventListener("pointercancel", up);
      });
      h.addEventListener("keydown", (e) => {
        const s = e.shiftKey ? 0.1 : 0.02;
        const d = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, s], ArrowDown: [0, -s] }[e.key];
        if (!d) return;
        e.preventDefault();
        setP(which, P["x" + which] + d[0], P["y" + which] + d[1]);
      });
    });

    $$("[data-preset]").forEach((b) => b.addEventListener("click", () => {
      const [a, c, d, e] = b.dataset.preset.split(",").map(Number);
      // animate the handles to the preset — the editor eases itself
      const from = { ...P }, t0 = performance.now();
      $$("[data-preset]").forEach((x) => x.classList.toggle("is-on", x === b));
      const step = (t) => {
        const p = clamp((t - t0) / 380, 0, 1), k = 1 - Math.pow(1 - p, 3);
        P.x1 = lerp(from.x1, a, k); P.y1 = lerp(from.y1, c, k); P.x2 = lerp(from.x2, d, k); P.y2 = lerp(from.y2, e, k);
        draw();
        if (p < 1) requestAnimationFrame(step);
      };
      reduced ? (Object.assign(P, { x1: a, y1: c, x2: d, y2: e }), draw()) : requestAnimationFrame(step);
    }));
    $$("[data-opt]").forEach((b) => b.addEventListener("click", () => {
      const k = b.dataset.opt; opts[k] = !opts[k];
      b.classList.toggle("is-on", opts[k]); b.setAttribute("aria-pressed", String(opts[k]));
    }));
    draw();

    // viewport: the ball
    const cvs = $("#geCanvas"), ctx = cvs.getContext("2d"), frameEl = $("#geFrame"), head = $("#geHead");
    let W = 0, H = 0, running = false, visible = false, t0 = performance.now(), squash = 0, squashV = 0, lastDir = 1;
    function size() {
      const r = cvs.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
      W = r.width; H = r.height; cvs.width = W * dpr; cvs.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const ANIM = 1, HOLD = 0.5, CYCLE = (ANIM + HOLD) * 2; // seconds; 24 frames = 1 s
    function pos(v, dir) {
      const R = Math.min(22, H * 0.08);
      const x0 = W * 0.12, x1 = W * 0.88, base = H * 0.72 - R;
      const vv = dir > 0 ? v : 1 - v;
      const x = lerp(x0, x1, vv);
      const y = base - (opts.arc ? Math.max(0, Math.sin(Math.PI * clamp(v, 0, 1))) * H * 0.42 : 0);
      return { x, y, R };
    }
    function drawBall(x, y, R, sx, sy, ang, alpha, fill, stroke) {
      ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(ang); ctx.scale(sx, sy);
      ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2);
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.lineWidth = 1.2 / Math.max(sx, sy); ctx.strokeStyle = stroke; ctx.stroke(); }
      ctx.restore();
    }
    let prev = null;
    function loop(now) {
      if (!running) return;
      const T = ((now - t0) / 1000) % CYCLE;
      const dir = T < ANIM + HOLD ? 1 : -1;
      const local = T % (ANIM + HOLD);
      const u = clamp(local / ANIM, 0, 1);
      const v = ease(u);
      const frameNo = Math.min(24, Math.floor(u * 24) + 1);
      frameEl.textContent = String(frameNo).padStart(2, "0");
      head.setAttribute("cx", X(u)); head.setAttribute("cy", Y(v));

      ctx.clearRect(0, 0, W, H);
      const ground = H * 0.72;
      ctx.strokeStyle = "rgba(255,255,255,.12)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(W * 0.06, ground); ctx.lineTo(W * 0.94, ground); ctx.stroke();

      // onion skin: one ghost per frame, spacing tells the story
      if (opts.onion) {
        for (let f = 0; f <= 24; f++) {
          const p = pos(ease(f / 24), dir);
          const isKey = f === 0 || f === 24;
          drawBall(p.x, p.y, p.R, 1, 1, 0, isKey ? 0.9 : 0.35, null, isKey ? "#ff6a2b" : "#6fc3ff");
          ctx.fillStyle = "rgba(111,195,255,.5)";
          ctx.fillRect(p.x - 0.5, ground + 8, 1, isKey ? 10 : 6);
        }
      }
      const p = pos(v, dir);
      // squash & stretch from velocity, plus an impact squash when it lands hard
      let sx = 1, sy = 1, ang = 0;
      if (prev) {
        const vx = p.x - prev.x, vy = p.y - prev.y, sp = Math.hypot(vx, vy);
        if (opts.squash && local <= ANIM) {
          const s = 1 + clamp(sp * 0.035, 0, 0.7);
          sx = s; sy = 1 / Math.sqrt(s); ang = Math.atan2(vy, vx);
        }
        if (local > ANIM && prev.moving && opts.squash) { squashV -= clamp(prev.sp * 0.02, 0, 0.35); }
        prev = { x: p.x, y: p.y, sp, moving: local <= ANIM };
      } else prev = { x: p.x, y: p.y, sp: 0, moving: true };
      squashV += -squash * 0.25; squashV *= 0.78; squash += squashV;
      if (opts.squash && Math.abs(squash) > 0.002 && local > ANIM) { const k = 1 + squash; sx = 1 / Math.sqrt(Math.max(0.3, k)); sy = k; ang = 0; }
      if (dir !== lastDir) { prev = null; lastDir = dir; }

      // shadow
      const lift = clamp((ground - p.R - p.y) / (H * 0.42), 0, 1);
      ctx.save(); ctx.globalAlpha = 0.35 * (1 - lift * 0.6); ctx.fillStyle = "#000";
      ctx.beginPath(); ctx.ellipse(p.x, ground, p.R * (1.1 - lift * 0.4), p.R * 0.25, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      // the ball (anchor squash at the ground)
      const yOff = sy !== 1 && ang === 0 ? p.R * (1 - sy) : 0;
      drawBall(p.x, p.y + yOff, p.R, sx, sy, ang, 1, "#ff6a2b", null);
      ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(p.x - p.R * 0.35, p.y + yOff - p.R * 0.35, p.R * 0.22, 0, Math.PI * 2); ctx.fill(); ctx.restore();

      requestAnimationFrame(loop);
    }
    const start = () => { if (!running && visible && !document.hidden) { running = true; requestAnimationFrame(loop); } };
    const stop = () => { running = false; };
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; visible ? (size(), start()) : stop(); }).observe(cvs);
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
    addEventListener("resize", () => { if (visible) size(); });
    size();
  })();

  /* ------------------------------------------------------------------------
     11. SMALL THINGS
     ------------------------------------------------------------------------ */
  const toastEl = $("#toast"); let toastT;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove("show"), 2200);
  }
  $("#copyMail").addEventListener("click", async (e) => {
    const v = e.currentTarget.dataset.copy;
    try { await navigator.clipboard.writeText(v); toast("Email copied. Talk soon."); }
    catch { location.href = "mailto:" + v; }
  });
  $("#year").textContent = new Date().getFullYear();
})();
