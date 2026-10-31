"use strict";
// A wireframe solid drawn live in characters, on the same dark screen as the ASCII heroes: a slab the
// shape of an e-reader (3:4, thin), or a Tesser-4C7 tile, floats, turning slowly and bobbing. Its edges are bold characters, the
// same family as the fox and the drop, each cell keeping its own character as the edge passes through it;
// corners are +. Nearer edges are brighter; the corners take the theme's second colour. A dim field of
// characters sits behind it, and a blurred copy of the edges glows. With reduced motion it draws one frame.
//
//   <div class="hero backdrop solid" data-solid="slab" role="img" aria-label="..."></div>
//
// Colours come from the theme: --accent for the edges, --accent-2 for the corners (and a tile's halo).
(function () {
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FONT = '"JetBrains Mono", Menlo, "SF Mono", Monaco, monospace';
  const FIELD_CHARS = Array.from("0123456789abcdefxyz{}[]()<>;:=+*/&|!?#$%@");
  const EDGE_CHARS = Array.from("ABCDEFGHKMNRSWXZ0123456789#$%&@*{}[]<>=?");
  // a cell's own character, the same every time an edge passes through it
  const cellChar = (x, y) => EDGE_CHARS[(((x * 73856093) ^ (y * 19349663)) >>> 0) % EDGE_CHARS.length];
  const FPS = 30;
  // a rectangle across the solid at depth z, drawn as a loop of edges in `col` ("edge" or "corner")
  const rect = (w, h, z, col) => ({ col, pts: [[-w, -h, z], [w, -h, z], [w, h, z], [-w, h, z]] });
  // half sizes of each solid, on the axes x (width), y (height), z (depth), and any loops drawn on it
  const SOLIDS = {
    slab: { half: [0.75, 1.0, 0.13] },
    // a Tesser-4C7 tile, 72 x 72 x 28 mm: its screen on the front, and the halo (a band of clear
    // filament) lit round its sides just behind the lid
    tile: { half: [0.8, 0.8, 0.31], loops: [rect(0.8, 0.8, 0.266, "corner"), rect(0.8, 0.8, 0.133, "corner"), rect(0.46, 0.35, 0.31, "edge")] },
  };
  const EDGES = [[0, 1], [1, 3], [3, 2], [2, 0], [4, 5], [5, 7], [7, 6], [6, 4], [0, 4], [1, 5], [2, 6], [3, 7]];

  const pick = a => a[Math.floor(Math.random() * a.length)];
  const rgb = s => {
    const m = s.trim().match(/^#?([0-9a-f]{6})$/i);
    if (m) return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16));
    const n = s.match(/\d+/g);
    return n ? n.slice(0, 3).map(Number) : [255, 255, 255];
  };
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const css = c => `rgb(${c[0]},${c[1]},${c[2]})`;

  class Solid {
    constructor(el) {
      this.el = el;
      const solid = SOLIDS[el.dataset.solid] || SOLIDS.slab;
      this.half = solid.half; this.loops = solid.loops || [];
      const style = getComputedStyle(el);
      this.edge = rgb(style.getPropertyValue("--accent") || "#f75c14");
      this.corner = rgb(style.getPropertyValue("--accent-2") || "#3cc6c4");
      this.far = mix([0, 0, 0], this.edge, 0.28);
      this.fieldCol = mix([0, 0, 0], this.edge, 0.13);
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
      if (REDUCED) this.draw(7.0);
      else requestAnimationFrame(t => this.frame(t));
    }

    layout() {
      const dpr = window.devicePixelRatio || 1, r = this.el.getBoundingClientRect();
      const W = Math.round(r.width * dpr), H = Math.round(r.height * dpr);
      if (!W || !H) return;
      this.W = W; this.H = H;
      for (const c of [this.sharp, this.glowC, this.fieldC]) { c.width = W; c.height = H; }
      // about 46 rows of cells; a cell is twice as tall as it is wide
      this.cw = Math.max(5, Math.round(H / 46 / 2)); this.chh = this.cw * 2;
      this.cols = Math.ceil(W / this.cw); this.rows = Math.ceil(H / this.chh);
      this.size = this.cw / 0.6; this.top = this.size * 0.79; this.sy = this.chh / (this.top + this.size * 0.165);
      this.glowC.style.filter = `blur(${(this.cw / dpr) * 0.7}px) brightness(1.8)`;
      // the field, drawn once
      const fx = this.fx; fx.clearRect(0, 0, W, H); fx.font = `bold ${this.size}px ${FONT}`; fx.fillStyle = css(this.fieldCol);
      for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++)
        if (Math.random() < 0.82) this.glyph(fx, x, y, pick(FIELD_CHARS));
      // the solid's centre and scale, in cells: left of middle, about 70% of the height
      this.cx = this.cols * 0.36; this.cy = this.rows * 0.47;
      this.scale = this.rows * 0.52;
      if (REDUCED) this.draw(7.0);
    }

    glyph(ctx, x, y, ch) {
      const px = x * this.cw, py = y * this.chh;
      ctx.save();
      ctx.beginPath(); ctx.rect(px, py, this.cw, this.chh); ctx.clip();
      ctx.translate(px, py + this.top * this.sy); ctx.scale(1, this.sy);
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    }

    // the turn at time t, as a function from a point on the solid to [cell x, cell y, depth]
    turn(t) {
      const yaw = t * 0.24, pitch = 0.32 + 0.1 * Math.sin(t * 0.37), roll = 0.08 * Math.sin(t * 0.23);
      const bob = 0.035 * Math.sin(t * 0.61);
      return (x, y, z) => {
        [x, z] = [x * Math.cos(yaw) + z * Math.sin(yaw), -x * Math.sin(yaw) + z * Math.cos(yaw)];
        [y, z] = [y * Math.cos(pitch) - z * Math.sin(pitch), y * Math.sin(pitch) + z * Math.cos(pitch)];
        [x, y] = [x * Math.cos(roll) - y * Math.sin(roll), x * Math.sin(roll) + y * Math.cos(roll)];
        const p = 7 / (7 - z);  // a gentle perspective; +z is toward the viewer
        return [this.cx + x * p * this.scale, this.cy - (y + bob) * p * this.scale * 0.5, z];
      };
    }

    draw(t) {
      const sx = this.sx, gx = this.gx;
      sx.clearRect(0, 0, this.W, this.H); gx.clearRect(0, 0, this.W, this.H);
      sx.drawImage(this.fieldC, 0, 0);
      const turn = this.turn(t), [hx, hy, hz] = this.half, cells = new Map();
      const pts = [];
      for (let i = 0; i < 8; i++) pts.push(turn(i & 4 ? hx : -hx, i & 2 ? hy : -hy, i & 1 ? hz : -hz));
      const zs = pts.map(p => p[2]), zmin = Math.min(...zs), zmax = Math.max(...zs);
      const put = (x, y, ch, z, col) => {
        if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return;
        const k = y * this.cols + x, cur = cells.get(k);
        if (!cur || z > cur.z) cells.set(k, { x, y, ch, z, col });
      };
      const line = ([x0, y0, z0], [x1, y1, z1], col) => {
        const dx = x1 - x0, dy = y1 - y0, n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
        for (let i = 0; i <= n; i++) {
          const s = i / n, z = z0 + (z1 - z0) * s;
          const near = zmax > zmin ? (z - zmin) / (zmax - zmin) : 1;
          const x = Math.round(x0 + dx * s), y = Math.round(y0 + dy * s);
          put(x, y, cellChar(x, y), z, mix(this.far, col, near));
        }
      };
      for (const [a, b] of EDGES) line(pts[a], pts[b], this.edge);
      for (const loop of this.loops) {
        const ps = loop.pts.map(p => turn(...p)), col = loop.col === "corner" ? this.corner : this.edge;
        for (let i = 0; i < 4; i++) line(ps[i], ps[(i + 1) % 4], col);
      }
      for (const [x, y, z] of pts) put(Math.round(x), Math.round(y), "+", z + 1, this.corner);
      sx.font = gx.font = `bold ${this.size}px ${FONT}`;
      for (const c of cells.values()) {
        sx.clearRect(c.x * this.cw, c.y * this.chh, this.cw, this.chh);
        sx.fillStyle = gx.fillStyle = css(c.col);
        this.glyph(sx, c.x, c.y, c.ch); this.glyph(gx, c.x, c.y, c.ch);
      }
    }

    frame(ms) {
      requestAnimationFrame(t => this.frame(t));
      if (!this.visible || !this.W || ms - this.last < 1000 / FPS) return;
      this.last = ms;
      this.draw(ms / 1000);
    }
  }

  function start() { document.querySelectorAll(".hero.solid").forEach(el => new Solid(el)); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
