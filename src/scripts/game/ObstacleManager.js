import {App} from "@/scripts/system/App.js";
import {Assets, Container, Graphics, Sprite, Texture} from "pixi.js";
import {ASSETS_MAP} from "@/scripts/system/ASSETS.js";
import {COIN_SPEED} from "@/scripts/game/Background.js";
import {gsap} from "gsap";
import {getRandomInt} from "@/scripts/system/utils.js";

export class ObstacleManager {
  constructor() {
    this.gameInstance = new App();
    this.container = new Container();

    this.container.zIndex = 20;
    this.gameInstance.app.stage.addChild(this.container);

    this.texture = new Texture(Assets.get(ASSETS_MAP.texture[1].alias)); // icicle
    this.speed = COIN_SPEED;

    this.configs = {
      spriteMainScale: 0.35,
      spriteScaleVariations: [0.7, 0.85, 1],
      minCols: 1,
      maxCols: 5,
      yOffset: 3,
      xOffset: 39,
      timeouts: [3_000, 3_500, 4_000],
    };

    this.hitboxConfig = {
      width: 0.16,
      height: 0.72,
      offsetX: 0.0,
      offsetY: -0.02,
    };

    this.spritesPool = new Set();
    this.timeouts = [];
    this.lastSpawnX = 0;
    this.isRunning = false;


    // DEBUG
    this.debugEnabled = false;
    this.debugGraphics = new Graphics();
    this.debugGraphics.zIndex = 1300;
    this.gameInstance.app.stage.addChild(this.debugGraphics);
  }

  createSprites() {
    const maxLength = getRandomInt(this.configs.minCols, this.configs.maxCols);

    if (this.lastSpawnX === 0) {
      this.lastSpawnX = this.gameInstance.app.screen.width - this.container.position.x;
    }

    for (let i = 0; i < maxLength; i++) {
      const randomScale = this.configs.spriteScaleVariations[getRandomInt(0, this.configs.spriteScaleVariations.length - 1)];

      const scaleFactor = this.gameInstance.app.screen.height / this.texture.height;
      const newScale = this.configs.spriteMainScale * randomScale * scaleFactor;

      const sprite = new Sprite(this.texture);
      sprite.anchor.set(0.5, 0); // top-center

      sprite.scale.set(newScale);
      sprite._scaleFactor = scaleFactor;
      sprite._randomScale = randomScale;

      const spawnX = this.gameInstance.app.screen.width - this.container.position.x + sprite.width + (i * this.configs.xOffset * scaleFactor);
      sprite.position.x = spawnX;
      sprite._spawnX = spawnX;

      const quarterHeight = (this.texture.height * newScale) / 4;
      sprite.position.y = (this.configs.yOffset * scaleFactor) - quarterHeight;

      this.spritesPool.add(sprite);
      this.container.addChild(sprite);
    }
  }

  startSpawnInterval() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    const scheduleNext = () => {
      const ms = this.configs.timeouts[getRandomInt(0, this.configs.timeouts.length - 1)];
      const id = setTimeout(() => {
        if (!this.isRunning) {
          return;
        }

        this.createSprites();
        scheduleNext();
      }, ms);

      this.timeouts.push(id);
    };

