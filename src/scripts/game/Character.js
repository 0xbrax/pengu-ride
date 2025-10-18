import {Assets, Graphics} from "pixi.js";
import {Spine} from "@esotericsoftware/spine-pixi-v8";
import {App} from "@/scripts/system/App.js";

export const CHARACTER_ANIMATIONS = {
  ARCHERY: "Archery",
  DEAD: "Dead",
  DRIVING: "Driving",
  FALL: "Fall",
  HIT: "Hit",
  IDLE: "Idle",
  JUMP: "Jump",
  PARACHUTE: "Parachute",
  ROLL: "Roll",
  RUN: "Run",
  THROWING: "Throwing",
  WIN: "Win",
};

export class Character {
  constructor() {
    this.gameInstance = new App();
    this.baseScale = null;
    this.baseHeight = null;
    this.baseXOffset = -200;
    this.baseYOffset = 300;
    this.scale = 0.25;

    // --- Physics ---
    // "Base" values independent of scale; multiplied by current scale
    this.vy = 0; // vertical velocity (px/s)
    this.gravityBase = 1800; // base gravity (px/s^2)
    this.jumpImpulseBase = 1200; // base upward impulse (px/s)

    // Effective values (depend on current scale)
    this.gravity = this.gravityBase;
    this.jumpImpulse = this.jumpImpulseBase;

    // Current scale multiplier versus baseScale (used to adapt physics on resize)
    this._scaleMul = 1;

    // gaps (scaled on resize): keep a bit of headroom and floor room
    this.topGapFactor = 0.0;    // % of character height from top
    this.bottomGapFactor = 0.30; // % of character height from bottom
    this.minY = 0; // computed on resize
    this.maxY = 0; // computed on resize

    // input flag (tap to flap)
    this._wantsFlap = false;

    this.debugGraphics = null;

    this.hitboxConfig = {
      width: 0.21,
      height: 0.45,
      offsetX: 0.03,
      offsetY: 0.15,
    };

    this.isAlive = true;

    void this.createSpine();
  }

  async createSpine() {
    Assets.add({alias: "spineData", src: "/spine/Character.json"});
    Assets.add({alias: "spineAtlas", src: "/spine/Character.atlas"});
    await Assets.load(["spineData", "spineAtlas"]);

    this.spine = Spine.from({
      skeleton: "spineData",
      atlas: "spineAtlas",
    });

    this.spine.state.data.defaultMix = 0.2;

    // Start animation (can be switched on flap/fall if you like)
    this.spine.state.setAnimation(0, CHARACTER_ANIMATIONS.DRIVING, true);

    this.baseScale = this.spine.scale.x;
    this.baseHeight = this.spine.height;
    this.spine.zIndex = 20;

    this.createDebugBounds();

    this.resize();

    this.gameInstance.app.stage.addChild(this.spine);
  }

  jump(){
    if (!this.spine || !this.isAlive) {
      return;
    }

    this._wantsFlap = true; // processed in update() for frame-consistency
  }

  // --- Bounds helpers (scaled on resize) ---
  computeVerticalLimits() {
    const screenH = this.gameInstance.app.screen.height;
    const charH = this.spine.height; // already scaled

    const topGap = Math.max(8, charH * this.topGapFactor);
    const bottomGap = Math.max(8, charH * this.bottomGapFactor);

    // y is the pivoted position; assume default pivot (center).
    // We'll interpret y as the character's root position. Using bounds is safer:
    const b = this.getHitbox();
    const currentOffset = this.spine.y - (b.y + b.height / 2); // keep relative center offset

    // Limits where the character center can be so its bounds respect gaps
    this.minY = topGap + b.height / 2 + currentOffset; // ceiling limit
    this.maxY = screenH - (bottomGap + b.height / 2) + currentOffset; // floor limit
  }

  createDebugBounds() {
    this.debugGraphics = new Graphics();
    this.debugGraphics.zIndex = 100;
    this.gameInstance.app.stage.addChild(this.debugGraphics);
  }

