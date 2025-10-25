import {Container, Sprite, Assets, Texture} from "pixi.js";
import {COIN_SPEED} from "@/scripts/game/Background.js";
import {ASSETS_MAP} from "@/scripts/system/ASSETS.js";
import {App} from "@/scripts/system/App.js";
import {getRandomInt} from "@/scripts/system/utils.js";

export class CoinManager {
  constructor() {
    this.gameInstance = new App();
    this.ASSETS_MAP = ASSETS_MAP;

    this.container = new Container();
    this.container.zIndex = 10;
    this.gameInstance.app.stage.addChild(this.container);

    this.speed = COIN_SPEED;

    this.spritesPool = [];
    this.texture = new Texture(Assets.get(this.ASSETS_MAP.texture[0].alias)); // coin

    this.configs = {
      spriteScale: 0.8, // Not implemented yet
      totalRows: 20,
      deadRowsTop: 4,
      deadRowsBottom: 2,
      minCols: 3,
      maxCols: 15,
      minGap: 2,
      maxGap: 10,
    };

    // Weight sum must be 100
    this.patternsByWeight = {
      "line": 15,
      "diagonalUp": 5,
      "diagonalDown": 5,
      "peak": 25,
      "V": 25,
      "block": 20,
      "random": 5,
    };

    const slotSize = this.gameInstance.app.screen.height / this.configs.totalRows;
    this.gridSizes = {
      height: slotSize,
      width: slotSize, // Not used because it is a square
    };

    this.triggerDistance = 1;
    const screenWidthInSlots = Math.ceil(this.gameInstance.app.screen.width / slotSize);
    this.lastGridSlotXAvailable = screenWidthInSlots + this.triggerDistance;

    setInterval(() => {
      console.log("COINS POOL LENGTH: ", this.spritesPool.length);

    }, 10_000);
  }

  createSprites() {
    const pattern = this.getWeightedRandomPattern();

    switch (pattern) {
      case "line":
        this.genLineBurst();
        break;
      case "diagonalUp":
        this.genDiagonalUpBurst();
        break;
      case "diagonalDown":
        this.genDiagonalDownBurst();
        break;
      case "peak":
        this.genPeakBurst();
        break;
      case "V":
        this.genVBurst();
        break;
      case "block":
        this.genBlockBurst();
        break;
      case "random":
      default:
        this.genRandomBurst();
        break;
    }
  }

  // Could be improved with a seed number to generate the same pattern
  getWeightedRandomPattern(rngFunction = Math.random) {
    const totalWeight = Object.values(this.patternsByWeight).reduce((sum, patternWeight) => sum + patternWeight, 0);
    const keys = Object.keys(this.patternsByWeight);

    if (totalWeight !== 100 || totalWeight <= 0) {
      console.warn("Pattern weights do not sum to 100, this may cause unexpected behavior.");
      const randomIndex = Math.floor(rngFunction() * keys.length);
      return keys[randomIndex];
    }

    const randomValue = rngFunction() * totalWeight;
    let currentWeight = 0;

    for (const key of keys) {
      const patternWeight = this.patternsByWeight[key];
      currentWeight += patternWeight;
      if (randomValue <= currentWeight) {
        return key;
      }
    }

    // Fallback
    console.warn("No pattern found with the specified weight, returning a random pattern.");
    const randomIndex = Math.floor(rngFunction() * keys.length);
    return keys[randomIndex];
  }
  
  updateRandomGap(colNumber) {
    const randomGap = getRandomInt(this.configs.minGap, this.configs.maxGap);

    this.lastGridSlotXAvailable += colNumber + 1 + randomGap;
  }

  /**
   * MISC
   */
  resize() {
    if (!this.texture) {
      return;
    }

    const oldSlotSize = this.gridSizes.height;
    const newSlotSize = this.gameInstance.app.screen.height / this.configs.totalRows;

    this.gridSizes.height = newSlotSize;
    this.gridSizes.width = newSlotSize;

    // Resize and snap to grid
    this.spritesPool.forEach((sprite, i) => {
      sprite.height = newSlotSize;
      sprite.width = newSlotSize;

      const currentGridX = Math.round((sprite.position.x - sprite.width / 2) / oldSlotSize);
      const currentGridY = Math.round((sprite.position.y - sprite.height / 2) / oldSlotSize);

      sprite.position.x = sprite.width / 2 + (currentGridX * newSlotSize);
      sprite.position.y = sprite.height / 2 + (currentGridY * newSlotSize);
    })
  }

