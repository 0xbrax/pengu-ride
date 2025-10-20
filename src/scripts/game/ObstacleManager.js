import { App } from "@/scripts/system/App.js";
import { Assets, Container, Graphics, Sprite } from "pixi.js";
import { ASSETS_MAP } from "@/scripts/system/ASSETS.js";
import { COIN_SPEED } from "@/scripts/game/Background.js";
import { gsap } from "gsap";

export class ObstacleManager {
  constructor() {
    this.gameInstance = new App();
    this.container = new Container();
    this.container.zIndex = 20;
    this.gameInstance.app.stage.addChild(this.container);

    this.asset = Assets.get(ASSETS_MAP.texture[1].alias);

    // Pool
    this.maxObstacles = 4;
    this.obstaclePool = [];
    this.activeObstacles = [];

    // Percentuali schermo
    this.yPercent = -0.10;
    this.xSpacingPercent = 0.15;

    // Stato generazione
    this.lastObstacleX = 0;

    // Scala sprite
    this.baseScale = 1;
    this.baseHeight = null;
    this.scaleVariations = [0.3, 0.4, 0.5];

    // Velocità
    this.speed = COIN_SPEED;

    // Collision (percentuali sul bound visivo)
    this.hitboxConfig = {
      width: 0.16,
      height: 0.72,
      offsetX: 0.0,
      offsetY: -0.02,
    };

    // DEBUG
    this.debugEnabled = false; // <--- attiva/disattiva overlay hitbox
    this.debugGraphics = new Graphics();
    this.debugGraphics.zIndex = 1300;
    this.container.addChild(this.debugGraphics);
    // (se usi zIndex, ricordati: this.container.sortableChildren = true)

    this.initializePool();
  }

  setDebugEnabled(flag) {
    this.debugEnabled = !!flag;
    this.debugGraphics.visible = this.debugEnabled;
    if (!this.debugEnabled) this.debugGraphics.clear();
  }

  resetLevel() {
    // stop movimento/animazioni
    for (const o of [...this.activeObstacles, ...this.obstaclePool]) {
      if (!o) continue;
      if (typeof gsap !== "undefined") gsap.killTweensOf(o);
      o._isAnimating = false;
      // stato pulito
      o.rotation = 0;
      o.visible = false;
    }
    this.activeObstacles.length = 0;

    // pulizia overlay debug
    if (this.debugGraphics) this.debugGraphics.clear();

    // azzera stato di generazione
    this.lastObstacleX = 0;

    // rigenera
    this.generateInitialObstacles();
  }

  initializePool() {
    for (let i = 0; i < this.maxObstacles; i++) {
      const obstacle = this.createObstacle();
      obstacle.visible = false;
      obstacle.originalScaleMultiplier = 1.0;
      this.obstaclePool.push(obstacle);
      this.container.addChild(obstacle);
    }

    if (this.obstaclePool.length > 0) {
      this.baseScale = this.obstaclePool[0].scale?.y || 1;
      this.baseHeight = this.gameInstance.app.screen.height;
    }

    // abilita sorting per zIndex se necessario
    this.container.sortableChildren = true;
  }

  createObstacle() {
    const obstacle = new Sprite(this.asset);
    obstacle.anchor.set(0.5, 0); // top-center
    return obstacle;
  }

  // ---------- Helpers coordinate globali <-> locali ----------
  globalToLocalPoint(xPx, yPx) {
    const pLocal = this.container.toLocal({ x: xPx, y: yPx });
    return pLocal;
  }

  globalYToLocal(yPx) {
    return this.globalToLocalPoint(0, yPx).y;
  }

  globalXToLocal(xPx) {
    return this.globalToLocalPoint(xPx, 0).x;
  }

  screenLeftLocalX() {
    return this.globalXToLocal(0);
  }

  screenRightLocalX() {
    return this.globalXToLocal(this.gameInstance.app.screen.width);
  }

