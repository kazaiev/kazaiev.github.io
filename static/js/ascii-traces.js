"use strict";
// Circuit traces routing themselves across a board in glowing characters, on the same dark screen as
// the ASCII heroes. Traces start at the left edge or branch off one another, run in straight lines with
// right-angle turns and short stair-step diagonals, keep a cell of clearance, and end in a pad that lights
// up when the trace arrives. Once the board is routed, current pulses along the traces; then it fades and
// a new board routes itself. With reduced motion it draws one finished board.
//
//   <div class="hero backdrop traces" role="img" aria-label="..."></div>
//
// Traces are filled with glyphs, like the other heroes; `data-glyphs="box"` draws them in box-drawing characters.
// Colours come from the theme: --accent for the traces, --accent-2 for the pads.
(function () {
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FONT = '"JetBrains Mono", Menlo, "SF Mono", Monaco, monospace';
  const FIELD_CHARS = Array.from("0123456789abcdefxyz{}[]()<>;:=+*/&|!?#$%@");
  const TRACE_CHARS = Array.from("01ABCDEFHKMNRSWXZ#$%&@*=+");
  const FPS = 30;
  const SPEED = 18;      // cells a trace grows per second
  const STAGGER_S = 0.5; // a new trace starts this often
  const HOLD_S = 6;      // the routed board stays lit this long, with current pulsing along it
  const FADE_S = 2.5;    // then fades out over this long
  const PULSE_EVERY_S = 2.2, PULSE_LEN = 5;
  const DIRS = [[1, 0], [0, -1], [0, 1], [-1, 0]];
  // box-drawing characters by which sides a cell connects to: 1 up, 2 right, 4 down, 8 left
  const BOX = { 1: "│", 4: "│", 5: "│", 2: "─", 8: "─", 10: "─", 6: "┌", 12: "┐", 3: "└", 9: "┘",
                7: "├", 13: "┤", 14: "┬", 11: "┴", 15: "┼" };
  const SIDE = (dx, dy) => dy < 0 ? 1 : dx > 0 ? 2 : dy > 0 ? 4 : 8;

  const pick = a => a[Math.floor(Math.random() * a.length)];
  const cellChar = (x, y) => TRACE_CHARS[(((x * 73856093) ^ (y * 19349663)) >>> 0) % TRACE_CHARS.length];
  const rgb = s => {
    const m = s.trim().match(/^#?([0-9a-f]{6})$/i);
    if (m) return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16));
    const n = s.match(/\d+/g);
    return n ? n.slice(0, 3).map(Number) : [255, 255, 255];
  };
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const css = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const WHITE = [255, 255, 255];

  class Traces {
    constructor(el) {
      this.el = el;
      const style = getComputedStyle(el);
      this.trace = rgb(style.getPropertyValue("--accent") || "#fc0083");
      this.padCol = rgb(style.getPropertyValue("--accent-2") || "#b63cff");
      this.fieldCol = mix([0, 0, 0], this.padCol, 0.16);
      this.box = el.dataset.glyphs === "box";
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
      this.board = this.route();
      this.born = null;
      if (REDUCED) this.draw(this.board.routed + HOLD_S * 0.3);
    }

    // Route a whole board up front: each trace is a list of cells with the time each one lights.
    route() {
      const cols = this.cols, rows = this.rows, used = new Uint8Array(cols * rows);
      const at = (x, y) => x >= 0 && y >= 0 && x < cols && y < rows ? used[y * cols + x] : 1;
      const take = (x, y) => { used[y * cols + x] = 1; };
      // a cell is free if it and its neighbours are empty, except the cell we came from
      const free = (x, y, fx, fy) => {
        if (at(x, y)) return false;
        for (const [dx, dy] of DIRS) {
          const nx = x + dx, ny = y + dy;
          if ((nx !== fx || ny !== fy) && nx >= 0 && ny >= 0 && nx < cols && ny < rows && used[ny * cols + nx]) return false;
        }
        return true;
      };
      const traces = [];
      const want = Math.max(6, Math.round(rows / 2.2));
      let tries = 0;
      while (traces.length < want && tries++ < want * 12) {
        let x, y, dir, host = null, junction = 0;
        if (traces.length > 2 && Math.random() < 0.35) {
          // leave an existing trace at a right angle, from somewhere along its middle
          host = pick(traces); junction = Math.floor(host.cells.length * (0.25 + Math.random() * 0.5));
          const from = host.cells[junction]; dir = Math.random() < 0.5 ? 1 : 2;
          x = from.x + DIRS[dir][0]; y = from.y + DIRS[dir][1];
          if (!free(x, y, from.x, from.y)) continue;
        } else {
          x = 0; y = 1 + Math.floor(Math.random() * (rows - 2)); dir = 0;
          if (!free(x, y, -1, y)) continue;
        }
        const cells = [];
        let run = 0, stair = 0;
        const target = Math.round(cols * (0.25 + Math.random() * 0.55));
        while (cells.length < target) {
          take(x, y); cells.push({ x, y });
          // choose the next step: mostly keep going, sometimes turn, sometimes a stair-step diagonal
          let nd = dir;
          run++;
          if (stair) { nd = stair > 0 ? (run % 3 === 0 ? 2 : 0) : (run % 3 === 0 ? 1 : 0); }
          else if (run > 3 && Math.random() < 0.09) {
            nd = dir === 0 ? (Math.random() < 0.5 ? 1 : 2) : 0;
            run = 0;
          }
          if (!stair && dir === 0 && run > 4 && Math.random() < 0.04) { stair = Math.random() < 0.5 ? 1 : -1; run = 0; }
          if (stair && run > 9) { stair = 0; nd = 0; }
          if (dir !== 0 && run > 2 + Math.floor(Math.random() * rows * 0.4)) { nd = 0; run = 0; }
          let nx = x + DIRS[nd][0], ny = y + DIRS[nd][1];
          if (!free(nx, ny, x, y)) {
            // blocked: try the other ways round, never back
            const alts = [0, 1, 2].filter(d => d !== nd).sort(() => Math.random() - 0.5);
            const ok = alts.find(d => free(x + DIRS[d][0], y + DIRS[d][1], x, y));
            if (ok === undefined) break;
            nd = ok; nx = x + DIRS[nd][0]; ny = y + DIRS[nd][1]; stair = 0; run = 0;
          }
          x = nx; y = ny; dir = nd;
        }
        if (cells.length < 7) continue;
        // a square pad at the end: the last cell and the one beside it (cells are twice as tall as wide)
        const end = cells.pop(), pad = [end];
        const side = [[1, 0], [-1, 0]].map(([dx]) => ({ x: end.x + dx, y: end.y })).find(c => !at(c.x, c.y));
        if (side) { take(side.x, side.y); pad.push(side); }
        traces.push({ cells, pad, host, junction });
      }
      // which sides each trace cell connects to, for the box-drawing characters
      const conn = new Map();
      const link = (a, b) => {
        conn.set(a.y * cols + a.x, (conn.get(a.y * cols + a.x) || 0) | SIDE(b.x - a.x, b.y - a.y));
        conn.set(b.y * cols + b.x, (conn.get(b.y * cols + b.x) || 0) | SIDE(a.x - b.x, a.y - b.y));
      };
      for (const tr of traces) {
        const c = tr.cells;
        if (tr.host) link(tr.host.cells[tr.junction], c[0]);
        else conn.set(c[0].y * cols + c[0].x, 8);
        for (let i = 1; i < c.length; i++) link(c[i - 1], c[i]);
      }
      for (const tr of traces) for (const cell of tr.cells) cell.ch = BOX[conn.get(cell.y * cols + cell.x)] || "─";
      // timing: trace i starts at i * STAGGER_S (a branch waits until its host has passed the junction)
      let routed = 0;
      traces.forEach((tr, i) => {
        tr.start = Math.max(i * STAGGER_S, tr.host ? tr.host.start + tr.junction / SPEED : 0);
        tr.done = tr.start + tr.cells.length / SPEED;
        routed = Math.max(routed, tr.done + 0.3);
      });
      return { traces, routed, cycle: routed + HOLD_S + FADE_S };
    }

    glyph(ctx, x, y, ch) {
      const px = x * this.cw, py = y * this.chh;
      ctx.save();
      ctx.beginPath(); ctx.rect(px, py, this.cw, this.chh); ctx.clip();
      ctx.translate(px, py + this.top * this.sy); ctx.scale(1, this.sy);
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    }

    cell(x, y, col, a, boxCh) {
      if (x < 0 || y < 0 || x >= this.cols || y >= this.rows || a <= 0.02) return;
      this.sx.clearRect(x * this.cw, y * this.chh, this.cw, this.chh);
      this.sx.fillStyle = css(col, a); this.gx.fillStyle = css(col, a * a);
      const ch = this.box ? boxCh : cellChar(x, y);
      this.glyph(this.sx, x, y, ch); this.glyph(this.gx, x, y, ch);
    }

    draw(t) {
      const sx = this.sx, gx = this.gx, b = this.board;
      sx.clearRect(0, 0, this.W, this.H); gx.clearRect(0, 0, this.W, this.H);
      sx.drawImage(this.fieldC, 0, 0);
      sx.font = gx.font = `bold ${this.size}px ${FONT}`;
      const fade = t > b.routed + HOLD_S ? Math.max(0, 1 - (t - b.routed - HOLD_S) / FADE_S) : 1;
      for (const tr of b.traces) {
        const grown = Math.floor((t - tr.start) * SPEED);
        if (grown < 0) continue;
        const n = Math.min(grown, tr.cells.length);
        // current: a short bright run travelling along the finished trace
        const pulse = t > tr.done ? ((t - tr.done) % PULSE_EVERY_S) * SPEED * 1.6 : -99;
        for (let i = 0; i < n; i++) {
          const { x, y, ch } = tr.cells[i];
          const head = grown < tr.cells.length && i >= n - 3;
          const lit = i >= pulse - PULSE_LEN && i <= pulse;
          const col = head || lit ? mix(this.trace, WHITE, head ? 0.6 : 0.45) : this.trace;
          this.cell(x, y, col, (head || lit ? 1 : 0.72) * fade, ch);
        }
        if (t >= tr.done) {
          const on = Math.min(1, (t - tr.done) / 0.4);
          for (const { x, y } of tr.pad) this.cell(x, y, mix(this.padCol, WHITE, (1 - on) * 0.7), (0.5 + 0.5 * on) * fade, "█");
        }
      }
    }

    frame(ms) {
      requestAnimationFrame(t => this.frame(t));
      if (!this.visible || !this.W || ms - this.last < 1000 / FPS) return;
      this.last = ms;
      if (this.born === null) this.born = ms / 1000;
      let t = ms / 1000 - this.born;
      if (t > this.board.cycle) { this.board = this.route(); this.born = ms / 1000; t = 0; }
      this.draw(t);
    }
  }

  function start() { document.querySelectorAll(".hero.traces").forEach(el => new Traces(el)); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
