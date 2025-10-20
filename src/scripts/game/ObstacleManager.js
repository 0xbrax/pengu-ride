import { App } from "@/scripts/system/App.js";
import {Assets, Container, Graphics, Sprite} from "pixi.js";
import { ASSETS_MAP } from "@/scripts/system/ASSETS.js";
import { COIN_SPEED } from "@/scripts/game/Background.js";

export class ObstacleManager {
  constructor() {
    this.gameInstance = new App();
    this.container = new Container();
    this.container.zIndex = 50;
    this.gameInstance.app.stage.addChild(this.container);

    this.asset = Assets.get(ASSETS_MAP.texture[1].alias);

    // Pool
    this.maxObstacles = 6;
    this.obstaclePool = [];
    this.activeObstacles = [];

    // Percentuali schermo
    this.yPercent = -0.13; // 5% dall'alto
    this.xSpacingPercent = 0.05; // 5% della larghezza schermo tra ostacoli

    // Stato generazione
    this.lastObstacleX = 0;

    // Scala sprite
    this.baseScale = 1;
    this.baseHeight = null;
    this.scaleVariations = [0.4, 0.7, 0.9, 1.0];

    // Velocità
    this.speed = COIN_SPEED;

    // Collision
    this.hitboxConfig = {
      width: 0.16,
      height: 0.72,
      offsetX: 0.0,
      offsetY: -0.02,
    };

    this.initializePool();
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

      // Posiziona appena oltre il bordo destro, poi aggiungi spaziatura locale
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

    // Spaziatura in coordinate locali (coerente con trasformazioni)
    obstacle.x = this.lastObstacleX + spacingLocal;

    const randomScale = this.scaleVariations[Math.floor(Math.random() * this.scaleVariations.length)];
    obstacle.originalScaleMultiplier = randomScale;

    this.setObstacleScale(obstacle, randomScale);
    obstacle.y = this.calculateObstacleY();

    obstacle.visible = true;
    this.activeObstacles.push(obstacle);
    this.lastObstacleX = obstacle.x;
  }

  resize() {
    // Ricalcola scala e posizioni coerenti con percentuali
    this.activeObstacles.forEach(obstacle => {
      this.setObstacleScale(obstacle, obstacle.originalScaleMultiplier);
      obstacle.y = this.calculateObstacleY();
    });
    // baseHeight resta quella iniziale (coerenza scaling sprite)
  }

  update(dt) {
    const leftEdgeLocal = this.screenLeftLocalX();
    const rightEdgeLocal = this.screenRightLocalX();
    const spacingLocal = this.calculateSpacingLocalX();

    // Muovi e rimuovi se completamente fuori a sinistra
    for (let i = this.activeObstacles.length - 1; i >= 0; i--) {
      const obstacle = this.activeObstacles[i];
      obstacle.x -= this.speed * dt;

      // anchor.x = 0.5 => bordo sinistro = x - width/2 ; completamente fuori quando (x + width/2) < left
      if (obstacle.x + (obstacle.width * 0.5) < leftEdgeLocal) {
        this.returnObstacleToPool(obstacle);
      }
    }

    // Trova il più a destra (coord. locali)
    const rightmostX = this.activeObstacles.reduce((r, o) => Math.max(r, o.x), -Infinity);

    // Genera quando il più a destra è rientrato abbastanza nello schermo
    if (rightmostX < rightEdgeLocal + spacingLocal) {
      if (Math.random() < 0.7) {
        this.generateNewObstacle();
      }
    }
  }

  // Utility
  getActiveObstacles() {
    return this.activeObstacles;
  }

  getObstacleBounds(obstacle) {
    return obstacle.getBounds();
  }

  getHitbox(object) {
    const originalBounds = object.getBounds();

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

  destroy() {
    this.container.removeChildren();
    this.gameInstance.app.stage.removeChild(this.container);
    this.obstaclePool = [];
    this.activeObstacles = [];
  }
}