  // ---------- Calcoli percentuali ----------
  calculateObstacleY() {
    const h = this.gameInstance.app.screen.height;
    const yPx = this.yPercent * h;
    return this.globalYToLocal(yPx);
  }

  calculateSpacingLocalX() {
    const w = this.gameInstance.app.screen.width;
    const spacingPx = this.xSpacingPercent * w;
    return this.globalXToLocal(spacingPx) - this.globalXToLocal(0);
  }

  // ---------- Generazione ----------
  generateInitialObstacles() {
    const rightEdgeLocal = this.screenRightLocalX();
    const spacingLocal = this.calculateSpacingLocalX();

    const numObstacles = Math.floor(Math.random() * 5) + 3;

    for (let i = 0; i < numObstacles; i++) {
      const obstacle = this.getObstacleFromPool();
      if (!obstacle) break;

      obstacle.x = rightEdgeLocal + (i * spacingLocal);

      const randomScale = this.scaleVariations[Math.floor(Math.random() * this.scaleVariations.length)];
      obstacle.originalScaleMultiplier = randomScale;

      this.setObstacleScale(obstacle, randomScale);
      obstacle.y = this.calculateObstacleY();

      obstacle.visible = true;
      this.activeObstacles.push(obstacle);
      this.lastObstacleX = obstacle.x;
    }
  }

  getObstacleFromPool() {
    return this.obstaclePool.find(o => !o.visible);
  }

  returnObstacleToPool(obstacle) {
    obstacle.visible = false;
    const idx = this.activeObstacles.indexOf(obstacle);
    if (idx > -1) this.activeObstacles.splice(idx, 1);
  }

  setObstacleScale(obstacle, scaleMultiplier) {
    const currentHeight = this.gameInstance.app.screen.height;
    const scaleRatio = currentHeight / this.baseHeight;
    const screenHeight = this.gameInstance.app.screen.height;
    const maxHeight = screenHeight * 0.5;

    let newScale = this.baseScale * scaleRatio * scaleMultiplier;

    const potentialHeight = obstacle.texture.height * newScale;
    if (potentialHeight > maxHeight) {
      newScale = maxHeight / obstacle.texture.height;
    }

    obstacle.scale.set(newScale);
  }

  generateNewObstacle() {
    const obstacle = this.getObstacleFromPool();
    if (!obstacle) return;

    const spacingLocal = this.calculateSpacingLocalX();

    obstacle.x = this.lastObstacleX + spacingLocal;

    const randomScale = this.scaleVariations[Math.floor(Math.random() * this.scaleVariations.length)];
    obstacle.originalScaleMultiplier = randomScale;

    this.setObstacleScale(obstacle, randomScale);
    obstacle.y = this.calculateObstacleY();

    obstacle.visible = true;
    this.activeObstacles.push(obstacle);
    this.lastObstacleX = obstacle.x;
  }

