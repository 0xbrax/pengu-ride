// REF ai

import { Container, Sprite, Assets } from "pixi.js";
import { COIN_SPEED } from "@/scripts/game/Background.js";
import {ASSETS_MAP} from "@/scripts/system/ASSETS.js";

export class CoinManager {
  /**
   * @param {import("pixi.js").Application} app
   * @param {object} [opts]
   * @param {number}  [opts.speed=COIN_SPEED||60]      Horizontal speed (px/s, moving left)
   * @param {number}  [opts.pool=256]                 Initial pool size
   * @param {number}  [opts.gridRows=10]              Total grid rows (height split). Default 10.
   * @param {number}  [opts.deadRowsTop=1]            Non-spawn rows at top (padding). Default 1.
   * @param {number}  [opts.deadRowsBottom=2]         Non-spawn rows at bottom (padding). Default 2.
   * @param {number}  [opts.slotPadding=4]            Inner padding inside a square slot for the coin (px).
   * @param {"random"|"line"|"diagonalUp"|"diagonalDown"|"peak"|"V"|"block"|"any"} [opts.pattern="any"]
   * @param {object}  [opts.shapes]                   Per-pattern options (columns/rows counts)
   * @param {number}  [opts.seed]                     Seed for deterministic RNG
   * @param {Record<string, number>} [opts.patternWeights] Weights for "any" pattern selection
   */
  constructor(app, opts = {}) {
    this.app = app;
    this.ASSETS_MAP = ASSETS_MAP;

    // Scene graph
    this.container = new Container();
    this.container.zIndex = 10;
    this.app.stage.addChild(this.container);

    // State
    this.ready = false;
    this.paused = false;

    // Config (constructor-only)
    this.speed     = opts.speed ?? (COIN_SPEED ?? 60);
    this.poolSize  = opts.pool ?? 64; // 256

    // Grid config
    this.gridRows       = Math.max(3, Math.floor(opts.gridRows ?? 20));
    this.deadRowsTop    = Math.max(0, Math.floor(opts.deadRowsTop ?? 4));
    this.deadRowsBottom = Math.max(0, Math.floor(opts.deadRowsBottom ?? 2));
    this.slotPadding    = Math.max(0, Math.floor(opts.slotPadding ?? 0)); // TODO fix (and resize slot column)

    // Patterns
    this.pattern = opts.pattern ?? "any";
    const s = opts.shapes ?? {};
    this.shapeRandom   = { minCols: s?.random?.minCols ?? 6,  maxCols: s?.random?.maxCols ?? 14, thickness: s?.random?.thickness ?? 1 };
    this.shapeLine     = { minCols: s?.line?.minCols ?? 14,   maxCols: s?.line?.maxCols ?? 28,   thickness: s?.line?.thickness ?? 1 };
    this.shapeDiagonal = { minCols: s?.diagonal?.minCols ?? 16,maxCols: s?.diagonal?.maxCols ?? 32,thickness: s?.diagonal?.thickness ?? 1 };
    this.shapePeak     = { minCols: s?.peak?.minCols ?? 20,   maxCols: s?.peak?.maxCols ?? 40,   thickness: s?.peak?.thickness ?? 1 };
    this.shapeV        = { minCols: s?.V?.minCols ?? 20,      maxCols: s?.V?.maxCols ?? 40,      thickness: s?.V?.thickness ?? 1 };
    this.shapeBlock    = { minCols: s?.block?.minCols ?? 6,   maxCols: s?.block?.maxCols ?? 12,  minRows: s?.block?.minRows ?? 3, maxRows: s?.block?.maxRows ?? 5 };

    // RNG
    this._seed = (typeof opts.seed === "number") ? (opts.seed >>> 0) : null;
    this._rngState = this._seed != null ? this._seed : (Math.random() * 0xFFFFFFFF) >>> 0;
    this._patternWeights = this._buildPatternWeights(opts.patternWeights);

    // Resources & pooling
    this._texture = null;
    this._pool = [];
    this._alive = new Set();

    // Runtime & derived metrics
    this._distanceAccumulator = 0;
    this._slotWidthPx = 32; // updated in _recomputeGrid()
    this._slotSide = 32;    // square slot side
    this._rowCenters = [];  // y centers per row index
    this._usableRowIds = []; // indices allowed to spawn
    this._spawnRightOffset = 30;

    // gaps
    this.gapMinSlots = 2;
    this.gapMaxSlots = 8;
    this.gapChance   = 0.3;
    this._gapSlotsLeft = 0;

    // pattern queue (per column: one row index or array of row indices)
    this._patternQueue = [];

    // texture logical metrics (for scaling)
    this._logicalW = 0;
    this._logicalH = 0;
  }

