"use strict";
// A linden leaf in characters, on the same dark screen as the ASCII heroes: heart-shaped, lobed at the
// base and pointed at the tip, finely toothed, with a midrib, side veins and a short stem. It hangs in
// still air, turning slowly; seen edge-on it narrows, and its underside shows paler. Autumn gold.
// With reduced motion it draws one frame.
//
//   <div class="hero backdrop leaf" role="img" aria-label="..."></div>
(function () {
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FONT = '"JetBrains Mono", Menlo, "SF Mono", Monaco, monospace';
  const FIELD_CHARS = Array.from("0123456789abcdefxyz{}[]()<>;:=+*/&|!?#$%@");
  const LEAF_CHARS = Array.from("ABCDEFGHKMNRSWXZ0123456789#$%&@*{}[]<>=?");
  const FPS = 30;
  const GOLD = [226, 172, 44], AMBER = [196, 104, 24], VEIN = [255, 246, 196], STEM = [176, 116, 52];
  const UNDER = [196, 170, 96];

  const pick = a => a[Math.floor(Math.random() * a.length)];
  const cellChar = (x, y) => LEAF_CHARS[(((x * 73856093) ^ (y * 19349663)) >>> 0) % LEAF_CHARS.length];
  const rgb = s => {
    const m = s.trim().match(/^#?([0-9a-f]{6})$/i);
    if (m) return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16));
    const n = s.match(/\d+/g);
    return n ? n.slice(0, 3).map(Number) : [255, 255, 255];
  };
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const css = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  // Is the point inside the leaf? Leaf units: x across, y up, the stem's notch at the origin, the tip at y≈2.
  // A heart turned point-up, a little lopsided at the base like a real linden, with teeth along the edge.
  function inside(x, y) {
    const hx = x * (x < 0 ? 1.0 : 0.92), hy = 1.05 - y * 0.95;   // into the heart curve's own coordinates
    const f = (hx * hx + hy * hy - 1) ** 3 - hx * hx * hy ** 3;
    const teeth = 0.035 * Math.sin(Math.atan2(y - 1, x) * 30);
    return f <= teeth;
  }
  // how close the point is to a vein: the midrib, and side veins sweeping up from it
  function vein(x, y) {
    let d = Math.abs(x) * (1 + y * 0.2);                           // the midrib, thinning toward the tip
    for (let k = 0; k < 6; k++) {
      const y0 = 0.15 + k * 0.28;
      const ax = Math.abs(x), along = y - y0 - ax * 0.75;          // each side vein climbs at about 37°
      if (ax > 0.05 && ax < 1.2 - k * 0.14) d = Math.min(d, Math.abs(along) * 0.8);
    }
    return d;
  }

  class Leaf {
    constructor(el) {
      this.el = el;
      const style = getComputedStyle(el);
      this.fieldCol = mix([0, 0, 0], rgb(style.getPropertyValue("--accent-2") || "#b63cff"), 0.15);
      this.glowC = document.createElement("canvas"); this.sharp = document.createElement("canvas");
      this.glowC.className = "hero-glow"; this.sharp.className = "hero-sharp";
      el.append(this.glowC, this.sharp);
      this.sx = this.sharp.getContext("2d"); this.gx = this.glowC.getContext("2d");
      this.fieldC = document.createElement("canvas"); this.fx = this.fieldC.getContext("2d");
      this.visible = true;
      new IntersectionObserver(es => { this.visible = es[0].isIntersecting; }).observe(el);
      new ResizeObserver(() => { clearTimeout(this.rt); this.rt = setTimeout(() => this.layout(), 120); }).observe(el);
      this.layout();
      this.last = 0;
      if (REDUCED) this.draw(2.0);
      else requestAnimationFrame(t => this.frame(t));
    }

    layout() {
      const dpr = window.devicePixelRatio || 1, r = this.el.getBoundingClientRect();
      const W = Math.round(r.width * dpr), H = Math.round(r.height * dpr);
      if (!W || !H) return;
      this.W = W; this.H = H;
      for (const c of [this.sharp, this.glowC, this.fieldC]) { c.width = W; c.height = H; }
      this.cw = Math.max(5, Math.round(H / 56 / 2)); this.chh = this.cw * 2;
      this.cols = Math.ceil(W / this.cw); this.rows = Math.ceil(H / this.chh);
      this.size = this.cw / 0.6; this.top = this.size * 0.79; this.sy = this.chh / (this.top + this.size * 0.165);
      this.glowC.style.filter = `blur(${(this.cw / dpr) * 0.7}px) brightness(1.6)`;
      const fx = this.fx; fx.clearRect(0, 0, W, H); fx.font = `bold ${this.size}px ${FONT}`; fx.fillStyle = css(this.fieldCol);
      for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++)
        if (Math.random() < 0.8) this.glyph(fx, x, y, pick(FIELD_CHARS));
      // the leaf's notch, and one leaf unit in rows: the leaf is about 60% of the height, tip to stem
      this.cx = this.cols * 0.33; this.cy = this.rows * 0.74;
      this.unit = this.rows * 0.27;
      if (REDUCED) this.draw(2.0);
    }

    glyph(ctx, x, y, ch) {
      const px = x * this.cw, py = y * this.chh;
      ctx.save();
      ctx.beginPath(); ctx.rect(px, py, this.cw, this.chh); ctx.clip();
      ctx.translate(px, py + this.top * this.sy); ctx.scale(1, this.sy);
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    }

    draw(t) {
      const sx = this.sx, gx = this.gx, u = this.unit;
      sx.clearRect(0, 0, this.W, this.H); gx.clearRect(0, 0, this.W, this.H);
      sx.drawImage(this.fieldC, 0, 0);
      sx.font = gx.font = `bold ${this.size}px ${FONT}`;
      // turning on its stem's axis (never quite edge-on), a slow sway in the plane, and a gentle bob
      const yaw = Math.sin(t * 0.21) * 1.15, turn = Math.cos(yaw), back = turn < 0;
      const width = Math.max(0.22, Math.abs(turn));
      const tilt = -0.32 + Math.sin(t * 0.33) * 0.14, bob = Math.sin(t * 0.47) * 0.06;
      const cos = Math.cos(tilt), sin = Math.sin(tilt);
      const cy = this.cy - bob * u;
      const reach = 2.3 * u;
      for (let y = Math.max(0, Math.floor(cy - reach)); y <= Math.min(this.rows - 1, Math.ceil(cy + u * 0.8)); y++) {
        for (let x = Math.max(0, Math.floor(this.cx - reach * 2)); x <= Math.min(this.cols - 1, Math.ceil(this.cx + reach * 2)); x++) {
          // screen cell to leaf units: a cell is twice as tall as wide, y points up; undo the sway, then the turn
          const dx = (x - this.cx) / 2 / u, dy = (cy - y) / u;
          const lx = (dx * cos + dy * sin) / width, ly = -dx * sin + dy * cos;
          let col = null;
          if (ly < 0.05 && ly > -0.6 && Math.abs(lx * width + ly * 0.25) < 0.075) col = STEM;   // the stem, below the notch
          else if (inside(lx, ly)) {
            const v = vein(lx, ly), edge = Math.min(1, Math.hypot(lx, ly - 0.9) / 1.15);
            const face = back ? UNDER : mix(GOLD, AMBER, edge * 0.8);
            col = v < 0.06 ? mix(face, VEIN, back ? 0.4 : 0.9) : face;
            col = mix(col, [0, 0, 0], (1 - width) * 0.35);          // a little darker as it turns away
          }
          if (!col) continue;
          sx.clearRect(x * this.cw, y * this.chh, this.cw, this.chh);
          const ch = cellChar(x, y);
          sx.fillStyle = css(col); gx.fillStyle = css(col, 0.8);
          this.glyph(sx, x, y, ch); this.glyph(gx, x, y, ch);
        }
      }
    }

    frame(ms) {
      requestAnimationFrame(t => this.frame(t));
      if (!this.visible || !this.W || ms - this.last < 1000 / FPS) return;
      this.last = ms;
      this.draw(ms / 1000);
    }
  }

  function start() { document.querySelectorAll(".hero.leaf").forEach(el => new Leaf(el)); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
