"use strict";
// Tesser-4C7's tiles in glowing characters, on the same dark screen as the ASCII heroes: a grid of four by
// three tiles drawn in box-drawing characters, each with a few dim lines of code inside, on a dim field of
// characters. A tile's border is its halo. Pulses of colour wander the grid: one rests on a tile and lights
// its border and code, then crosses the seam to a neighbour, lighting the characters it passes. The seam
// flashes on both sides as it goes, and the tile it left fades back. With reduced motion it draws one
// still frame.
//
//   <div class="hero backdrop tiles" data-align="left" role="img" aria-label="..."></div>
//
// The grid fills 70% of the height, or the width if that runs out first; `data-align="left"` puts it at the
// left edge instead of the middle. Colours come from the theme: --accent (phosphor) for the tiles and the
// field, and the pulses in --accent, --accent-2 (amber) and a soft white from --text.
(function () {
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FONT = '"JetBrains Mono", Menlo, "SF Mono", Monaco, monospace';
  const FIELD_CHARS = Array.from("0123456789abcdefxyz{}[]()<>;:=+*/&|!?#$%@");
  const LIT_CHARS = Array.from("01ABCDEFHKMNRSWXZ#$%&@*=+");
  const CODE = ["MOV UP, ACC", "MOV ACC, DOWN", "ADD LEFT", "SUB RIGHT", "SAV", "SWP", "NEG", "JGZ L",
                "JLZ X", "JMP S", "L: ADD 1", "MOV LEFT, RIGHT", "MOV ANY, ACC", "JRO ACC", "NOP"];
  const COLS = 4, ROWS = 3, FILL = 0.7;
  const SEAM = 4;          // columns between tiles side by side; half as many rows between rows of tiles
  const FPS = 30;
  const REST = [1.6, 3.2]; // seconds a pulse rests on a tile, at least and at most
  const CROSS = 0.8;       // seconds to cross a seam
  const FADE = 2.0;        // seconds a tile takes to fade back once its pulse leaves
  const FLASH = 0.7;       // seconds a flash lasts, on a border or in a seam
  const SIDES = [[0, -1], [1, 0], [0, 1], [-1, 0]];   // up, right, down, left
  const WHITE = [255, 255, 255], BLACK = [0, 0, 0];

  const pick = a => a[Math.floor(Math.random() * a.length)];
  const cellChar = (x, y) => LIT_CHARS[(((x * 73856093) ^ (y * 19349663)) >>> 0) % LIT_CHARS.length];
  const rgb = s => {
    const m = s.trim().match(/^#?([0-9a-f]{6})$/i);
    if (m) return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16));
    const n = s.match(/\d+/g);
    return n ? n.slice(0, 3).map(Number) : [255, 255, 255];
  };
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const css = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const rest = () => REST[0] + Math.random() * (REST[1] - REST[0]);

  class Tiles {
    constructor(el) {
      this.el = el;
      const style = getComputedStyle(el);
      const accent = rgb(style.getPropertyValue("--accent") || "#3df2a0");
      const accent2 = rgb(style.getPropertyValue("--accent-2") || "#f5b43c");
      const text = rgb(style.getPropertyValue("--text") || "#e2f1e8");
      this.fieldCol = mix(BLACK, accent, 0.14);
      this.edgeCol = mix(BLACK, accent, 0.3);    // a tile's border, unlit
      this.codeCol = mix(BLACK, accent, 0.2);    // its code, unlit
      this.colours = [accent, accent2, accent, mix(text, WHITE, 0.4)];
      this.left = el.dataset.align === "left";
      this.glowC = document.createElement("canvas"); this.sharp = document.createElement("canvas");
      this.glowC.className = "hero-glow"; this.sharp.className = "hero-sharp";
      el.append(this.glowC, this.sharp);
      this.sx = this.sharp.getContext("2d"); this.gx = this.glowC.getContext("2d");
      this.fieldC = document.createElement("canvas"); this.fx = this.fieldC.getContext("2d");
      // each tile's code, and the colour it was last lit with: from `since`, until `until`
      this.code = Array.from({ length: COLS * ROWS }, () =>
        [...CODE].sort(() => Math.random() - 0.5).slice(0, 3 + Math.floor(Math.random() * 4)));
      this.lit = this.code.map(() => ({ col: accent, since: -1e9, until: -1e9 }));
      this.flashAt = new Float64Array(COLS * ROWS * 4).fill(-1e9);
      this.flashCol = new Array(COLS * ROWS * 4).fill(accent);
      this.crossings = [];
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
      // a tile is n rows tall and 2n columns wide, square on screen as cells are twice as tall as wide
      const byH = Math.floor((this.rows * FILL - (ROWS - 1) * SEAM / 2) / ROWS);
      const byW = Math.floor((this.cols - 4 - (COLS - 1) * SEAM) / COLS / 2);
      this.n = Math.max(5, Math.min(byH, byW));
      const gw = COLS * 2 * this.n + (COLS - 1) * SEAM, gh = ROWS * this.n + (ROWS - 1) * SEAM / 2;
      this.x0 = this.left ? Math.min(2, this.cols - gw) : Math.floor((this.cols - gw) / 2);
      this.y0 = Math.floor((this.rows - gh) / 2);
      this.borders = this.code.map((_, i) => this.border(i));
      this.codeCells = this.code.map((lines, i) => {
        const { x, y, w, h } = this.box(i), out = [];
        lines.slice(0, h - 4).forEach((line, k) => Array.from(line.slice(0, w - 4)).forEach((ch, j) => {
          if (ch !== " ") out.push([x + 2 + j, y + 2 + k, ch]);
        }));
        return out;
      });
      // the still part: the field round the tiles, and every tile unlit
      const fx = this.fx; fx.clearRect(0, 0, W, H); fx.font = `bold ${this.size}px ${FONT}`;
      fx.fillStyle = css(this.fieldCol);
      for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++)
        if (!this.inTile(x, y) && Math.random() < 0.8) this.glyph(fx, x, y, pick(FIELD_CHARS));
      fx.fillStyle = css(this.edgeCol);
      for (const cells of this.borders) for (const [x, y, ch] of cells) this.glyph(fx, x, y, ch);
      fx.fillStyle = css(this.codeCol);
      for (const cells of this.codeCells) for (const [x, y, ch] of cells) this.glyph(fx, x, y, ch);
      this.crossings = [];
      if (REDUCED) this.still(); else if (!this.pulses) this.start(performance.now() / 1000);
    }

    box(i) {
      const r = Math.floor(i / COLS), c = i % COLS, n = this.n;
      return { x: this.x0 + c * (2 * n + SEAM), y: this.y0 + r * (n + SEAM / 2), w: 2 * n, h: n };
    }

    inTile(x, y) {
      const dx = x - this.x0, dy = y - this.y0, n = this.n;
      if (dx < 0 || dy < 0) return false;
      const c = Math.floor(dx / (2 * n + SEAM)), r = Math.floor(dy / (n + SEAM / 2));
      return c < COLS && r < ROWS && dx % (2 * n + SEAM) < 2 * n && dy % (n + SEAM / 2) < n;
    }

    // every border cell of tile i: [x, y, character, side (-1 for a corner), how far along that side]
    border(i) {
      const { x, y, w, h } = this.box(i), out = [];
      out.push([x, y, "╭", -1, 0], [x + w - 1, y, "╮", -1, 0], [x, y + h - 1, "╰", -1, 0], [x + w - 1, y + h - 1, "╯", -1, 0]);
      for (let k = 1; k < w - 1; k++) out.push([x + k, y, "─", 0, k / (w - 1)], [x + k, y + h - 1, "─", 2, k / (w - 1)]);
      for (let k = 1; k < h - 1; k++) out.push([x + w - 1, y + k, "│", 1, k / (h - 1)], [x, y + k, "│", 3, k / (h - 1)]);
      return out;
    }

    // The way across the seam from tile i's `side` to its neighbour's facing border: one step per cell,
    // each step a short band of cells [x, y, weight] that's brightest in the middle.
    path(i, side) {
      const { x, y, w, h } = this.box(i), [dx, dy] = SIDES[side], steps = [];
      const fall = [0.45, 1, 1, 1, 0.45];
      if (dx) {
        const from = dx > 0 ? x + w - 1 : x, mid = y + Math.floor(h / 2) - 2;
        for (let k = 0; k <= SEAM + 1; k++) steps.push(fall.map((f, j) => [from + dx * k, mid + j, f]));
      } else {
        const from = dy > 0 ? y + h - 1 : y, mid = x + Math.floor(w / 2) - 5;
        const band = [0.45, 0.8, 1, 1, 1, 1, 1, 1, 0.8, 0.45];
        for (let k = 0; k <= SEAM / 2 + 1; k++) steps.push(band.map((f, j) => [mid + j, from + dy * k, f]));
      }
      return steps;
    }

    // four pulses on four different tiles, setting off at different times
    start(t) {
      const spots = this.code.map((_, i) => i).sort(() => Math.random() - 0.5);
      this.pulses = this.colours.map((col, k) => {
        const p = { col, at: spots[k], from: -1, to: -1, leave: t + 0.5 + k * 0.8 + Math.random() };
        this.light(p.at, col, t, p.leave);
        return p;
      });
    }

    light(i, col, since, until) { Object.assign(this.lit[i], { col, since, until }); }

    flash(i, side, col, t) { this.flashAt[i * 4 + side] = t; this.flashCol[i * 4 + side] = col; }

    // how lit a tile is: rising as a pulse arrives, full while it rests, fading once it leaves
    level(L, t) {
      if (t < L.until) return Math.min(1, (t - L.since) / 0.4);
      return Math.max(0, 1 - (t - L.until) / FADE) ** 2;
    }

    // A resting pulse leaves for a neighbour, best one it didn't come from and no other pulse is on or
    // heading for; a crossing pulse arrives.
    update(t) {
      for (const p of this.pulses) {
        if (p.to < 0 && t >= p.leave) {
          const r = Math.floor(p.at / COLS), c = p.at % COLS;
          const near = SIDES.map(([dx, dy], side) => ({ side, i: (r + dy) * COLS + c + dx, ok: r + dy >= 0 && r + dy < ROWS && c + dx >= 0 && c + dx < COLS }))
            .filter(n => n.ok && n.i !== p.from);
          const taken = new Set(this.pulses.filter(q => q !== p).flatMap(q => [q.at, q.to]));
          const free = near.filter(n => !taken.has(n.i));
          const n = pick(free.length ? free : near);
          p.to = n.i; p.side = n.side;
          this.lit[p.at].until = t;
          this.flash(p.at, n.side, p.col, t);
          this.crossings.push({ col: p.col, t, steps: this.path(p.at, n.side) });
        } else if (p.to >= 0 && t >= p.leave + CROSS) {
          this.flash(p.to, (p.side + 2) % 4, p.col, t);
          p.from = p.at; p.at = p.to; p.to = -1; p.leave = t + rest();
          this.light(p.at, p.col, t, p.leave);
        }
      }
      this.crossings = this.crossings.filter(c => t - c.t < CROSS + FLASH);
    }

    // With reduced motion: two tiles lit, and a third fading as its pulse crosses to the next.
    still() {
      const t = 100, [green, amber, , white] = this.colours, go = t - CROSS * 0.55;
      this.light(5, amber, 0, Infinity); this.light(6, green, 0, Infinity);
      this.light(1, white, 0, go);
      this.flash(1, 3, white, go);
      this.crossings = [{ col: white, t: go, steps: this.path(1, 3) }];
      this.pulses = [];
      this.draw(t);
    }

    glyph(ctx, x, y, ch) {
      const px = x * this.cw, py = y * this.chh;
      ctx.save();
      ctx.beginPath(); ctx.rect(px, py, this.cw, this.chh); ctx.clip();
      ctx.translate(px, py + this.top * this.sy); ctx.scale(1, this.sy);
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    }

    // a lit cell: its colour on the sharp canvas, and `glow` of it on the blurred one
    cell(x, y, col, glow, ch) {
      if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return;
      this.sx.clearRect(x * this.cw, y * this.chh, this.cw, this.chh);
      this.sx.fillStyle = css(col); this.gx.fillStyle = css(col, glow);
      this.glyph(this.sx, x, y, ch); this.glyph(this.gx, x, y, ch);
    }

    draw(t) {
      const sx = this.sx, gx = this.gx;
      sx.clearRect(0, 0, this.W, this.H); gx.clearRect(0, 0, this.W, this.H);
      sx.drawImage(this.fieldC, 0, 0);
      sx.font = gx.font = `bold ${this.size}px ${FONT}`;
      this.lit.forEach((L, i) => {
        const lit = this.level(L, t);
        const flash = [0, 1, 2, 3].map(s => Math.max(0, 1 - (t - this.flashAt[i * 4 + s]) / FLASH) ** 2);
        if (lit < 0.02 && Math.max(...flash) < 0.02) return;
        // the halo: brightest mid-edge, where each LED sits, and dimmer toward the corners
        for (const [x, y, ch, side, k] of this.borders[i]) {
          const hot = side < 0 ? 0.55 : 1 - 0.8 * Math.abs(k - 0.5);
          const f = side < 0 ? 0 : flash[side], a = Math.min(1, lit * hot);
          if (a < 0.02 && f < 0.02) continue;
          const col = mix(mix(this.edgeCol, L.col, a), mix(f ? this.flashCol[i * 4 + side] : L.col, WHITE, 0.45), f);
          this.cell(x, y, col, Math.min(1, a + f) ** 2, ch);
        }
        if (lit < 0.02) return;
        const code = mix(this.codeCol, mix(L.col, WHITE, 0.15), lit);
        for (const [x, y, ch] of this.codeCells[i]) this.cell(x, y, code, (lit * 0.8) ** 2, ch);
      });
      // a pulse crossing a seam: a band of lit characters moving across, each fading after it passes
      for (const c of this.crossings) {
        c.steps.forEach((band, j) => {
          if (j === 0 || j === c.steps.length - 1) return;   // the two borders flash with their tiles
          const tj = c.t + (j / (c.steps.length - 1)) * CROSS;
          if (t < tj) return;
          const f = Math.max(0, 1 - (t - tj) / FLASH) ** 2;
          if (f < 0.02) return;
          for (const [x, y, w] of band) this.cell(x, y, mix(this.fieldCol, mix(c.col, WHITE, 0.3 * f), f * w), (f * w) ** 2, cellChar(x, y));
        });
      }
    }

    frame(ms) {
      requestAnimationFrame(t => this.frame(t));
      if (document.hidden || !this.visible || !this.W || ms - this.last < 1000 / FPS) return;
      // after a pause (scrolled away, a hidden tab) everything carries on as if no time had passed
      const t = ms / 1000, gap = this.last ? t - this.last / 1000 : 0;
      if (gap > 0.5) {
        for (const p of this.pulses) p.leave += gap;
        for (const L of this.lit) { L.since += gap; L.until += gap; }
        for (const c of this.crossings) c.t += gap;
        this.flashAt = this.flashAt.map(f => f + gap);
      }
      this.last = ms;
      this.update(t);
      this.draw(t);
    }
  }

  function start() { document.querySelectorAll(".hero.tiles").forEach(el => new Tiles(el)); }
  (document.fonts ? document.fonts.load(`bold 16px ${FONT}`).catch(() => {}) : Promise.resolve()).then(start);
})();
