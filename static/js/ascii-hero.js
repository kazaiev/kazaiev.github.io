"use strict";
// A silhouette drawn live as glowing characters, after the k4zka fox wallpaper.
//
//   <div class="hero" data-src="/hero/fox.json" role="img" aria-label="..."></div>
//
// The JSON holds `colours` (rows of "rrggbb", "" for the field), `text` (rows of characters, or null for
// random ones), `field` (the colour behind the art), `highlight` and `field_text` (characters for the field
// outside the art, or null). Random characters are stretched to fill their cells, like the avatar; real
// text keeps each glyph where the font puts it, so code stays readable. A highlight runs along a row or a
// column every few seconds, a band of rows slips sideways now and then, and random characters flicker.
// With reduced motion, it draws once and stays still.
(function () {
  const THIN = new Set(".,'`:;-_~\"^!|");
  const CHARS = [];
  for (let c = 33; c < 127; c++) if (!THIN.has(String.fromCharCode(c))) CHARS.push(String.fromCharCode(c));
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ROLL_EVERY = 3.0, ROLL_STEP = 0.05, ROLL_CYCLE = 0.08;
  const GLITCH_MIN = 6.0, GLITCH_SPAN = 12.0, GLITCH_STEP = 0.07;
  const FLICKER_PER_S = 0.02;
  const FONT = '"JetBrains Mono", Menlo, "SF Mono", Monaco, monospace';

  const pick = a => a[Math.floor(Math.random() * a.length)];
  const hex = s => [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
  const css = c => `rgb(${c[0]},${c[1]},${c[2]})`;
  const lit = c => { const k = 235 / Math.max(...c, 1); return c.map(v => Math.min(255, Math.round(v * k))); };

  class Hero {
    constructor(el, data) {
      this.el = el;
      this.art = data.colours.map(row => row.map(h => (h ? hex(h) : null)));
      this.artText = data.text;
      this.field = hex(data.field);
      this.highlight = hex(data.highlight);
      this.fieldText = data.field_text ? Array.from(data.field_text) : null;
      this.random = !data.text;
      this.HR = this.art.length; this.HC = this.art[0].length;
      this.glowC = document.createElement("canvas");
      this.sharp = document.createElement("canvas");
      this.glowC.className = "hero-glow"; this.sharp.className = "hero-sharp";
      el.append(this.glowC, this.sharp);
      this.sx = this.sharp.getContext("2d"); this.gx = this.glowC.getContext("2d");
      this.visible = true;
      new IntersectionObserver(es => { this.visible = es[0].isIntersecting; }).observe(el);
      new ResizeObserver(() => { clearTimeout(this.rt); this.rt = setTimeout(() => this.layout(), 120); }).observe(el);
      this.layout();
      if (!REDUCED) requestAnimationFrame(t => this.frame(t));
    }

    layout() {
      const dpr = window.devicePixelRatio || 1, r = this.el.getBoundingClientRect();
      const W = Math.round(r.width * dpr), H = Math.round(r.height * dpr);
      if (!W || !H) return;
      this.W = W; this.H = H;
      for (const c of [this.sharp, this.glowC]) { c.width = W; c.height = H; }
      // the art fills 92% of the height (or `data-scale` of it), unless the width runs out first
      const fill = parseFloat(this.el.dataset.scale) || 0.92;
      this.cw = Math.max(3, Math.floor(Math.min(H * fill / this.HR / 2, W * 0.96 / this.HC)));
      this.chh = this.cw * 2;
      this.cols = Math.ceil(W / this.cw); this.rows = Math.ceil(H / this.chh);
      // centred, or against the left edge with a small inset (`data-align="left"`)
      this.ox = this.el.dataset.align === "left" ? Math.min(2, Math.max(0, this.cols - this.HC)) : Math.floor((this.cols - this.HC) / 2);
      this.oy = Math.floor((this.rows - this.HR) / 2);
      const sx = this.sx;
      if (this.random) {
        sx.font = `bold ${this.chh}px ${FONT}`;
        this.metrics = {};
        const refW = 0.625 * this.chh, refH = 0.73 * this.chh;
        for (const ch of CHARS) {
          const m = sx.measureText(ch);
          const iw = Math.max(1, m.actualBoundingBoxLeft + m.actualBoundingBoxRight);
          const ih = Math.max(1, m.actualBoundingBoxAscent + m.actualBoundingBoxDescent);
          const tw = this.cw * 0.9 * Math.min(1, iw / refW), th = this.chh * 0.85 * Math.min(1, ih / refH);
          this.metrics[ch] = { sx: tw / iw, sy: th / ih, l: m.actualBoundingBoxLeft, a: m.actualBoundingBoxAscent, tw, th };
        }
      } else {
        // advance = one cell; the band from just above the capitals to just below the baseline fills its height
        this.size = this.cw / 0.6;
        sx.font = `bold ${this.size}px ${FONT}`;
        this.top = this.size * 0.79;
        this.sy = this.chh / (this.top + this.size * 0.165);
      }
      this.glowC.style.filter = `blur(${(this.cw / dpr) * 0.6}px) brightness(1.7)`;
      this.base = []; this.grid = [];
      let f = 0;
      for (let y = 0; y < this.rows; y++) {
        const br = [], gr = [];
        for (let x = 0; x < this.cols; x++) {
          const hy = y - this.oy, hx = x - this.ox, inside = hy >= 0 && hy < this.HR && hx >= 0 && hx < this.HC;
          const col = inside && this.art[hy][hx];
          br.push(col && Math.max(...col) > Math.max(...this.field) ? col : this.field);
          if (this.random) gr.push(pick(CHARS));
          else if (inside) gr.push(this.artText[hy][hx]);
          else gr.push(this.fieldText ? this.fieldText[f++ % this.fieldText.length] : " ");
        }
        this.base.push(br); this.grid.push(gr);
      }
      this.rolls = []; this.glitch = null; this.t0 = performance.now() / 1000; this.nextRoll = 1.0;
      this.nextGlitch = GLITCH_MIN + Math.random() * GLITCH_SPAN;
      sx.clearRect(0, 0, W, H);
      for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++) this.drawCell(y, x, this.grid[y][x], this.base[y][x]);
      this.flush();
    }

    drawCell(y, x, ch, col, shift = 0) {
      const sx = this.sx, cw = this.cw, chh = this.chh, px = (x + shift) * cw, py = y * chh;
      sx.clearRect(x * cw, py, cw, chh);
      if (!col || ch === " ") return;
      sx.save();
      sx.fillStyle = css(col);
      if (this.random) {
        const m = this.metrics[ch];
        sx.translate(px + (cw - m.tw) / 2 + m.l * m.sx, py + (chh - m.th) / 2 + m.a * m.sy);
        sx.scale(m.sx, m.sy);
      } else {
        sx.beginPath(); sx.rect(px, py, cw, chh); sx.clip();
        sx.translate(px, py + this.top * this.sy);
        sx.scale(1, this.sy);
      }
      sx.fillText(ch, 0, 0);
      sx.restore();
    }

    flush() { this.gx.clearRect(0, 0, this.W, this.H); this.gx.drawImage(this.sharp, 0, 0); }

    startRoll(t) {
      const line = [];
      if (Math.random() > 0.5) { const y = Math.floor(Math.random() * this.rows); for (let x = 0; x < this.cols; x++) line.push([y, x]); }
      else { const x = Math.floor(Math.random() * this.cols); for (let y = 0; y < this.rows; y++) line.push([y, x]); }
      if (Math.random() > 0.5) line.reverse();
      line.forEach(([y, x], i) => this.rolls.push({
        start: t + i * ROLL_STEP, dur: (4 + Math.floor(Math.random() * 4)) * ROLL_CYCLE, y, x, cycle: -1,
        ch: this.random ? pick(CHARS) : this.grid[y][x] }));
    }

    redrawRow(y, shift) {
      this.sx.clearRect(0, y * this.chh, this.W, this.chh);
      for (let x = 0; x < this.cols; x++) {
        const src = Math.min(this.cols - 1, Math.max(0, x - shift));
        this.drawCell(y, x, this.grid[y][src], this.base[y][src]);
      }
    }

    frame(now) {
      requestAnimationFrame(t => this.frame(t));
      if (document.hidden || !this.visible || !this.W || now - (this.last || 0) < 33) return;
      const dt = this.last ? (now - this.last) / 1000 : 0; this.last = now;
      const t = now / 1000 - this.t0;
      let dirty = false;

      if (this.random) {
        this.debt = (this.debt || 0) + this.rows * this.cols * FLICKER_PER_S * dt;
        while (this.debt >= 1) {
          this.debt -= 1;
          const y = Math.floor(Math.random() * this.rows), x = Math.floor(Math.random() * this.cols);
          this.grid[y][x] = pick(CHARS); this.drawCell(y, x, this.grid[y][x], this.base[y][x]); dirty = true;
        }
      }

      if (t >= this.nextRoll) { this.startRoll(t); this.nextRoll = t + ROLL_EVERY; }
      const alive = [];
      for (const r of this.rolls) {
        const age = t - r.start;
        if (age >= r.dur) {
          if (this.random) this.grid[r.y][r.x] = r.ch;
          this.drawCell(r.y, r.x, this.grid[r.y][r.x], this.base[r.y][r.x]); dirty = true; continue;
        }
        alive.push(r);
        if (age < 0) continue;
        const cyc = Math.floor(age / ROLL_CYCLE);
        if (cyc !== r.cycle) {
          r.cycle = cyc;
          if (this.random) r.ch = pick(CHARS);
          const b = this.base[r.y][r.x];
          this.drawCell(r.y, r.x, r.ch, b === this.field ? this.highlight : lit(b)); dirty = true;
        }
      }
      this.rolls = alive;

      if (!this.glitch && t >= this.nextGlitch) {
        this.glitch = { start: t, y: Math.floor(Math.random() * this.rows), h: 1 + Math.floor(Math.random() * 3),
                        off: pick([-2, -1, 1, 2]), phase: -1 };
        this.nextGlitch = t + GLITCH_MIN + Math.random() * GLITCH_SPAN;
      }
      if (this.glitch) {
        const g = this.glitch, phase = Math.floor((t - g.start) / GLITCH_STEP);
        if (phase !== g.phase) {
          g.phase = phase;
          const shift = [g.off, -Math.round(g.off * 0.6), 0][Math.min(phase, 2)];
          for (let y = g.y; y < Math.min(this.rows, g.y + g.h); y++) this.redrawRow(y, shift);
          dirty = true;
          if (phase >= 2) this.glitch = null;
        }
      }
      if (dirty) this.flush();
    }
  }

  function start() {
    document.querySelectorAll(".hero[data-src]").forEach(el => {
      fetch(el.dataset.src).then(r => r.json()).then(d => { el.classList.add("live"); new Hero(el, d); })
        .catch(() => {});   // the still image stays
    });
  }
  (document.fonts ? document.fonts.load(`bold 16px ${FONT}`).catch(() => {}) : Promise.resolve()).then(start);
})();