  // ---------- Init ----------
  init() {
    this._texture = Assets.get(this.ASSETS_MAP.texture[0].alias); // coin
    this._measureTextureLogicalSize();
    this._recomputeGrid();

    for (let i = 0; i < this.poolSize; i++) {
      const sprite = new Sprite(this._texture);
      sprite.anchor.set(0.5);
      sprite.visible = false;
      sprite.renderable = false;
      sprite.__vx = 0;
      sprite.__vy = 0;
      this._pool.push(sprite);
      this.container.addChild(sprite);
    }

    // Apply initial scale to all sprites
    this._applyScaleToAllSprites();

    this.ready = true;
  }

  // ---------- Controls ----------
  pause()  { this.paused = true; }
  resume() { this.paused = false; }
  toggle() { this.paused = !this.paused; }

  clear() {
    for (const s of this._alive) this._despawn(s);
    this._alive.clear();
    this._distanceAccumulator = 0;
    this._gapSlotsLeft = 0;
    this._patternQueue.length = 0;
  }

  /**
   * Resize coins/grid using current app.screen.height or an explicit height.
   * @param {number} [height] - if provided, use this height instead of app.screen.height
   */
  resize(height) {
    if (!this.ready) return;

    // Capture old metrics to remap
    const oldSlot = this._slotWidthPx;
    const oldCenters = this._rowCenters.slice();

    // Recompute grid and scales
    this._recomputeGrid(height);
    this._applyScaleToAllSprites();

    // Remap alive sprites to nearest new row center keeping their row index
    const pickNearestIndex = (y, centers) => {
      let best = 0, bestD = Infinity;
      for (let i = 0; i < centers.length; i++) {
        const d = Math.abs(y - centers[i]);
        if (d < bestD) { bestD = d; best = i; }
      }
      return best;
    };

    const clampUsable = (ri) => {
      if (this._usableRowIds.includes(ri)) return ri;
      // snap to nearest usable row
      if (!this._usableRowIds.length) return Math.min(this.gridRows - 1, Math.max(0, ri));
      let best = this._usableRowIds[0], bestD = Math.abs(ri - best);
      for (const u of this._usableRowIds) {
        const d = Math.abs(ri - u);
        if (d < bestD) { bestD = d; best = u; }
      }
      return best;
    };

    for (const s of this._alive) {
      const oldIdx = pickNearestIndex(s.y, oldCenters);
      const newIdx = clampUsable(oldIdx);
      s.y = this._rowCenters[newIdx] ?? s.y;
    }

    // Remap queued rows to usable grid
    this._patternQueue = this._patternQueue.map(col => {
      if (Array.isArray(col)) return col.map(clampUsable);
      return clampUsable(col);
    });

    // Preserve slot cadence phase
    if (oldSlot > 0 && this._slotWidthPx > 0) {
      const frac = this._distanceAccumulator / oldSlot;
      this._distanceAccumulator = frac * this._slotWidthPx;
    }
  }

  // ---------- Update (dt in seconds) ----------
  update(dt) {
    if (!this.ready || this.paused) return;

    // Move & cull
    for (const s of Array.from(this._alive)) {
      s.x += s.__vx * dt;
      if (s.x < -50) this._despawn(s);
    }

    // Spawn by slots
    this._distanceAccumulator += this.speed * dt;

    while (this._distanceAccumulator >= this._slotWidthPx) {
      this._distanceAccumulator -= this._slotWidthPx;

      if (this._gapSlotsLeft > 0) { this._gapSlotsLeft--; continue; }

      if (!this._patternQueue.length) this._fillPatternQueue();
      const col = this._patternQueue.shift();
      const rows = Array.isArray(col) ? col : [col];

      const xSpawn = this.app.screen.width + this._spawnRightOffset;
      for (const row of rows) this._spawnAtRow(xSpawn, row);

      if (this._rng() < this.gapChance) {
        this._gapSlotsLeft = this._randInt(this.gapMinSlots, this.gapMaxSlots);
      }
    }
  }

