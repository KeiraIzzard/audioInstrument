/* ==========================================================================
   main.js — Dynamic Soundtracker (final instrument)
   --------------------------------------------------------------------------
   What this file does, in order:
     1. settings        timings, notes, leaf "tiers" (colour + sound)
     2. helpers         random + geometry utilities
     3. layout          where the trunk, boughs and leaves sit for any screen size
     4. drawing         the branches, painted on a <canvas> (theme-aware)
     5. leaves          the real <button> elements and their random shapes
     6. sound           click-to-toggle layered soundscape (Tone.js + looping samples)
     7. pomodoro        25 / 5 / 25 / 5 ... / 15 minute timer that grows the tree
     8. interface       buttons, dialog, theme, resize wiring

   Math.random() (the extended technique) is used for: which sound/colour each
   leaf gets (weighted), when each leaf blooms (jittered across the focus
   session), the exact shape of every leaf, the curve of every twig, and where
   each looping sample starts. See documentation.html for the reasoning.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------------------------------------------------------------------
     1. SETTINGS
     --------------------------------------------------------------------- */
  var MINUTE = 60 * 1000;
  var PHASES = {
    focus:      { label: 'Focus',       ms: 25 * MINUTE },
    shortBreak: { label: 'Short break', ms: 5 * MINUTE },
    longBreak:  { label: 'Long break',  ms: 15 * MINUTE }
  };
  var ROUNDS = 4;               // four Pomodoros grow one full tree
  var LEAVES_PER_BOUGH = 4;     // each focus session grows one bough of four leaves
  var DEMO_SPEED = 60;          // demo mode: one real second = one minute
  var GROW_MS = 1700;           // how long a twig takes to draw itself
  var BOUGH_NAMES = ['lower left', 'lower right', 'upper left', 'upper right'];

  // note pool: lower weight = rarer. Notes are all from one pentatonic scale
  // (C D E G A), so any combination of held leaves still sounds consonant.
  var NOTE_POOL = [
    { value: 'C4', weight: 30 },
    { value: 'E4', weight: 25 },
    { value: 'G4', weight: 20 },
    { value: 'D4', weight: 15 },
    { value: 'A4', weight: 10 }
  ];

  // leaf "tiers": each pairs a colour with one looping sample.
  // Colours stay in the green/purple family. lineDark / lineLight are the twig
  // colours for each theme, chosen so the twig always contrasts with the background.
  var TIERS = [
    { id: 'tier1', name: 'deep organ',   weight: 28, c1: '#6b58a0', c2: '#a99bd3', lineDark: '#b3a6d6', lineLight: '#4e3c7e', gain: 0.55, rare: false },
    { id: 'tier2', name: 'mossy organ',  weight: 26, c1: '#4f7556', c2: '#8fb08a', lineDark: '#9cbc94', lineLight: '#35603f', gain: 0.55, rare: false },
    { id: 'tier3', name: 'low hum',      weight: 22, c1: '#7d5f92', c2: '#b9a3cc', lineDark: '#c0a9d6', lineLight: '#5e3f78', gain: 0.50, rare: false },
    { id: 'tier4', name: 'garden chord', weight: 16, c1: '#a9bfa0', c2: '#5e8466', lineDark: '#b7cba3', lineLight: '#3f5e37', gain: 0.50, rare: false },
    { id: 'tier5', name: 'bell',         weight: 8,  c1: '#dfeacf', c2: '#b3a6d6', lineDark: '#e3eed8', lineLight: '#5b4a85', gain: 0.70, rare: true }
  ];

  /* ---------------------------------------------------------------------
     2. HELPERS
     --------------------------------------------------------------------- */
  function $(id) { return document.getElementById(id); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function rand(lo, hi) { return lo + Math.random() * (hi - lo); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function el(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }

  // weighted random choice: roll once, walk the cumulative weights
  function weightedPick(items, weightOf) {
    var total = 0, i;
    for (i = 0; i < items.length; i++) total += weightOf(items[i]);
    var roll = Math.random() * total, acc = 0;
    for (i = 0; i < items.length; i++) {
      acc += weightOf(items[i]);
      if (roll <= acc) return items[i];
    }
    return items[items.length - 1];
  }

  var motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function reduceMotion() { return !!(motionQuery && motionQuery.matches); }
  function themeName() { return window.DSTheme ? window.DSTheme.get() : 'dark'; }
  function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

  // cubic bezier point + derivative
  function bez(p0, p1, p2, p3, t) {
    var m = 1 - t;
    return {
      x: m * m * m * p0.x + 3 * m * m * t * p1.x + 3 * m * t * t * p2.x + t * t * t * p3.x,
      y: m * m * m * p0.y + 3 * m * m * t * p1.y + 3 * m * t * t * p2.y + t * t * t * p3.y
    };
  }
  function bezD(p0, p1, p2, p3, t) {
    var m = 1 - t;
    return {
      x: 3 * m * m * (p1.x - p0.x) + 6 * m * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x),
      y: 3 * m * m * (p1.y - p0.y) + 6 * m * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y)
    };
  }
  function quad(a, c, b, t) {
    var m = 1 - t;
    return { x: m * m * a.x + 2 * m * t * c.x + t * t * b.x, y: m * m * a.y + 2 * m * t * c.y + t * t * b.y };
  }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  /* ---------------------------------------------------------------------
     3. LAYOUT
     The tree is a central trunk with four boughs that sweep out toward the
     left and right edges of the screen (lower-left, lower-right, upper-left,
     upper-right). Each bough carries four leaves, some on short twigs.
     All the randomness is rolled ONCE here ("seeds"), then positions are
     computed from the seeds + current screen size, so the tree keeps its
     exact shape when the window is resized.
     --------------------------------------------------------------------- */
  var seeds = makeSeeds();

  function makeSeeds() {
    var side = [-1, 1, -1, 1];
    var attach = [0.22, 0.34, 0.52, 0.72];     // how high up the trunk each bough leaves it
    var reach = [0.40, 0.37, 0.29, 0.32];      // how far toward the screen edge it extends
    var rise = [0.19, 0.22, 0.17, 0.15];       // how far it climbs, as a fraction of stage height
    var boughs = [], tiles = [], b, k;
    for (b = 0; b < ROUNDS; b++) {
      boughs.push({
        side: side[b], attachT: attach[b],
        reach: reach[b] + rand(-0.025, 0.025), rise: rise[b] + rand(-0.015, 0.015),
        w1: rand(-1, 1), w2: rand(-1, 1)       // wobble of the bough's curve
      });
      for (k = 0; k < LEAVES_PER_BOUGH; k++) {
        var fanBase = [0.30, 0.62, 0.94, 1.26][k];   // angle from straight up, in radians (18 to 72 degrees)
        tiles.push({
          bough: b, k: k, index: b * LEAVES_PER_BOUGH + k, u: 1,
          fan: fanBase + rand(-0.12, 0.12),
          dist: rand(1.45, 2.3),   // twig length, in tile-sizes
          bend: rand(-1, 1),                       // how much the twig bows
          offs: [0, 1].slice(0, 1 + Math.round(Math.random())).map(function () {   // 1-2 short offshoots ending in a glowing node
            return { t: rand(0.35, 0.7), ang: (Math.random() < 0.5 ? -1 : 1) * rand(0.6, 1.1), len: rand(0.35, 0.65) };
          })
        });
      }
    }
    return { boughs: boughs, tiles: tiles };
  }

  function computeLayout(W, H, S, avoid) {
    avoid = avoid || [];
    var cx = W * 0.54, baseY = H - 6, topY = H * 0.20;       // trunk sits a touch right of centre, leaving room for the timer
    var trunk = {
      p0: { x: cx, y: baseY }, p1: { x: cx + W * 0.022, y: baseY - (baseY - topY) * 0.35 },
      p2: { x: cx - W * 0.018, y: baseY - (baseY - topY) * 0.7 }, p3: { x: cx + W * 0.004, y: topY }
    };
    var halfL = cx - S * 0.75, halfR = W - cx - S * 0.75;   // keep bough tips fully on screen
    var boughs = seeds.boughs.map(function (bs) {
      var y0 = baseY + (topY - baseY) * bs.attachT;
      var x3 = cx + bs.side * (bs.side < 0 ? halfL : halfR) * bs.reach;
      var y3 = Math.max(S * 0.85, y0 - H * bs.rise);
      // keep each tip clear of the floating controls (top ones push it down, bottom ones up)
      avoid.forEach(function (r) {
        if (x3 > r.x0 - S && x3 < r.x1 + S * 1.2) {
          if (r.y1 < H * 0.6) y3 = Math.max(y3, r.y1 + S * 2.3);
          else y3 = Math.min(y3, r.y0 - S * 0.5);
        }
      });
      y3 = Math.min(y3, y0 - H * 0.03);
      var dx = x3 - cx, dy = y3 - y0;
      // the bough climbs first, then eases outward, with a little droop or lift at the end
      return {
        p0: { x: cx, y: y0 },
        p1: { x: cx + dx * 0.30 + bs.w1 * W * 0.012, y: y0 + dy * 0.30 + bs.w1 * H * 0.075 },
        p2: { x: cx + dx * 0.66 + bs.w2 * W * 0.012, y: y0 + dy * 0.72 + bs.w2 * H * 0.06 },
        p3: { x: x3, y: y3 }
      };
    });

    var pts = seeds.tiles.map(function (ts) {
      var b = boughs[ts.bough];
      var at = bez(b.p0, b.p1, b.p2, b.p3, 0.97);
      var tan = bezD(b.p0, b.p1, b.p2, b.p3, 0.97);
      var len = Math.sqrt(tan.x * tan.x + tan.y * tan.y) || 1;
      var sd = seeds.boughs[ts.bough].side, d = S * ts.dist;       // tiles fan up and outward from the bough tip
      return { ax: at.x, ay: at.y, x: at.x + sd * Math.sin(ts.fan) * d, y: at.y - Math.cos(ts.fan) * d, tx: tan.x / len, ty: tan.y / len };
    });

    relax(pts, S, W, H, cx, topY, avoid);

    // leaf rotation: the narrow (stem) end of each leaf points back at its branch
    pts.forEach(function (p) {
      var dx = p.ax - p.x, dy = p.ay - p.y;
      p.angle = (dx * dx + dy * dy) < 9 ? Math.atan2(-p.ty, -p.tx) : Math.atan2(dy, dx);
    });

    return { W: W, H: H, S: S, trunk: trunk, boughs: boughs, pts: pts };
  }

  // gently push leaves apart so none overlap, and keep them clear of the
  // trunk and the screen edges
  function relax(pts, S, W, H, cx, topY, avoid) {
    var minDist = S * 1.5, margin = S * 0.95, it, i, j, k, a, b, dx, dy, d, push, r, padd = S * 0.7;
    for (it = 0; it < 40; it++) {
      for (i = 0; i < pts.length; i++) {
        for (j = i + 1; j < pts.length; j++) {
          a = pts[i]; b = pts[j];
          dx = b.x - a.x; dy = b.y - a.y; d = Math.sqrt(dx * dx + dy * dy);
          if (d < minDist && d > 0.01) {
            push = (minDist - d) / 2;
            a.x -= dx / d * push; a.y -= dy / d * push;
            b.x += dx / d * push; b.y += dy / d * push;
          }
        }
      }
      for (i = 0; i < pts.length; i++) {
        a = pts[i];
        if (Math.abs(a.x - cx) < S && a.y > topY - S) a.x += (a.x >= cx ? 1 : -1) * (S - Math.abs(a.x - cx)) * 0.5;
        // slide out of any floating control (timer, sound, demo switch)
        for (k = 0; k < avoid.length; k++) {
          r = avoid[k];
          if (a.x > r.x0 - padd && a.x < r.x1 + padd && a.y > r.y0 - padd && a.y < r.y1 + padd) {
            var toL = a.x - (r.x0 - padd), toR = (r.x1 + padd) - a.x, toT = a.y - (r.y0 - padd), toB = (r.y1 + padd) - a.y;
            var m = Math.min(toL, toR, toT, toB);
            if (m === toT) a.y = r.y0 - padd; else if (m === toB) a.y = r.y1 + padd;
            else if (m === toL) a.x = r.x0 - padd; else a.x = r.x1 + padd;
          }
        }
        a.x = clamp(a.x, margin, W - margin);
        a.y = clamp(a.y, margin, H - margin);
      }
    }
  }

  /* ---------------------------------------------------------------------
     4. DRAWING (canvas)
     Resting branches are always visible (so the tree is never empty); each
     bough "lights up" outward as its leaves bloom, and every new leaf's twig
     draws itself from the branch to the leaf.
     --------------------------------------------------------------------- */
  var stage = $('tree-zone');
  var canvas = $('branch-canvas');
  var ctx = canvas.getContext('2d');
  var layout = null;
  var colours = { trunk: '#a98be0', dim: '#8f6bc0', lit: '#c9dbbb' };
  var boughState = seeds.boughs.map(function () { return { litU: 0, target: 0 }; });

  function readColours() {
    colours.trunk = cssVar('--canvas-trunk') || colours.trunk;
    colours.dim = cssVar('--canvas-dim') || colours.dim;
    colours.lit = cssVar('--canvas-lit') || colours.lit;
  }

  function tileSize() { return parseFloat(cssVar('--tile-size')) || 66; }

  // stroke a list of points with a width that tapers from w0 to w1
  function strokeTaper(points, w0, w1, color) {
    ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (var i = 1; i < points.length; i++) {
      ctx.lineWidth = w0 + (w1 - w0) * (i / (points.length - 1));
      ctx.beginPath(); ctx.moveTo(points[i - 1].x, points[i - 1].y); ctx.lineTo(points[i].x, points[i].y); ctx.stroke();
    }
  }
  function sampleBez(b, t0, t1, n) {
    var out = [], i;
    for (i = 0; i <= n; i++) out.push(bez(b.p0, b.p1, b.p2, b.p3, t0 + (t1 - t0) * (i / n)));
    return out;
  }

  function twigGeometry(t, lp) {
    var A = { x: lp.ax, y: lp.ay }, P = { x: lp.x, y: lp.y };
    var dx = P.x - A.x, dy = P.y - A.y, len = Math.sqrt(dx * dx + dy * dy);
    var nx = len ? -dy / len : 0, ny = len ? dx / len : 0;
    var C = { x: (A.x + P.x) / 2 + nx * t.seed.bend * len * 0.5, y: (A.y + P.y) / 2 + ny * t.seed.bend * len * 0.5 };
    return { A: A, P: P, C: C, len: len };
  }

  // returns true while any animation is still running
  function draw(ts, dt) {
    if (!layout) return false;
    var W = layout.W, H = layout.H, ws = layout.S / 66, busy = false, i;
    ctx.setTransform(canvas._dpr, 0, 0, canvas._dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // trunk
    strokeTaper(sampleBez(layout.trunk, 0, 1, 40), 8 * ws, 3.4 * ws, colours.trunk);

    // resting boughs, then the lit part of each
    for (i = 0; i < layout.boughs.length; i++) {
      var bs = boughState[i];
      if (reduceMotion()) bs.litU = bs.target;
      else {
        bs.litU += (bs.target - bs.litU) * (1 - Math.exp(-dt / 320));
        if (Math.abs(bs.target - bs.litU) > 0.003) busy = true; else bs.litU = bs.target;
      }
      strokeTaper(sampleBez(layout.boughs[i], 0, 1, 50), 3.4 * ws, 1.8 * ws, colours.dim);
      ctx.fillStyle = colours.dim; ctx.beginPath(); ctx.arc(layout.boughs[i].p3.x, layout.boughs[i].p3.y, 3.2 * ws, 0, 6.283); ctx.fill();   // node at the bough tip
      if (bs.litU > 0.01) {
        ctx.save(); ctx.shadowColor = colours.lit; ctx.shadowBlur = 4;
        strokeTaper(sampleBez(layout.boughs[i], 0, bs.litU, Math.max(4, Math.round(60 * bs.litU))), 2.8 * ws, 1.6 * ws, colours.lit);
        if (bs.litU > 0.98) { ctx.fillStyle = colours.lit; ctx.beginPath(); ctx.arc(layout.boughs[i].p3.x, layout.boughs[i].p3.y, 4 * ws, 0, 6.283); ctx.fill(); }
        ctx.restore();
      }
    }

    // twigs
    var theme = themeName();
    for (i = 0; i < tiles.length; i++) {
      var t = tiles[i], lp = layout.pts[i], g = twigGeometry(t, lp);
      if (!t.bloomed) {
        continue;
      }
      var p = reduceMotion() ? 1 : clamp((ts - t.growStart) / GROW_MS, 0, 1);
      if (p < 1) busy = true;
      if (p >= 0.9 && !t.shown) revealLeaf(t);
      if (g.len > 4) {
        var pe = easeOut(p), n = Math.max(2, Math.round(30 * pe)), pts = [], j;
        for (j = 0; j <= n; j++) pts.push(quad(g.A, g.C, g.P, pe * (j / n)));
        var lc = theme === 'light' ? t.tier.lineLight : t.tier.lineDark;
        ctx.save(); ctx.shadowColor = lc; ctx.shadowBlur = theme === 'light' ? 0 : 5;
        strokeTaper(pts, 3.4 * ws, 1.8 * ws, lc);
        // short offshoot twigs ending in a small glowing node (as in the first mockup)
        if (p > 0.6) {
          t.seed.offs.forEach(function (o) {
            var bp = quad(g.A, g.C, g.P, o.t), base = Math.atan2(g.P.y - g.A.y, g.P.x - g.A.x) + o.ang, L = layout.S * o.len * easeOut((p - 0.6) / 0.4);
            var ex = bp.x + Math.cos(base) * L, ey = bp.y + Math.sin(base) * L;
            strokeTaper([bp, { x: (bp.x + ex) / 2 + Math.sin(base) * 3, y: (bp.y + ey) / 2 - Math.cos(base) * 3 }, { x: ex, y: ey }], 2.2 * ws, 1.2 * ws, lc);
            ctx.fillStyle = lc; ctx.beginPath(); ctx.arc(ex, ey, 2.6 * ws, 0, 6.283); ctx.fill();
          });
        }
        ctx.restore();
      }
    }
    return busy;
  }

  var rafId = 0, lastFrame = 0;
  function requestDraw() { if (!rafId) rafId = requestAnimationFrame(frame); }
  function frame(ts) {
    rafId = 0;
    var dt = lastFrame ? Math.min(100, ts - lastFrame) : 16;
    lastFrame = ts;
    if (draw(ts, dt)) requestDraw(); else lastFrame = 0;
  }

  /* ---------------------------------------------------------------------
     5. LEAVES
     Each leaf is a real <button> (keyboard + screen-reader friendly).
     --------------------------------------------------------------------- */
  var tileLayer = $('tile-layer');
  var tiles = [];

  function buildTiles() {
    tileLayer.innerHTML = '';
    tiles = seeds.tiles.map(function (ts, i) {
      var slot = el('div', 'tile-slot');
      var marker = el('span', 'marker'); marker.setAttribute('aria-hidden', 'true');
      var btn = el('button', 'growth-tile');
      btn.type = 'button'; btn.hidden = true; btn.setAttribute('aria-pressed', 'false');
      btn.innerHTML = '<span class="leaf" aria-hidden="true"><span class="halo"></span><span class="edge"></span><span class="shard"></span></span>';
      slot.appendChild(marker); slot.appendChild(btn); tileLayer.appendChild(slot);
      var t = { i: i, seed: ts, slot: slot, btn: btn, bloomed: false, shown: false, playing: false, tier: null, note: null, growStart: 0, voice: null, el: null };
      btn.addEventListener('click', function () { toggleTile(t); });
      return t;
    });
  }

  function leafName(t) { return 'Leaf ' + (t.i + 1) + ' on the ' + BOUGH_NAMES[t.seed.bough] + ' branch'; }

  // a random leaf outline: pointed at both ends, widest near the stem end,
  // with 3-5 soft scallops along each edge (a loose, abstract vine leaf).
  // Drawn pointing along +x; the stem end is at +x and CSS rotates it into place.
  function makeLeafClip() {
    // teardrop "shard": narrow end (+x) faces the branch it grew from (CSS rotates it), full end away,
    // with a little wobble so every tile is a different abstract fragment
    var n = 16, elong = rand(1.1, 1.5), wobble = rand(0.08, 0.2), pts = [], i, minX = 1e9, maxX = -1e9, maxY = 0;
    for (i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2;
      var profile = 0.3 + 0.7 * Math.pow((1 - Math.cos(a)) / 2, 0.6);
      var r = profile * (1 + (Math.random() - 0.5) * wobble * 2);
      var x = Math.cos(a) * r * elong, y = Math.sin(a) * r;
      pts.push([x, y]); minX = Math.min(minX, x); maxX = Math.max(maxX, x); maxY = Math.max(maxY, Math.abs(y));
    }
    var k = 46 / Math.max((maxX - minX) / 2, maxY), mid = (maxX + minX) / 2;
    return 'polygon(' + pts.map(function (p) { return (50 + (p[0] - mid) * k).toFixed(1) + '% ' + (50 + p[1] * k).toFixed(1) + '%'; }).join(',') + ')';
  }

  function pickTier() {
    // "pity" rule: if no rare leaf has bloomed by the halfway mark, the rare
    // sound becomes four times as likely so every tree gets at least one
    var rareSoFar = tiles.some(function (t) { return t.bloomed && t.tier.rare; });
    var bloomedCount = tiles.filter(function (t) { return t.bloomed; }).length;
    return weightedPick(TIERS, function (tier) {
      return (tier.rare && !rareSoFar && bloomedCount >= 8) ? tier.weight * 4 : tier.weight;
    });
  }

  function positionTiles() {
    if (!layout) return;
    tiles.forEach(function (t, i) {
      var lp = layout.pts[i];
      t.slot.style.left = lp.x.toFixed(1) + 'px';
      t.slot.style.top = lp.y.toFixed(1) + 'px';
      t.btn.style.setProperty('--rot', lp.angle.toFixed(3) + 'rad');
    });
  }

  function paintLeafColours() {
    var light = themeName() === 'light';
    tiles.forEach(function (t) {
      if (t.tier) t.btn.style.setProperty('--glow', light ? t.tier.lineLight : t.tier.lineDark);
    });
  }

  function bloom(idx) {
    var t = tiles[idx];
    if (!t || t.bloomed) return;
    t.tier = pickTier();
    t.note = weightedPick(NOTE_POOL, function (n) { return n.weight; }).value;
    t.bloomed = true;
    t.growStart = performance.now();
    t.btn.classList.toggle('rare', t.tier.rare);
    t.btn.style.setProperty('--clip', makeLeafClip());
    t.btn.style.setProperty('--fill', 'linear-gradient(135deg,' + t.tier.c1 + ',' + t.tier.c2 + ')');
    paintLeafColours();
    t.btn.setAttribute('aria-label', leafName(t) + ': ' + (t.tier.rare ? 'rare ' : '') + t.tier.name + ', note ' + t.note);
    boughState[t.seed.bough].target = Math.max(boughState[t.seed.bough].target, t.seed.u);
    var msg = 'A new ' + (t.tier.rare ? 'rare ' : '') + 'leaf bloomed on the ' + BOUGH_NAMES[t.seed.bough] + ' branch. Click it to add its sound.';
    setStatus(msg); announce(msg);
    requestDraw();
  }

  // called once the twig has (almost) finished drawing: show the leaf button
  function revealLeaf(t) {
    t.shown = true;
    t.btn.hidden = false;
    void t.btn.offsetWidth;                    // force a reflow so the fade/scale transition plays
    t.btn.classList.add('in');
    t.slot.classList.add('bloomed');
    t.slot.style.setProperty('--sway-dur', rand(6, 10).toFixed(2) + 's');
    t.slot.style.setProperty('--sway-delay', rand(0, 3).toFixed(2) + 's');
  }

  /* ---------------------------------------------------------------------
     6. SOUND — click a leaf to start its sound, click again to stop it.
     Many leaves can play at once, which is how the soundscape is built.
     Each playing leaf = one sustained synth note (Tone.js) + one looping
     sample. Volumes are rebalanced as layers are added so it never clips.
     --------------------------------------------------------------------- */
  var audio = { ready: false, bus: null, chime: null };
  var master = 0.7;

  function ensureAudio() {
    if (audio.ready || !window.Tone) return audio.ready;
    try {
      window.Tone.start();                     // must be called from a click: browsers block audio until then
      audio.bus = new window.Tone.Filter(2400, 'lowpass').toDestination();   // softens the synth's top end
      audio.chime = new window.Tone.PolySynth(window.Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.02, decay: 0.6, sustain: 0, release: 1.8 }
      });
      audio.chime.volume.value = -14;
      audio.chime.connect(audio.bus);
      audio.ready = true;
      applyMaster();
    } catch (e) { /* audio unavailable: the instrument still works visually */ }
    return audio.ready;
  }

  function applyMaster() {
    if (!audio.ready) return;
    window.Tone.Destination.mute = master === 0;
    if (master > 0) window.Tone.Destination.volume.value = window.Tone.gainToDb(master * master);
  }

  function layerGain() {
    var n = tiles.filter(function (t) { return t.playing; }).length;
    return 1 / Math.sqrt(Math.max(1, n));
  }
  function sampleTarget(t) { return clamp(t.tier.gain * master * layerGain() * 1.2, 0, 1); }

  function fade(media, to, ms, done) {
    clearInterval(media._fade);
    var from = media.volume, steps = Math.max(1, Math.round(ms / 40)), i = 0;
    media._fade = setInterval(function () {
      i++;
      media.volume = clamp(from + (to - from) * (i / steps), 0, 1);
      if (i >= steps) { clearInterval(media._fade); if (done) done(); }
    }, 40);
  }

  function startTile(t) {
    t.playing = true;
    t.btn.setAttribute('aria-pressed', 'true');

    if (audio.ready) {                         // sustained synth note
      if (!t.voice) {
        t.voice = new window.Tone.Synth({
          oscillator: { type: 'sine' },
          envelope: { attack: 1.6, decay: 0.4, sustain: 0.85, release: 3.5 }
        });
        t.voice.volume.value = -24;            // start quiet; rebalance() sets the real level
        t.voice.connect(audio.bus);
      }
      t.voice.triggerAttack(t.note);
    }

    if (!t.el) {                               // looping sample
      t.el = new Audio('sounds/' + t.tier.id + '.wav');
      t.el.loop = true; t.el.preload = 'auto';
    }
    var media = t.el; media.volume = 0;
    var begin = function () {
      if (!t.playing) return;                  // toggled off again before it loaded
      try { if (isFinite(media.duration)) media.currentTime = Math.random() * media.duration; } catch (e) { /* ignore */ }
      var p = media.play();
      if (p && p.catch) p.catch(function () { /* blocked until a click: harmless */ });
      fade(media, sampleTarget(t), 1200);
    };
    if (media.readyState >= 1) begin(); else media.addEventListener('loadedmetadata', begin, { once: true });
  }

  function stopTile(t) {
    t.playing = false;
    t.btn.setAttribute('aria-pressed', 'false');
    if (t.voice) t.voice.triggerRelease();
    if (t.el) { var media = t.el; fade(media, 0, 900, function () { if (!t.playing) media.pause(); }); }
  }

  // as layers are added or removed, ease every playing leaf to its new share of the volume
  function rebalance() {
    var g = layerGain();
    tiles.forEach(function (t) {
      if (!t.playing) return;
      if (t.el) fade(t.el, sampleTarget(t), 600);
      if (t.voice && audio.ready) t.voice.volume.rampTo(-18 + 20 * Math.log10(g), 0.6);
    });
  }

  function playingCount() { return tiles.filter(function (t) { return t.playing; }).length; }

  function refreshSoundUI() {
    var n = playingCount();
    $('playing-count').textContent = n === 0 ? 'No sounds playing'
      : n + (n === 1 ? ' sound' : ' sounds') + ' playing';
    var stop = $('stop-all'); stop.disabled = n === 0;
  }

  function toggleTile(t) {
    ensureAudio();
    if (t.playing) stopTile(t); else startTile(t);
    rebalance();
    refreshSoundUI();
    var n = playingCount();
    announce(leafName(t) + (t.playing ? ' playing. ' : ' stopped. ') + (n === 0 ? 'No sounds playing.' : n + (n === 1 ? ' sound' : ' sounds') + ' layered.'));
  }

  function stopAll(silent) {
    tiles.forEach(function (t) { if (t.playing) stopTile(t); });
    refreshSoundUI();
    if (!silent) announce('All sounds stopped.');
  }

  // soft chime on phase changes (only once audio has been unlocked by a click)
  function chime(notes) {
    if (!audio.ready) return;
    try { audio.chime.triggerAttackRelease(notes, '2n'); } catch (e) { /* ignore */ }
  }

  /* ---------------------------------------------------------------------
     7. POMODORO
     25 min focus -> 5 min break, four times; the fourth break is 15 min.
     Time is measured from the clock (Date.now), not by counting ticks, so it
     stays accurate even if the browser slows a background tab. Leaves bloom
     at random moments inside each focus session.
     --------------------------------------------------------------------- */
  var S = { phase: 'focus', round: 0, elapsed: 0, duration: PHASES.focus.ms, running: false, started: false, complete: false, queue: [], last: 0 };

  // one leaf per quarter of the focus session, each at a random moment inside
  // its quarter: growth is unpredictable but always spread across the session
  function makeBloomQueue(round) {
    var q = [], k;
    for (k = 0; k < LEAVES_PER_BOUGH; k++) {
      q.push({ at: ((k + rand(0.2, 0.8)) / LEAVES_PER_BOUGH) * PHASES.focus.ms, idx: round * LEAVES_PER_BOUGH + k });
    }
    return q;
  }

  function beginFocus(round) {
    S.phase = 'focus'; S.round = round; S.elapsed = 0; S.duration = PHASES.focus.ms;
    S.queue = makeBloomQueue(round);
  }

  function processBlooms() {
    while (S.queue.length && S.queue[0].at <= S.elapsed) bloom(S.queue.shift().idx);
  }

  function nextPhase() {
    var msg;
    if (S.phase === 'focus') {
      S.elapsed = 0; S.queue = [];
      if (S.round >= ROUNDS - 1) {
        S.phase = 'longBreak'; S.duration = PHASES.longBreak.ms;
        msg = 'Session 4 of 4 complete. Your tree is fully grown. Enjoy a 15-minute break and play your soundscape.';
        chime(['C5', 'E5', 'G5', 'C6']);
      } else {
        S.phase = 'shortBreak'; S.duration = PHASES.shortBreak.ms;
        msg = 'Session ' + (S.round + 1) + ' of 4 complete. Take a 5-minute break. Your new leaves are ready to play.';
        chime(['C5', 'E5', 'G5']);
      }
    } else if (S.phase === 'shortBreak') {
      beginFocus(S.round + 1);
      msg = 'Break over. Session ' + (S.round + 1) + ' of 4 has begun. A new branch is starting to grow.';
      chime(['G4', 'C5']);
    } else {
      S.phase = 'complete'; S.complete = true; S.running = false; S.elapsed = 0; S.duration = 1;
      msg = 'All four sessions are done. Reset the tree to grow a new one, or keep playing this one.';
      chime(['C5', 'G5', 'C6']);
    }
    setStatus(msg); announce(msg);
  }

  function advance(deltaMs) {
    while (deltaMs > 0 && !S.complete) {
      var remaining = S.duration - S.elapsed;
      if (deltaMs < remaining) { S.elapsed += deltaMs; processBlooms(); deltaMs = 0; }
      else { S.elapsed = S.duration; processBlooms(); deltaMs -= remaining; nextPhase(); }
    }
    updateUI();
  }

  function tick() {
    if (!S.running) return;
    var now = Date.now();
    var speed = $('demo-speed').checked ? DEMO_SPEED : 1;
    var delta = (now - S.last) * speed;
    S.last = now;
    advance(delta);
  }

  function phaseLabel() {
    if (S.complete) return 'Tree complete';
    return (S.phase === 'focus' ? PHASES.focus : S.phase === 'shortBreak' ? PHASES.shortBreak : PHASES.longBreak).label;
  }

  function updateUI() {
    var remaining = S.complete ? 0 : Math.max(0, S.duration - S.elapsed);
    var secs = Math.ceil(remaining / 1000);
    var text = pad2(Math.floor(secs / 60)) + ':' + pad2(secs % 60);
    $('time').textContent = text;
    $('bar-fill').style.width = (S.complete ? 100 : (S.elapsed / S.duration) * 100).toFixed(1) + '%';
    $('phase-label').textContent = phaseLabel();

    var sp = $('start-pause');
    sp.textContent = S.complete ? 'Finished' : S.running ? 'Pause' : (S.started ? 'Resume' : 'Start focus');
    sp.classList.toggle('btn-on', S.running);
    sp.disabled = S.complete;

    var onBreak = S.phase === 'shortBreak' || S.phase === 'longBreak';
    $('skip').setAttribute('aria-disabled', onBreak && !S.complete ? 'false' : 'true');

    document.title = S.running ? text + ' · ' + phaseLabel() + ' · Canopy' : 'Canopy';
  }

  function setStatus(text) { $('status').textContent = text; }

  var announceTimer = 0;
  function announce(text) {
    var a = $('announcer');
    clearTimeout(announceTimer);
    a.textContent = '';                        // clearing first makes repeated messages re-announce
    announceTimer = setTimeout(function () { a.textContent = text; }, 60);
  }

  function doReset() {
    stopAll(true);
    seeds = makeSeeds();                       // a brand-new, unique tree
    boughState = seeds.boughs.map(function () { return { litU: 0, target: 0 }; });
    S = { phase: 'focus', round: 0, elapsed: 0, duration: PHASES.focus.ms, running: false, started: false, complete: false, queue: [], last: 0 };
    buildTiles();
    relayout();
    updateUI();
    setStatus('Tree reset. Press “Start focus” to grow a new one.');
    announce('Tree reset. A new tree is ready.');
  }

  /* ---------------------------------------------------------------------
     8. INTERFACE
     --------------------------------------------------------------------- */
  // rectangles (in tree-zone coordinates) of the floating controls the tree must steer around
  function floatingRects() {
    var out = [], zr = stage.getBoundingClientRect(), S = tileSize();
    Array.prototype.forEach.call(document.querySelectorAll('.hud'), function (h) {
      if (getComputedStyle(h).position !== 'absolute') return;      // stacked layout (Medium) needs no avoidance
      var r = h.getBoundingClientRect();
      out.push({ x0: r.left - zr.left - S * 0.15, y0: r.top - zr.top - S * 0.15, x1: r.right - zr.left + S * 0.15, y1: r.bottom - zr.top + S * 0.15 });
    });
    return out;
  }

  function relayout() {
    var W = stage.clientWidth, H = stage.clientHeight;
    if (!W || !H) return;
    var dpr = window.devicePixelRatio || 1;
    canvas._dpr = dpr;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    layout = computeLayout(W, H, tileSize(), floatingRects());
    positionTiles();
    requestDraw();
  }

  function wireControls() {
    $('start-pause').addEventListener('click', function () {
      ensureAudio();                           // this click unlocks audio for chimes
      if (S.complete) return;
      if (!S.running) {
        S.running = true; S.last = Date.now();
        if (!S.started) {
          S.started = true; beginFocus(0);
          var m = 'Focus session 1 of 4 started. Leaves will bloom as you work.';
          setStatus(m); announce(m); chime(['G4', 'C5']);
        } else { setStatus('Resumed.'); announce('Resumed.'); }
      } else {
        S.running = false; setStatus('Paused. Press Resume to continue.'); announce('Paused.');
      }
      updateUI();
    });

    $('skip').addEventListener('click', function () {
      if ($('skip').getAttribute('aria-disabled') === 'true') return;
      advance(S.duration - S.elapsed + 1);
      if (S.running) S.last = Date.now();
    });

    // two-step reset so a stray click can't wipe the tree
    var resetBtn = $('reset'), armed = false, armTimer = 0;
    function disarm() { armed = false; resetBtn.textContent = 'Reset tree'; clearTimeout(armTimer); }
    resetBtn.addEventListener('click', function () {
      if (!armed) {
        armed = true; resetBtn.textContent = 'Press again to confirm';
        announce('Press Reset again within five seconds to confirm. This clears your tree.');
        armTimer = setTimeout(disarm, 5000);
        return;
      }
      disarm(); doReset();
    });

    $('stop-all').addEventListener('click', function () { stopAll(false); });

    var vol = $('volume'), out = $('volume-out');
    vol.addEventListener('input', function () {
      master = vol.value / 100;
      out.textContent = vol.value + '%';
      applyMaster(); rebalance();
    });

    $('demo-speed').addEventListener('change', function () {
      var m = $('demo-speed').checked ? 'Demo speed on. One minute now passes every second.' : 'Demo speed off. Real time.';
      announce(m);
    });

    // help dialog
    var dlg = $('help-dialog');
    function openHelp() { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); }
    function closeHelp() { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
    $('help-button').addEventListener('click', openHelp);
    $('help-ok').addEventListener('click', closeHelp);
    $('help-x').addEventListener('click', closeHelp);
    dlg.addEventListener('click', function (e) { if (e.target === dlg) closeHelp(); });   // click outside to close
    try {
      if (!sessionStorage.getItem('ds-help-seen')) { openHelp(); sessionStorage.setItem('ds-help-seen', '1'); }
    } catch (e) { openHelp(); }
  }

  function init() {
    readColours();
    buildTiles();
    wireControls();
    relayout();
    updateUI();
    refreshSoundUI();

    // redraw when the stage changes size (window resize, breakpoint change, console wrapping)
    var pending = 0;
    function queueRelayout() { cancelAnimationFrame(pending); pending = requestAnimationFrame(relayout); }
    if (window.ResizeObserver) new ResizeObserver(queueRelayout).observe(stage);
    window.addEventListener('resize', queueRelayout);

    // redraw in the new colours when the theme flips
    document.addEventListener('themechange', function () { readColours(); paintLeafColours(); requestDraw(); });
    if (motionQuery && motionQuery.addEventListener) motionQuery.addEventListener('change', requestDraw);

    // fonts changing the console's height can change the stage size after load
    window.addEventListener('load', queueRelayout);

    setInterval(tick, 250);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) tick(); });
  }

  init();
})();