  updateDebugBounds() {
    if (!this.debugGraphics || !this.spine) {
      return;
    }

    const bounds = this.spine.getBounds();
    const hitbox = this.getHitbox();

    this.debugGraphics.clear();

    this.debugGraphics
      .rect(bounds.x, bounds.y, bounds.width, bounds.height)
      .stroke({width: 1, color: "#0000ff", alpha: 0.5});

    this.debugGraphics
      .rect(hitbox.x, hitbox.y, hitbox.width, hitbox.height)
      .stroke({width: 3, color: "#ff0000"});

    this.debugGraphics
      .rect(hitbox.x, hitbox.y, hitbox.width, hitbox.height)
      .fill({color: "#ff0000", alpha: 0.1});

    this.debugGraphics
      .circle(hitbox.x + hitbox.width / 2, hitbox.y + hitbox.height / 2, 5)
      .fill("#00ff00");
  }

  getHitbox() {
    if (!this.spine) {
      return null;
    }

    const originalBounds = this.spine.getBounds();

    const hitboxWidth = originalBounds.width * this.hitboxConfig.width;
    const hitboxHeight = originalBounds.height * this.hitboxConfig.height;

    const hitboxX = originalBounds.x + (originalBounds.width - hitboxWidth) / 2 +
      (originalBounds.width * this.hitboxConfig.offsetX);
    const hitboxY = originalBounds.y + (originalBounds.height - hitboxHeight) / 2 +
      (originalBounds.height * this.hitboxConfig.offsetY);

    return {
      x: hitboxX,
      y: hitboxY,
      width: hitboxWidth,
      height: hitboxHeight
    };
  }

  resize() {
    if (!this.spine) {
      return;
    }

    const currentHeight = this.gameInstance.app.screen.height;
    const scaleRatio = currentHeight / this.baseHeight;
    const newScale = this.baseScale * scaleRatio * this.scale;

    const prevScaleMul = this._scaleMul || 1;

    this.spine.scale.set(newScale);

    this.spine.x = (this.gameInstance.app.screen.width / 2) + (this.baseXOffset * (newScale / this.baseScale));
    this.spine.y = (this.gameInstance.app.screen.height / 2) + (this.baseYOffset * (newScale / this.baseScale));

    // --- Update scale multiplier and physics ---
    this._scaleMul = this.spine.scale.x / this.baseScale; // quanto siamo più grandi del base

    // Adapt physics values to the new scale
    this.gravity = this.gravityBase * this._scaleMul;
    this.jumpImpulse = this.jumpImpulseBase * this._scaleMul;

    // Preserve current feel by rescaling current velocity as well
    // (otherwise after a resize it may feel too slow/fast)
    const velMul = this._scaleMul / prevScaleMul;
    this.vy *= velMul;

    // Recompute vertical limits based on new scale and screen size
    this.computeVerticalLimits();

    // Clamp in case resize pushed us out of bounds
    if (this.spine.y > this.maxY) this.spine.y = this.maxY;
    if (this.spine.y < this.minY) this.spine.y = this.minY;

    this.updateDebugBounds();
  }

  // --- Physics update ---
  update(dt) {
    if (!this.spine) {
      return;
    }

    // Handle input (one-shot)
    if (this._wantsFlap) {
      this.vy = -this.jumpImpulse; // instant upward velocity scaled with resize
      // optional: briefly play jump animation without queuing
      // try {
      //   this.spine.state.setAnimation(0, CHARACTER_ANIMATIONS.JUMP, false);
      //   this.spine.state.addAnimation(0, CHARACTER_ANIMATIONS.DRIVING, true, 0.2);
      // } catch (_) {}
      this._wantsFlap = false;
    }

    // Apply gravity (already scaled with resize)
    this.vy += this.gravity * dt;

    // Integrate position
    this.spine.y += this.vy * dt;

    // Clamp to bounds
    if (this.spine.y > this.maxY) {
      this.spine.y = this.maxY;
      this.vy = 0; // stop falling at the floor
    }
    if (this.spine.y < this.minY) {
      this.spine.y = this.minY;
      if (this.vy < 0) this.vy = 0; // stop rising at the ceiling
    }

    this.updateDebugBounds();
  }

  // destroy() {
  //   if (this._tickerFn) this.gameInstance.app.ticker.remove(this._tickerFn);
  //   if (this.debugGraphics) this.debugGraphics.destroy();
  //   if (this.spine) this.spine.destroy();
  // }
}