  // ---------- Grid / Metrics ----------
  _measureTextureLogicalSize() {
    const src = this._texture.source;
    const res = src?.resolution ?? 1;
    this._logicalW = (src?.width ?? this._texture.width) / res;
    this._logicalH = (src?.height ?? this._texture.height) / res;
  }

  _recomputeGrid(forcedHeight) {
    const H = Math.max(1, Math.floor(forcedHeight ?? this.app.screen.height));
    const rowH = Math.max(4, Math.floor(H / this.gridRows));

    // square slot size and column width
    this._slotSide = rowH;
    this._slotWidthPx = this._slotSide; // square cadence horizontally

    // row centers
    this._rowCenters = Array.from({ length: this.gridRows }, (_, i) => Math.round(i * rowH + rowH / 2));

    // usable rows = remove top/bottom dead zones
    const lastUsable = this.gridRows - this.deadRowsBottom - 1;
    const firstUsable = this.deadRowsTop;
    this._usableRowIds = [];
    for (let i = firstUsable; i <= lastUsable; i++) this._usableRowIds.push(i);

    // keep pattern queue (row indices still valid unless config changed)
  }

  _targetCoinScale() {
    const maxTexSide = Math.max(this._logicalW, this._logicalH) || 1;
    const target = Math.max(2, this._slotSide - 2 * this.slotPadding);
    return target / maxTexSide;
  }

  _applyScaleToAllSprites() {
    const sc = this._targetCoinScale();
    for (const s of this._pool)  s.scale.set(sc);
    for (const s of this._alive) s.scale.set(sc);
  }

  // ---------- Spawn helpers ----------
  _spawnAtRow(x, rowIndex) {
    const s = this._pool.length ? this._pool.pop() : new Sprite(this._texture);
    if (!s.parent) this.container.addChild(s);

    s.x = x;
    s.y = this._rowCenters[Math.max(0, Math.min(this.gridRows - 1, rowIndex))] ?? (this.app.screen.height / 2);
    s.angle = 0;
    s.visible = true;
    s.renderable = true;
    s.__vx = -this.speed;
    s.__vy = 0;

    // ensure correct scale in case pool was empty
    s.scale.set(this._targetCoinScale());

    this._alive.add(s);
    return s;
  }

  _despawn(s) {
    s.visible = false;
    s.renderable = false;
    s.__vx = 0;
    s.__vy = 0;
    this._alive.delete(s);
    this._pool.push(s);
  }

  // ---------- Pattern generation (row-based) ----------
  _fillPatternQueue() {
    const picked = (this.pattern === "any") ? this._pickWeightedPattern() : this.pattern;

    switch (picked) {
      case "line":         this._genLine(); break;
      case "diagonalUp":   this._genDiagonal(true); break;
      case "diagonalDown": this._genDiagonal(false); break;
      case "peak":         this._genPeak(); break;
      case "V":            this._genV(); break;
      case "block":        this._genBlock(); break;
      default:              this._genRandomBurst(); break; // "random"
    }
  }

  _maxColumnsForViewport(buffer = 2) {
    const w = this.app.screen.width;
    return Math.max(2, Math.floor(w / this._slotWidthPx) + buffer);
  }

  _randomRow() {
    const list = this._usableRowIds;
    return list[this._randInt(0, Math.max(0, list.length - 1))] ?? Math.max(0, Math.min(this.gridRows - 1, this.deadRowsTop));
  }

  _stackAtRow(rowIndex, thickness) {
    if (thickness <= 1) return [rowIndex|0];
    const half = (thickness - 1) / 2;
    const rows = [];
    for (let i = -half; i <= half; i++) {
      const r = Math.round(rowIndex + i);
      if (this._usableRowIds.includes(r)) rows.push(r);
    }
    return rows.length ? rows : [rowIndex];
  }

  _genRandomBurst() {
    const maxCols = this._maxColumnsForViewport();
    const len = Math.min(maxCols, this._randInt(this.shapeRandom.minCols, this.shapeRandom.maxCols));
    for (let i = 0; i < len; i++) {
      const r0 = this._randomRow();
      this._patternQueue.push(this._stackAtRow(r0, this.shapeRandom.thickness));
    }
  }

  _genLine() {
    const maxCols = this._maxColumnsForViewport();
    const len = Math.min(maxCols, this._randInt(this.shapeLine.minCols, this.shapeLine.maxCols));
    const r0 = this._randomRow();
    for (let i = 0; i < len; i++) this._patternQueue.push(this._stackAtRow(r0, this.shapeLine.thickness));
  }

