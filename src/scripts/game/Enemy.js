import {App} from "@/scripts/system/App.js";
import {AnimatedSprite, Assets, Graphics} from "pixi.js";
import {ASSETS_MAP} from "@/scripts/system/ASSETS.js";

export class Enemy {
  constructor() {
    this.gameInstance = new App();
    this.ASSETS_MAP = ASSETS_MAP;

    this.baseScale = null;
    this.baseHeight = null;
    this.baseYOffset = 90;
    this.scale = 0.4;

    this.debugGraphics = null;
    
    this.speed = 240;
    this.dir = -1; // 1 = go to the right, -1 = go to the left
    this.padding = 0;
    this.fixedSpeed = false;

    this.hitboxConfig = {
      width: 0.24,
      height: 0.36,
      offsetX: -0.14,
      offsetY: 0.09,
    };

    this.createSprite();
  }

  createSprite() {
    const sheet = Assets.get(this.ASSETS_MAP.enemy[0].alias); // enemy json

    const pad3 = (n) => String(n).padStart(3, "0");

    const makeRangeFrames = (prefix, start, end, ext = ".png") => {
      const frames = [];
      for (let i = start; i <= end; i++) {
        const name = `${prefix}${pad3(i)}${ext}`; // e.g. 0_specialty_walk_000.png
        const tex = sheet.textures[name];
        if (!tex) {
          console.warn("Missing frame: ", name);
          continue;
        }
        frames.push(tex);
      }
      return frames;
    };

    this.framesWalk = makeRangeFrames("0_specialty_walk_", 0, 19);
    this.framesAttack = makeRangeFrames("0_specialty_attack_", 0, 19);

    this.sprite = new AnimatedSprite(this.framesWalk);
    this.sprite.anchor.set(0.5);

    this.sprite.animationSpeed = 0.3;
    this.sprite.loop = true;
    this.sprite.play();

    this.baseScale = this.sprite.scale.y;
    this.baseHeight = this.sprite.height;

    this.sprite.zIndex = 40;

    this.sprite.x = this.gameInstance.app.screen.width + this.sprite.width;

    // this.createDebugBounds();

    this.createSlash(); // this.subSprite

    this.resize();

    this.gameInstance.app.stage.addChild(this.sprite);
    this.gameInstance.app.stage.addChild(this.subSprite);
  }

  createSlash() {
    const sheet = Assets.get(this.ASSETS_MAP.enemy[2].alias); // slash json

    this.subSprite = new AnimatedSprite(Object.values(sheet.textures));
    this.subSprite.zIndex = 50;

    this.subSprite.anchor.set(0.5);

    this.subSprite.visible = false;
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

      // Stop for a while
      this.speed = 0;

      this.playSlash();

      this.sprite.onComplete = () => {
        // Normal speed for both directions
        this.speed = 120;

        this.playAnim("walk");
      };
    }
  }

  playSlash() {
    const currentHeight = this.gameInstance.app.screen.height;
    const scaleRatio = currentHeight / this.baseHeight;

    this.subSprite.visible = true;
    this.subSprite.y = this.sprite.y + (60 * scaleRatio);

    if (this.dir === -1) {
      this.subSprite.x = this.sprite.x + (15 * scaleRatio);
    } else {
      this.subSprite.x = this.sprite.x + (-15 * scaleRatio);
    }

    this.subSprite.scale.x = Math.abs(this.subSprite.scale.x) * this.dir;
    this.subSprite.animationSpeed = 0.3;
    this.subSprite.loop = false;
    this.subSprite.gotoAndPlay(0);

    this.subSprite.onComplete = () => {
      this.subSprite.visible = false;
    };
  }

  createDebugBounds() {
    this.debugGraphics = new Graphics();
    this.debugGraphics.zIndex = 1200;
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
      height: hitboxHeight,
    };
  }

  resize() {
    if (!this.sprite || !this.subSprite) {
      return;
    }

    const currentHeight = this.gameInstance.app.screen.height;
    const scaleRatio = currentHeight / this.baseHeight;
    const newScale = this.baseScale * scaleRatio * this.scale;

    this.sprite.scale.set(newScale);
    this.sprite.scale.x *= this.dir;

    this.sprite.y = this.gameInstance.app.screen.height - (this.baseYOffset * scaleRatio);

    this.subSprite.scale.set(newScale);
    this.subSprite.scale.y *= -1;

    this.updateDebugBounds();
  }

  update(dt) {
    if (!this.sprite) {
      return;
    }

    this.sprite.x += this.dir * this.speed * dt;

    const appWidth = this.gameInstance.app.screen.width;
    const spriteWidth = this.sprite.width;

    const leftEdge = this.sprite.x + spriteWidth;
    const rightEdge = this.sprite.x - spriteWidth;

    if (rightEdge >= appWidth - this.padding) {
      // clamp
      this.sprite.x = (appWidth - this.padding) + spriteWidth;
      this.dir = -1;

      if (this.fixedSpeed) {
        this.speed = 120;
      } else {
        this.speed = 240;
      }

      this.sprite.scale.x = -Math.abs(this.sprite.scale.x);
      this.hitboxConfig.offsetX = -this.hitboxConfig.offsetX;
    }

    if (leftEdge <= this.padding) {
      // clamp
      this.sprite.x = this.padding - spriteWidth;
      this.dir = 1;

      this.speed = 120;
      this.sprite.scale.x = Math.abs(this.sprite.scale.x);
      this.hitboxConfig.offsetX = -this.hitboxConfig.offsetX;
    }

    this.updateDebugBounds();
  }
}