    this.createSprites();
    scheduleNext();
  }

  clearSpawnInterval() {
    this.timeouts.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    this.timeouts = [];

    this.spritesPool.forEach(sprite => {
      gsap.killTweensOf(sprite);
      this.container.removeChild(sprite);
      this.spritesPool.delete(sprite);
      sprite.destroy();
    });

    this.container.position.x = 0;
  }

  clearSprite(sprite) {
    if (!this.spritesPool.has(sprite)) {
      console.error("Sprite not found in spritesPool, cannot clear.");
      return;
    }

    this.spritesPool.delete(sprite);
    this.container.removeChild(sprite);
    sprite.destroy();
  }

  resize() {
    if (!this.texture) {
      return;
    }

    this.spritesPool.forEach(sprite => {
      const scaleFactor = this.gameInstance.app.screen.height / this.texture.height;
      const newScale = this.configs.spriteMainScale * sprite._randomScale * scaleFactor;
      sprite.scale.set(newScale);

      sprite.position.x = sprite._spawnX * scaleFactor / sprite._scaleFactor;
      sprite._spawnX = sprite.position.x;

      const quarterHeight = (this.texture.height * newScale) / 4;
      sprite.position.y = (this.configs.yOffset * scaleFactor) - quarterHeight;

      sprite._scaleFactor = scaleFactor;
    });
  }

  update(dt) {
    if (!this.texture) {
      return;
    }

    // Animate
    this.container.position.x -= this.speed * dt;

    // Initiate
    if (!this.timeouts.length) {
      this.startSpawnInterval();
    }

    // Clear
    this.spritesPool.forEach(sprite => {
      if (sprite.position.x < -sprite.width) {
        this.clearSprite(sprite);
      }
    });

    // Redraw debug overlay
    this.drawDebugHitboxes();
  }

  /**
   * ANIMATION
   */
  animateObstacleHit(
    obstacle,
    {
      fallYPercent = 0.91, // final Y point as % of screen height
      nudgeXPercent = 0.015, // initial push to the right (% of screen width)
      shakeXPercent = 0.005, // horizontal shake amplitude (% of screen width)
      shakeDuration = 0.35, // total shake duration
      shakeRepeats = 4, // number of "half-oscillations" (yoyo)
      fallDuration = 0.6, // fall duration
      rotateSide = "left", // "right" => +90°, "left" => -90°
    } = {},
  ) {
    if (!obstacle) {
      return;
    }

    obstacle._isAnimating = true; // Not used

    const startX = obstacle.x;

    const screenW = this.gameInstance.app.screen.width;
    const screenH = this.gameInstance.app.screen.height;

    const toLocalDeltaX = (percent) =>
      this.globalXToLocal(screenW * percent) - this.globalXToLocal(0);

    const groundLocalY = this.globalYToLocal(screenH * fallYPercent);
    const nudgeLocalX = toLocalDeltaX(nudgeXPercent);
    const shakeLocalX = toLocalDeltaX(shakeXPercent);

    const targetRotation = (rotateSide === "left" ? -1 : 1) * (Math.PI / 2);

    const tl = gsap.timeline({
      defaults: {ease: "power2.out"},
      onComplete: () => {
        obstacle._isAnimating = false;
      },
    });

    // 1) Push to the right
    tl.to(obstacle, {
      x: obstacle.x + nudgeLocalX,
      duration: 0.12,
    });

    // 2) Horizontal shake
    tl.to(obstacle, {
      x: `+=${shakeLocalX}`,
      duration: shakeDuration / (shakeRepeats || 1),
      yoyo: true,
      repeat: shakeRepeats,
      ease: "sine.inOut",
    });

    // 3.1) Fall down
    tl.to(obstacle, {
      y: groundLocalY,
      duration: fallDuration,
      ease: "power2.in",
    });
    // 3.2) Rotate
    tl.to(
      obstacle,
      {
        x: startX,
        rotation: targetRotation,
        duration: fallDuration,
        ease: "power1.in",
      },
      "<", // sync with fall down
    );

    return tl;
  }

  /**
   * UTILS
   */
  globalToLocalPoint(xPx, yPx) {
    return this.container.toLocal({x: xPx, y: yPx});
  }

  globalXToLocal(xPx) {
    return this.globalToLocalPoint(xPx, 0).x;
  }

  globalYToLocal(yPx) {
    return this.globalToLocalPoint(0, yPx).y;
  }

  getHitbox(obstacle) {
    const originalBounds = obstacle.getBounds();

    const hitboxWidth = originalBounds.width * this.hitboxConfig.width;
    const hitboxHeight = originalBounds.height * this.hitboxConfig.height;

    const hitboxX =
      originalBounds.x +
      (originalBounds.width - hitboxWidth) / 2 +
      (originalBounds.width * this.hitboxConfig.offsetX);

    const hitboxY =
      originalBounds.y +
      (originalBounds.height - hitboxHeight) / 2 +
      (originalBounds.height * this.hitboxConfig.offsetY);

    return {x: hitboxX, y: hitboxY, width: hitboxWidth, height: hitboxHeight};
  }

  hitboxGlobalToLocalRect(hit) {
    const p1 = this.globalToLocalPoint(hit.x, hit.y);
    const p2 = this.globalToLocalPoint(hit.x + hit.width, hit.y + hit.height);
    return {
      x: p1.x,
      y: p1.y,
      width: p2.x - p1.x,
      height: p2.y - p1.y,
    };
  }

  drawDebugHitboxes() {
    if (!this.debugEnabled) return;

    const g = this.debugGraphics;
    g.clear();

    for (const obstacle of this.spritesPool) {
      const hbGlobal = this.getHitbox(obstacle);
      const hbLocal = this.hitboxGlobalToLocalRect(hbGlobal);

      g.rect(hbLocal.x, hbLocal.y, hbLocal.width, hbLocal.height)
        .stroke({width: 1, color: 0xff0000, alpha: 1})
        .fill({color: 0xff0000, alpha: 0.15});
    }
  }
}