  update(dt) {
    if (!this.texture) {
      return;
    }

    // Animate
    this.container.position.x -= this.speed * dt;

    // Initiate
    if (this.spritesPool.length === 0) {
      this.createSprites();
    }

    // Generate
    const slotSize = this.gridSizes.height;

    const containerXInSlots = Math.abs(Math.floor(this.container.position.x / slotSize));
    const screenWidthInSlots = Math.ceil(this.gameInstance.app.screen.width / slotSize);
    const nextGenerationPosition = this.lastGridSlotXAvailable - screenWidthInSlots - this.triggerDistance;

    if (containerXInSlots >= nextGenerationPosition) {
      this.createSprites();
    }

    // Clear
    const leftBoundary = slotSize * -this.triggerDistance;

    for (const sprite of this.spritesPool) {
      const spriteWorldX = sprite.position.x + this.container.position.x;
      if (spriteWorldX < leftBoundary) {
        this.clearSprite(sprite);
      }
    }
  }

  clearSprite(sprite) {
    const index = this.spritesPool.indexOf(sprite);
    if (index === -1) {
      console.error("Sprite not found in aliveSprites array, cannot clear.");
      return;
    }

    this.spritesPool.splice(index, 1);
    this.container.removeChild(sprite);
    sprite.destroy();
  }

  clearAllSprites() {
    this.spritesPool.forEach((sprite) => {
      this.clearSprite(sprite);
    });

    const slotSize = this.gameInstance.app.screen.height / this.configs.totalRows;

    const screenWidthInSlots = Math.ceil(this.gameInstance.app.screen.width / slotSize);
    this.lastGridSlotXAvailable = screenWidthInSlots + this.triggerDistance;
  }

  destroy() {
    this.clearAllSprites();

    this.texture.destroy();
    this.texture = null;

    this.gameInstance.app.stage.removeChild(this.container);
    this.container.destroy();
    this.container = null;
  }

  // TODO check min and max row
  /**
   * GENERATION PATTERNS
   */
  genLineBurst() {
    const maxLength = getRandomInt(this.configs.minCols, this.configs.maxCols);
    const minRow = this.configs.deadRowsTop;
    const maxRow = this.configs.totalRows - this.configs.deadRowsBottom - 1;
    const randomRow = getRandomInt(minRow, maxRow);

    const slotSize = this.gridSizes.height;

    for (let i = 0; i < maxLength; i++) {
      const sprite = new Sprite(this.texture);
      sprite.anchor.set(0.5);

      sprite.height = slotSize;
      sprite.width = slotSize;

      sprite.position.x = sprite.width / 2 + ((i + this.lastGridSlotXAvailable) * slotSize);
      sprite.position.y = sprite.height / 2 + (randomRow * slotSize);

      this.spritesPool.push(sprite);
      this.container.addChild(sprite);

      if (i === maxLength - 1) {
        this.updateRandomGap(i);
      }
    }
  }

  genDiagonalUpBurst() {
    const maxLength = getRandomInt(this.configs.minCols, this.configs.maxCols);
    const minRow = this.configs.deadRowsTop;
    const maxRow = this.configs.totalRows - this.configs.deadRowsBottom - 1;
    let randomStartRow = getRandomInt(minRow, maxRow);
    let currentRow = randomStartRow;

    const slotSize = this.gridSizes.height;

    for (let i = 0; i < maxLength; i++) {
      const sprite = new Sprite(this.texture);
      sprite.anchor.set(0.5);

      sprite.height = slotSize;
      sprite.width = slotSize;

      sprite.position.x = sprite.width / 2 + ((i + this.lastGridSlotXAvailable) * slotSize);
      sprite.position.y = sprite.height / 2 + (currentRow * slotSize);

      currentRow--;

      if (currentRow < minRow) {
        currentRow = getRandomInt(minRow, maxRow);
      }

      this.spritesPool.push(sprite);
      this.container.addChild(sprite);

      if (i === maxLength - 1) {
        this.updateRandomGap(i);
      }
    }
  }

  genDiagonalDownBurst() {
    const maxLength = getRandomInt(this.configs.minCols, this.configs.maxCols);
    const minRow = this.configs.deadRowsTop;
    const maxRow = this.configs.totalRows - this.configs.deadRowsBottom - 1;
    let randomStartRow = getRandomInt(minRow, maxRow);
    let currentRow = randomStartRow;

    const slotSize = this.gridSizes.height;

    for (let i = 0; i < maxLength; i++) {
      const sprite = new Sprite(this.texture);
      sprite.anchor.set(0.5);

      sprite.height = slotSize;
      sprite.width = slotSize;

      sprite.position.x = sprite.width / 2 + ((i + this.lastGridSlotXAvailable) * slotSize);
      sprite.position.y = sprite.height / 2 + (currentRow * slotSize);

      currentRow++;

      if (currentRow >= maxRow) {
        currentRow = getRandomInt(minRow, maxRow);
      }

      this.spritesPool.push(sprite);
      this.container.addChild(sprite);

      if (i === maxLength - 1) {
        this.updateRandomGap(i);
      }
    }
  }

