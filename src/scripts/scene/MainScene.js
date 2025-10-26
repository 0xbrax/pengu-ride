import {EventEmitter} from "pixi.js";
import {App} from "@/scripts/system/App.js";
import {Background} from "@/scripts/game/Background.js";
import {CoinManager} from "@/scripts/game/CoinManager.js";
import {Character} from "@/scripts/game/Character.js";
import {Enemy} from "@/scripts/game/Enemy.js";
import {testForAABB} from "@/scripts/system/utils.js";
import {ObstacleManager} from "@/scripts/game/ObstacleManager.js";
import {$configs, $globals} from "@/scripts/system/SETUP.js";

export class MainScene extends EventEmitter {
  constructor() {
    super();
    this.gameInstance = new App();
    this.isPlaying = false;
    this.scoreBalance = 0;
    this.currentLevel = 0;
    this.nextLevelThreshold = $configs.SCORE_PER_LEVEL;

    this.background = new Background();
    this.character = new Character();
    this.enemy = new Enemy();

    this.coins = new CoinManager();

    this.obstacles = new ObstacleManager();

    this.initialSpeed = {
      background: this.background.speeds,
      coins: this.coins.speed,
      obstacles: this.obstacles.speed,
    };
  }

  play() {
    this.scoreBalance = 0;
    this.currentLevel = 0;
    this.nextLevelThreshold = $configs.SCORE_PER_LEVEL;

    this.background.speeds = this.initialSpeed.background;
    this.coins.speed = this.initialSpeed.coins;
    this.obstacles.speed = this.initialSpeed.obstacles;

    this.coins.clearAllSprites();
    this.obstacles.clearSpawnInterval();
    this.enemy.fixedSpeed = false;
    if (this.enemy.dir === -1) {
      this.speed = 240;
    } else {
      this.speed = 120;
    }

    this.character.play();

    this.isPlaying = true;

    this.gameInstance.container.addEventListener("pointerdown", () => {
      $globals.sounds.get("jump-sfx").play();

      this.character.jump();
    });
  }

  levelUp() {
    $globals.sounds.get("win-sfx").play();

    this.currentLevel++;
    this.nextLevelThreshold += $configs.SCORE_PER_LEVEL;

    const speedIncrement = 0.02;
    const speedMultiplier = 1 + (this.currentLevel * speedIncrement);

    this.background.speeds = this.background.speeds.map(speed =>
      speed * speedMultiplier,
    );
    this.coins.speed *= speedMultiplier;
    this.obstacles.speed *= speedMultiplier;

    this.emit("level-up", {
      level: this.currentLevel,
      nextThreshold: this.nextLevelThreshold,
      speedMultiplier: speedMultiplier,
    });
  }

  resize(originalRect) {
    this.background.resize();
    this.character.resize();
    this.enemy.resize();
    this.coins.resize();
    this.obstacles.resize();
  }

  update(dt) {
    if (!this.isPlaying) {
      return;
    }

    this.character.update(dt);
    this.enemy.update(dt);

    if (this.character.isAlive) {
      this.background.update(dt);
      this.coins.update(dt);
      this.obstacles.update(dt);
    }

    if (this.character.isAlive) {
      this.coins.spritesPool.forEach((coin) => {
        if (testForAABB(this.character.getHitbox(), coin.getBounds())) {
          this.emit("coin-collected");

          this.scoreBalance += $configs.SCORE_PER_COIN;
          this.coins.clearSprite(coin);

          if (this.scoreBalance >= this.nextLevelThreshold && this.currentLevel < $configs.MAX_LEVEL) {
            this.levelUp();
          }
        }
      });
    }

    if (this.character.isAlive && !this.enemy.fixedSpeed) {
      if (testForAABB(this.character.getHitbox(), this.enemy.getHitbox())) {
        this.emit("game-over");

        this.character.die("enemy", this.enemy.dir);
        this.enemy.fixedSpeed = true;
        this.obstacles.isRunning = false;
        this.enemy.playAnim("attack");
      }
    }

    if (this.character.isAlive) {
      this.obstacles.spritesPool.forEach((obstacle) => {
        if (testForAABB(this.character.getHitbox(), this.obstacles.getHitbox(obstacle))) {
          this.emit("game-over");

          this.character.die("obstacle");
          this.enemy.fixedSpeed = true;
          this.obstacles.isRunning = false;
          this.obstacles.animateObstacleHit(obstacle);
        }
      });
    }
  }

  // destroy() {
  //     // TODO
  // }
}