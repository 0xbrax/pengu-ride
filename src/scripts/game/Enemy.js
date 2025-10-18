import {App} from "@/scripts/system/App.js";
import {AnimatedSprite, Assets, Graphics} from "pixi.js";

export class Enemy {
  constructor() {
    this.gameInstance = new App();
    this.baseScale = null;
    this.baseHeight = null;
    this.baseYOffset = 90;
    this.scale = 0.4;

    this.debugGraphics = null;

    this.speed = 120;
    this.dir = -1; // 1 = go to the right, -1 = go to the left
    this.padding = 0;

    this.hitboxConfig = {
      width: 0.24,
      height: 0.36,
      offsetX: 0.14 * this.dir,
      offsetY: 0.09,
    };

    void this.createSprite();
  }

  async createSprite() {
    const sheet = await Assets.load('/sprite/spritesheet.json');

    const pad3 = (n) => String(n).padStart(3, "0");
    function makeRangeFrames(prefix, start, end, ext = ".png") {
      const frames = [];
      for (let i = start; i <= end; i++) {
        const name = `${prefix}${pad3(i)}${ext}`;      // es. 0_specialty_walk_000.png
        const tex = sheet.textures[name];
        if (!tex) {
          console.warn("Frame mancante:", name);
          continue;
        }
        frames.push(tex);
      }
      return frames;
    }

// 3) Crea i due set di texture (walk/attack)
    this.framesWalk   = makeRangeFrames("0_specialty_walk_",   0, 19);
    this.framesAttack = makeRangeFrames("0_specialty_attack_", 0, 19);

// 4) UN solo AnimatedSprite, parti con walk
    this.sprite = new AnimatedSprite(this.framesWalk);
    this.sprite.anchor.set(0.5);

    this.sprite.animationSpeed = 0.3;
    this.sprite.loop = true;
    this.sprite.play();

    this.baseScale = this.sprite.scale.y;
    this.baseHeight = this.sprite.height;

    this.sprite.zIndex = 30

    this.createDebugBounds();

    this.sprite.x = this.gameInstance.app.screen.width + this.sprite.width;
    this.resize();

    this.gameInstance.app.stage.addChild(this.sprite);
  }

  playAnim(name) {
    if (name === "walk") {
      this.sprite.textures = this.framesWalk;
      this.sprite.loop = true;
      this.sprite.animationSpeed = 0.15;
      this.sprite.gotoAndPlay(0);
    } else if (name === "attack") {
      this.sprite.textures = this.framesAttack;
      this.sprite.loop = false;
      this.sprite.animationSpeed = 0.45;
      this.sprite.gotoAndPlay(0);

      this.speed = 0;

      this.sprite.onComplete = () => {
        this.speed = 120;

        this.playAnim("walk");
      }
    }
  }

  createDebugBounds() {
    this.debugGraphics = new Graphics();
    this.debugGraphics.zIndex = 100;
    this.gameInstance.app.stage.addChild(this.debugGraphics);
  }

  updateDebugBounds() {
    if (!this.debugGraphics || !this.sprite) {
      return;
    }

    const bounds = this.sprite.getBounds();
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
    if (!this.sprite) {
      return null;
    }

    const originalBounds = this.sprite.getBounds();

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
    if (!this.sprite) {
      return;
    }

    const currentHeight = this.gameInstance.app.screen.height;
    const scaleRatio = currentHeight / this.baseHeight;
    const newScale = this.baseScale * scaleRatio * this.scale;

    this.sprite.scale.set(newScale);
    this.sprite.scale.x *= this.dir;

    this.sprite.y = this.gameInstance.app.screen.height - (this.baseYOffset * scaleRatio);

    this.updateDebugBounds();
  }

  update(dt) {
    if (!this.sprite) {
      return;
    }

    this.sprite.x += this.dir * this.speed * dt;

    const appWidth = this.gameInstance.app.screen.width;
    const spriteWidth = this.sprite.width;

    const leftEdge  = this.sprite.x + spriteWidth;
    const rightEdge = this.sprite.x - spriteWidth;

    // collisione con bordo destro
    if (rightEdge >= appWidth - this.padding) {
      // clamp
      this.sprite.x = (appWidth - this.padding) + spriteWidth;
      // inverti direzione e flip X
      this.dir = -1;
      this.hitboxConfig.offsetX = -this.hitboxConfig.offsetX;
      this.sprite.scale.x = -Math.abs(this.sprite.scale.x);
    }

    // collisione con bordo sinistro
    if (leftEdge <= this.padding) {
      // clamp
      this.sprite.x = this.padding - spriteWidth;
      // inverti direzione e flip X
      this.dir = 1;
      this.hitboxConfig.offsetX = -this.hitboxConfig.offsetX;
      this.sprite.scale.x = Math.abs(this.sprite.scale.x);
    }

    this.updateDebugBounds();
  }
}