  animateObstacleHit(
    obstacle,
    {
      fallYPercent = 0.91,     // punto Y finale come % dell'altezza schermo
      nudgeXPercent = 0.015,   // spintarella iniziale verso destra (% larghezza schermo)
      shakeXPercent = 0.005,   // ampiezza shake orizzontale (% larghezza schermo)
      shakeDuration = 0.35,    // durata totale dello shake
      shakeRepeats = 4,        // numero di “mezze-oscillazioni” (yoyo)
      fallDuration = 0.6,      // durata della caduta
      rotateSide = "left"     // "right" => +90°, "left" => -90°
    } = {}
  ) {
    if (!obstacle || !obstacle.visible) return;

    // (opzionale) blocca la fisica/movimento dell'update su questo ostacolo
    obstacle._isAnimating = true;

    const startX = obstacle.x;

    // Calcoli in coordinate locali del container usando percentuali di schermo
    const screenW = this.gameInstance.app.screen.width;
    const screenH = this.gameInstance.app.screen.height;

    const toLocalDeltaX = (percent) =>
      this.globalXToLocal(screenW * percent) - this.globalXToLocal(0);

    const groundLocalY = this.globalYToLocal(screenH * fallYPercent);
    const nudgeLocalX = toLocalDeltaX(nudgeXPercent);
    const shakeLocalX = toLocalDeltaX(shakeXPercent);

    const targetRotation = (rotateSide === "left" ? -1 : 1) * (Math.PI / 2);

    const tl = gsap.timeline({
      defaults: { ease: "power2.out" },
      onComplete: () => {
        // (opzionale) stato finale
        obstacle._isAnimating = false; // se vuoi sbloccare di nuovo il movimento
      }
    });

    // 1) Spintarella verso destra
    tl.to(obstacle, {
      x: obstacle.x + nudgeLocalX,
      duration: 0.12
    });

    // 2) Shake orizzontale (yoyo)
    tl.to(obstacle, {
      x: `+=${shakeLocalX}`,
      duration: shakeDuration / (shakeRepeats || 1),
      yoyo: true,
      repeat: shakeRepeats,
      ease: "sine.inOut"
    });

    // 3) Caduta + rotazione (in parallelo)
    tl.to(obstacle, {
      y: groundLocalY,
      duration: fallDuration,
      ease: "power2.in"
    });

    tl.to(
      obstacle,
      {
        x: startX,
        rotation: targetRotation,
        duration: fallDuration,
        ease: "power1.in"
      },
      "<" // parte insieme alla caduta
    );

    return tl; // così puoi gestirla dall’esterno se ti serve
  }

  resize() {
    this.activeObstacles.forEach(obstacle => {
      this.setObstacleScale(obstacle, obstacle.originalScaleMultiplier);
      obstacle.y = this.calculateObstacleY();
    });
    // il layer di debug si ridisegna al prossimo update
  }

  update(dt) {
    const leftEdgeLocal = this.screenLeftLocalX();
    const rightEdgeLocal = this.screenRightLocalX();
    const spacingLocal = this.calculateSpacingLocalX();

    for (let i = this.activeObstacles.length - 1; i >= 0; i--) {
      const obstacle = this.activeObstacles[i];
      obstacle.x -= this.speed * dt;

      if (obstacle.x + (obstacle.width * 0.5) < leftEdgeLocal) {
        this.returnObstacleToPool(obstacle);
      }
    }

    const rightmostX = this.activeObstacles.reduce((r, o) => Math.max(r, o.x), -Infinity);

    if (rightmostX < rightEdgeLocal + spacingLocal) {
      if (Math.random() < 0.7) {
        this.generateNewObstacle();
      }
    }

    // Redraw debug overlay
    this.drawDebugHitboxes();
  }

  // ---------- Collision / Hitbox ----------
  getObstacleBounds(obstacle) {
    return obstacle.getBounds(); // bounds globali (world)
  }

  getHitbox(obstacle) {
    const originalBounds = this.getObstacleBounds(obstacle); // global/world

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

    return { x: hitboxX, y: hitboxY, width: hitboxWidth, height: hitboxHeight }; // global/world
  }

  // Converte un rettangolo globale in locale del container
  hitboxGlobalToLocalRect(hit) {
    const p1 = this.container.toLocal({ x: hit.x, y: hit.y });
    const p2 = this.container.toLocal({ x: hit.x + hit.width, y: hit.y + hit.height });
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

    for (const obstacle of this.activeObstacles) {
      if (!obstacle.visible) continue;

      const hbGlobal = this.getHitbox(obstacle);
      const hbLocal = this.hitboxGlobalToLocalRect(hbGlobal);

      g.rect(hbLocal.x, hbLocal.y, hbLocal.width, hbLocal.height)
        .stroke({ width: 1, color: 0xff0000, alpha: 1 })
        .fill({ color: 0xff0000, alpha: 0.15 });
    }
  }

  // Utility
  destroy() {
    this.container.removeChildren();
    this.gameInstance.app.stage.removeChild(this.container);
    this.obstaclePool = [];
    this.activeObstacles = [];
  }
}
