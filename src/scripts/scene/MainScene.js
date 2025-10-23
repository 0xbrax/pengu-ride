import {EventEmitter} from "pixi.js";
import {App} from "@/scripts/system/App.js";
import { Background } from "@/scripts/game/Background.js";
import {CoinManager} from "@/scripts/game/CoinManager.js";
import {Character} from "@/scripts/game/Character.js";
import {Enemy} from "@/scripts/game/Enemy.js";
import {testForAABB} from "@/scripts/system/utils.js";
import {ObstacleManager} from "@/scripts/game/ObstacleManager.js";
import {$configs} from "@/scripts/system/SETUP.js";

export class MainScene extends EventEmitter {
    constructor() {
        super();
        this.gameInstance = new App();
        this.isPlaying = false;
        this.scoreBalance = 0; // Punteggio cumulativo per il sistema di livelli
        this.currentLevel = 0; // Livello attuale
        this.nextLevelThreshold = 2500; // Prossima soglia per aumentare il livello

        this.background = new Background();
        this.character = new Character();
        this.enemy = new Enemy();

        const seed = (crypto?.getRandomValues)
          ? crypto.getRandomValues(new Uint32Array(1))[0] >>> 0
          : (Date.now() >>> 0);

        console.log("SEED: ", seed, "\n \n ----------")

        this.coins = new CoinManager(this.gameInstance.app, {
            seed: seed,
            patternWeights: {
                line: 3,
                diagonalUp: 2,
                diagonalDown: 2,
                peak: 1,
                V: 1,
                block: 1,
                random: 2,
            },
        });

        this.obstacles = new ObstacleManager();

        this.initialSpeed = {
            background: this.background.speeds,
            coins: this.coins.speed,
            obstacles: this.obstacles.speed,
        }
    }

    play() {
        this.scoreBalance = 0; // Reset del punteggio cumulativo
        this.currentLevel = 0; // Reset del livello
        this.nextLevelThreshold = 2500; // Reset della soglia

        this.background.speeds = this.initialSpeed.background;
        this.coins.speed = this.initialSpeed.coins;
        this.obstacles.speed = this.initialSpeed.obstacles;

        this.isPlaying = true;

        this.coins.clear();
        this.coins.init();

        this.obstacles.resetLevel();

        // this.obstacles.destroy();
        // this.obstacles.initializePool();
        // this.obstacles.generateInitialObstacles();

        this.character.play();

        this.enemy.fixedSpeed = false;
        if (this.enemy.dir === -1) {
            this.speed = 240;
        } else {
            this.speed = 120;
        }

        this.gameInstance.container.addEventListener('pointerdown', () => {
            this.character.jump();
        });
    }

    checkLevelProgression() {
        if (this.scoreBalance >= this.nextLevelThreshold && this.currentLevel < 10) {
            this.levelUp();
        }
    }

    levelUp() {
        this.currentLevel++;
        this.nextLevelThreshold += 2500; // Prossima soglia è sempre +2500 punti

        // Fattore di moltiplicazione per la velocità (aumenta del 20% per ogni livello)
        const speedMultiplier = 1 + (this.currentLevel * 0.1); // 0.2

        // Aumenta la velocità del background (tutti i 7 layers del parallax)
        this.background.speeds = this.background.speeds.map(speed =>
          speed * speedMultiplier
        );

        // Aumenta la velocità delle coins
        this.coins.speed *= speedMultiplier;

        // Aumenta la velocità degli obstacles
        this.obstacles.speed *= speedMultiplier;

        console.log(`Level Up! Livello ${this.currentLevel} raggiunto. Prossima soglia: ${this.nextLevelThreshold}`);

        // Emetti un evento per notificare il level up
        this.emit("level-up", {
            level: this.currentLevel,
            nextThreshold: this.nextLevelThreshold,
            speedMultiplier: speedMultiplier
        });
    }

    getLevelInfo() {
        return {
            currentLevel: this.currentLevel,
            scoreBalance: this.scoreBalance,
            nextLevelThreshold: this.nextLevelThreshold,
            pointsToNextLevel: this.nextLevelThreshold - this.scoreBalance
        };
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
            this.coins._alive.forEach((coin) => {
                if (testForAABB(this.character.getHitbox(), coin.getBounds())) {
                    this.emit("coin-collected");

                    this.scoreBalance += $configs.SCORE_PER_COIN;
                    this.coins._despawn(coin);
                    this.checkLevelProgression();
                }
            });
        }

        if (this.character.isAlive && !this.enemy.fixedSpeed) {
            if (testForAABB(this.character.getHitbox(), this.enemy.getHitbox())) {
                this.emit("game-over");

                this.character.die("enemy", this.enemy.dir);
                this.enemy.fixedSpeed = true;
                this.enemy.playAnim("attack");
            }
        }

        if (this.character.isAlive) {
            this.obstacles.activeObstacles.forEach((obstacle) => {
                if (testForAABB(this.character.getHitbox(), this.obstacles.getHitbox(obstacle))) {
                    this.emit("game-over");

                    this.character.die("obstacle");
                    this.enemy.fixedSpeed = true;
                    this.obstacles.animateObstacleHit(obstacle);
                }
            });
        }
    }

    // destroy() {
    //     // TODO
    // }
}