  genPeakBurst() {
    const maxLength = getRandomInt(this.configs.minCols, this.configs.maxCols);
    const minRow = this.configs.deadRowsTop;
    const maxRow = this.configs.totalRows - this.configs.deadRowsBottom - 1;
    let randomStartRow = getRandomInt(minRow, maxRow);
    let currentRow = randomStartRow;

    const halfLength = Math.floor(maxLength / 2);
    let direction = -1; // -1 = up, +1 = down

    const slotSize = this.gridSizes.height;

    for (let i = 0; i < maxLength; i++) {
      const sprite = new Sprite(this.texture);
      sprite.anchor.set(0.5);
      sprite.height = slotSize;
      sprite.width = slotSize;

      if (i === halfLength) {
        direction = 1;
      }

      currentRow += direction;

      if (currentRow < minRow) {
        currentRow = minRow + 1;
        direction = 1;
      } else if (currentRow > maxRow) {
        currentRow = maxRow + 1;
        direction = -1;
      }

      sprite.position.x = sprite.width / 2 + ((i + this.lastGridSlotXAvailable) * slotSize);
      sprite.position.y = sprite.height / 2 + (currentRow * slotSize);

      this.spritesPool.push(sprite);
      this.container.addChild(sprite);

      if (i === maxLength - 1) {
        this.updateRandomGap(i);
      }
    }
  }

  genVBurst() {
    const maxLength = getRandomInt(this.configs.minCols, this.configs.maxCols);
    const minRow = this.configs.deadRowsTop;
    const maxRow = this.configs.totalRows - this.configs.deadRowsBottom - 1;
    let randomStartRow = getRandomInt(minRow, maxRow);
    let currentRow = randomStartRow;

    const halfLength = Math.floor(maxLength / 2);
    let direction = 1; // 1 = up, -1 = down

    const slotSize = this.gridSizes.height;

    for (let i = 0; i < maxLength; i++) {
      const sprite = new Sprite(this.texture);
      sprite.anchor.set(0.5);
      sprite.height = slotSize;
      sprite.width = slotSize;

      if (i === halfLength) {
        direction = -1;
      }

      currentRow += direction;

      if (currentRow < minRow) {
        currentRow = minRow + 1;
        direction = 1;
      } else if (currentRow > maxRow) {
        currentRow = maxRow + 1;
        direction = -1;
      }

      sprite.position.x = sprite.width / 2 + ((i + this.lastGridSlotXAvailable) * slotSize);
      sprite.position.y = sprite.height / 2 + (currentRow * slotSize);

      this.spritesPool.push(sprite);
      this.container.addChild(sprite);

      if (i === maxLength - 1) {
        this.updateRandomGap(i);
      }
    }
  }

  genBlockBurst() {
    const maxLength = getRandomInt(this.configs.minCols, this.configs.maxCols);
    const minRow = this.configs.deadRowsTop;
    const maxRow = this.configs.totalRows - this.configs.deadRowsBottom - 1;
    const randomRow = getRandomInt(minRow, maxRow);
    const rowsCount = getRandomInt(this.configs.deadRowsBottom, Math.floor((maxRow - randomRow) / 2));

    const slotSize = this.gridSizes.height;

    for (let i = 0; i < maxLength; i++) {
      for (let j = 0; j < rowsCount; j++) {
        const sprite = new Sprite(this.texture);
        sprite.anchor.set(0.5);

        sprite.height = slotSize;
        sprite.width = slotSize;

        sprite.position.x = sprite.width / 2 + ((i + this.lastGridSlotXAvailable) * slotSize);
        sprite.position.y = sprite.height / 2 + ((randomRow + j) * slotSize);

        this.spritesPool.push(sprite);
        this.container.addChild(sprite);
      }

      if (i === maxLength - 1) {
        this.updateRandomGap(i);
      }
    }
  }

  genRandomBurst() {
    const maxLength = getRandomInt(this.configs.minCols, this.configs.maxCols);
    const minRow = this.configs.deadRowsTop;
    const maxRow = this.configs.totalRows - this.configs.deadRowsBottom - 1;

    const slotSize = this.gridSizes.height;

    for (let i = 0; i < maxLength; i++) {
      const randomRow = getRandomInt(minRow, maxRow);

      const sprite = new Sprite(this.texture);
      sprite.anchor.set(0.5);

      sprite.height = slotSize;
      sprite.width = slotSize;

      sprite.position.x = sprite.width / 2 + ((i + this.lastGridSlotXAvailable) * slotSize);
      sprite.position.y = sprite.height / 2 + (randomRow * slotSize);

      this.spritesPool.push(sprite);
      this.container.addChild(sprite);

      if (i === maxLength - 1) {
        this.updateRandomGap(i);
      }
    }
  }
}
