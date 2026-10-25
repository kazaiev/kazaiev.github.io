"use strict";
// A fox's paw prints walking up the page in glowing characters, on the same dark screen as the ASCII
// heroes. Each print is a main pad and four toe beans made of bold glyphs; they appear one at a time,
// left and right in turn with a little sway, glow in, and fade slowly. When the trail walks off the top
// it starts again at the bottom. With reduced motion it draws a still trail.
//
//   <div class="hero backdrop paws" role="img" aria-label="..."></div>
//
// Colours come from the theme: --accent for the pads, --accent-2 for the toe beans.
(function () {
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FONT = '"JetBrains Mono", Menlo, "SF Mono", Monaco, monospace';
  const FIELD_CHARS = Array.from("0123456789abcdefxyz{}[]()<>;:=+*/&|!?#$%@");
  const PAW_CHARS = Array.from("ABCDEFGHKMNRSWXZ0123456789#$%&@*{}[]<>=?");
  const FPS = 30;
  const STEP_S = 0.9;    // a new print this often
  const LIFE_S = 9.0;    // how long a print lasts before it has faded out
  const IN_S = 0.35;     // how long it takes to glow in
  // a print, in units of its own size: [centre x, centre y, half width, half height] (y up)
  const PADS = [[0, 0, 1.0, 0.8], [-1.05, 1.15, 0.36, 0.48], [-0.38, 1.62, 0.36, 0.5], [0.38, 1.62, 0.36, 0.5], [1.05, 1.15, 0.36, 0.48]];

  const pick = a => a[Math.floor(Math.random() * a.length)];
  const cellChar = (x, y) => PAW_CHARS[(((x * 73856093) ^ (y * 19349663)) >>> 0) % PAW_CHARS.length];
  const rgb = s => {
    const m = s.trim().match(/^#?([0-9a-f]{6})$/i);
    if (m) return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16));
    const n = s.match(/\d+/g);
    return n ? n.slice(0, 3).map(Number) : [255, 255, 255];
  };
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const css = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  class Paws {
    constructor(el) {
      this.el = el;
      const style = getComputedStyle(el);
      this.pad = rgb(style.getPropertyValue("--accent") || "#fc0083");
      this.bean = rgb(style.getPropertyValue("--accent-2") || "#b63cff");
      this.fieldCol = mix([0, 0, 0], this.bean, 0.16);
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
      if (!REDUCED) requestAnimationFrame(t => this.frame(t));
    }

    layout() {
      const dpr = window.devicePixelRatio || 1, r = this.el.getBoundingClientRect();
      const W = Math.round(r.width * dpr), H = Math.round(r.height * dpr);
      if (!W || !H) return;
      this.W = W; this.H = H;
      for (const c of [this.sharp, this.glowC, this.fieldC]) { c.width = W; c.height = H; }
      this.cw = Math.max(5, Math.round(H / 54 / 2)); this.chh = this.cw * 2;
      this.cols = Math.ceil(W / this.cw); this.rows = Math.ceil(H / this.chh);
      this.size = this.cw / 0.6; this.top = this.size * 0.79; this.sy = this.chh / (this.top + this.size * 0.165);
      this.glowC.style.filter = `blur(${(this.cw / dpr) * 0.7}px) brightness(1.8)`;
      const fx = this.fx; fx.clearRect(0, 0, W, H); fx.font = `bold ${this.size}px ${FONT}`; fx.fillStyle = css(this.fieldCol);
      for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++)
        if (Math.random() < 0.8) this.glyph(fx, x, y, pick(FIELD_CHARS));
      // a print's size in rows, the distance between steps, and the trail's centre line
      this.unit = Math.max(2.2, this.rows / 15);
      this.stride = this.unit * 2.6;
      this.lane = this.cols * 0.3;
      this.steps = Math.ceil((this.rows + this.unit * 6) / this.stride) + 1;
      this.prints = this.footprints();
      if (REDUCED) this.draw(LIFE_S * 0.55, true);
    }

    // where each step of one walk lands: [x, y in cells, tilt]. Bottom to top, left and right in turn.
    footprints() {
      const out = [];
      for (let i = 0; i < this.steps; i++) {
        const side = i % 2 ? 1 : -1;
        const y = this.rows + this.unit * 2 - i * this.stride;
        const sway = Math.sin(i * 0.55) * this.unit * 1.6;
        out.push([this.lane + sway + side * this.unit * 1.15 * 2, y, side * 0.22 + Math.cos(i * 0.55) * 0.12]);
      }
      return out;
    }

    glyph(ctx, x, y, ch) {
      const px = x * this.cw, py = y * this.chh;
      ctx.save();
      ctx.beginPath(); ctx.rect(px, py, this.cw, this.chh); ctx.clip();
      ctx.translate(px, py + this.top * this.sy); ctx.scale(1, this.sy);
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    }

    // one print's cells at [cx, cy] with its tilt: [x, y, colour]
    cells(cx, cy, tilt) {
      const u = this.unit, cos = Math.cos(tilt), sin = Math.sin(tilt), out = [];
      const reach = u * 2.4;
      for (let y = Math.floor(cy - reach); y <= Math.ceil(cy + reach); y++) {
        for (let x = Math.floor(cx - reach * 2); x <= Math.ceil(cx + reach * 2); x++) {
          // to the print's own units: a cell is twice as tall as wide, and y points up
          const dx = (x - cx) / 2 / u, dy = (cy - y) / u;
          const lx = dx * cos + dy * sin, ly = -dx * sin + dy * cos;
          for (let k = 0; k < PADS.length; k++) {
            const [px, py, hw, hh] = PADS[k];
            if (((lx - px) / hw) ** 2 + ((ly - py) / hh) ** 2 <= 1) { out.push([x, y, k ? this.bean : this.pad]); break; }
          }
        }
      }
      return out;
    }

    draw(t, still = false) {
      const sx = this.sx, gx = this.gx;
      sx.clearRect(0, 0, this.W, this.H); gx.clearRect(0, 0, this.W, this.H);
      sx.drawImage(this.fieldC, 0, 0);
      sx.font = gx.font = `bold ${this.size}px ${FONT}`;
      // one walk, plus a pause so the last print has faded before the first comes round again
      const walk = Math.max(this.steps * STEP_S + 2.5, LIFE_S + 1);
      for (let i = 0; i < this.steps; i++) {
        // print i appears at i * STEP_S into each walk, and lingers LIFE_S
        let age = still ? LIFE_S * (0.15 + 0.8 * (1 - i / this.steps)) : ((t - i * STEP_S) % walk + walk) % walk;
        if (age > LIFE_S) continue;
        const a = age < IN_S ? age / IN_S : 1 - (age - IN_S) / (LIFE_S - IN_S);
        if (a <= 0.02) continue;
        const [cx, cy, tilt] = this.prints[i];
        for (const [x, y, col] of this.cells(cx, cy, tilt)) {
          if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) continue;
          sx.clearRect(x * this.cw, y * this.chh, this.cw, this.chh);
          sx.fillStyle = css(col, a); gx.fillStyle = css(col, a * a);
          const ch = cellChar(x, y);
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

  function start() { document.querySelectorAll(".hero.paws").forEach(el => new Paws(el)); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