  _genDiagonal(upwards) {
    const maxCols = this._maxColumnsForViewport();
    const len = Math.min(maxCols, this._randInt(this.shapeDiagonal.minCols, this.shapeDiagonal.maxCols));
    const list = this._usableRowIds;
    if (!list.length) return;

    // start in middle of usable band
    const startIdx = Math.floor(list.length / 2);
    let r = list[this._randInt(Math.max(0, startIdx - 1), Math.min(list.length - 1, startIdx + 1))];
    const step = upwards ? -1 : 1;

    for (let i = 0; i < len; i++) {
      this._patternQueue.push(this._stackAtRow(r, this.shapeDiagonal.thickness));
      // move one row (clamped within usable)
      let next = r + step;
      if (!this._usableRowIds.includes(next)) next = r - step; // bounce
      if (!this._usableRowIds.includes(next)) next = r;         // stuck
      r = next;
    }
  }

  _genPeak() {
    const maxCols = this._maxColumnsForViewport();
    const len = Math.min(maxCols, this._randInt(this.shapePeak.minCols, this.shapePeak.maxCols));
    const half = Math.max(2, Math.floor(len / 2));
    const list = this._usableRowIds;
    if (!list.length) return;

    let r = list[Math.floor(list.length / 2)];
    for (let i = 0; i < half; i++) {
      this._patternQueue.push(this._stackAtRow(r, this.shapePeak.thickness));
      const up = r - 1; r = this._usableRowIds.includes(up) ? up : r; // up slope
    }
    for (let i = 0; i < len - half; i++) {
      this._patternQueue.push(this._stackAtRow(r, this.shapePeak.thickness));
      const down = r + 1; r = this._usableRowIds.includes(down) ? down : r; // down slope
    }
  }

  _genV() {
    const maxCols = this._maxColumnsForViewport();
    const len = Math.min(maxCols, this._randInt(this.shapeV.minCols, this.shapeV.maxCols));
    const half = Math.max(2, Math.floor(len / 2));
    const list = this._usableRowIds;
    if (!list.length) return;

    let r = list[Math.floor(list.length / 2)];
    for (let i = 0; i < half; i++) {
      this._patternQueue.push(this._stackAtRow(r, this.shapeV.thickness));
      const down = r + 1; r = this._usableRowIds.includes(down) ? down : r; // down slope
    }
    for (let i = 0; i < len - half; i++) {
      this._patternQueue.push(this._stackAtRow(r, this.shapeV.thickness));
      const up = r - 1; r = this._usableRowIds.includes(up) ? up : r; // up slope
    }
  }

  _genBlock() {
    const maxCols = this._maxColumnsForViewport();
    const cols = Math.min(maxCols, this._randInt(this.shapeBlock.minCols, this.shapeBlock.maxCols));

    // rows for block: choose contiguous band within usable rows
    const usable = this._usableRowIds;
    if (!usable.length) return;

    const maxRows = Math.min(usable.length, this.shapeBlock.maxRows);
    const rowsCount = Math.max(1, Math.min(maxRows, this._randInt(this.shapeBlock.minRows, maxRows)));

    const startMax = Math.max(0, usable.length - rowsCount);
    const startIdx = this._randInt(0, startMax);
    const band = usable.slice(startIdx, startIdx + rowsCount);

    for (let c = 0; c < cols; c++) this._patternQueue.push([...band]);
  }

  // ---------- RNG & helpers ----------
  _rng() {
    this._rngState = (this._rngState + 0x6D2B79F5) >>> 0;
    let t = this._rngState;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  _randInt(a, b) { return a + Math.floor(this._rng() * (b - a + 1)); }

  _buildPatternWeights(input = {}) {
    const keys = ["random","line","diagonalUp","diagonalDown","peak","V","block"];
    const weights = {}; let sum = 0;
    for (const k of keys) { const w = Number(input?.[k] ?? 1); const v = isFinite(w) && w > 0 ? w : 0; weights[k] = v; sum += v; }
    if (sum <= 0) { for (const k of keys) weights[k] = 1; sum = keys.length; }
    for (const k of keys) weights[k] = weights[k] / sum;
    return weights;
  }

  _pickWeightedPattern() {
    const r = this._rng(); let acc = 0;
    for (const [name, w] of Object.entries(this._patternWeights)) { acc += w; if (r <= acc) return name; }
    return "random";
  }
}
