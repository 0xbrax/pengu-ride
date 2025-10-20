import {EventEmitter} from "pixi.js";
import {App} from "@/scripts/system/App.js";
import { Background } from "@/scripts/game/Background.js";
import {CoinManager} from "@/scripts/game/CoinManager.js";
import {Character} from "@/scripts/game/Character.js";
import {Enemy} from "@/scripts/game/Enemy.js";
import {testForAABB} from "@/scripts/system/utils.js";
import {ObstacleManager} from "@/scripts/game/ObstacleManager.js";

export class MainScene extends EventEmitter {
    constructor() {
        super();
        this.gameInstance = new App();
        this.isPlaying = false;

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
    }

    play() {
        this.isPlaying = true;

        this.coins.clear();
        this.coins.init();

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

        this.coins._alive.forEach((coin) => {
            if (testForAABB(this.character.getHitbox(), coin.getBounds())) {
                this.emit("coin-collected");
                this.coins._despawn(coin);
            }
        });

        // if (this.character.isAlive && !this.enemy.fixedSpeed) {
        //     if (testForAABB(this.character.getHitbox(), this.enemy.getHitbox())) {
        //         this.emit("game-over");
        //
        //         this.character.die(this.enemy.dir);
        //
        //         this.enemy.fixedSpeed = true;
        //         this.enemy.playAnim("attack");
        //     }
        // }

        this.obstacles.activeObstacles.forEach((obstacle) => {
            if (testForAABB(this.character.getHitbox(), this.obstacles.getHitbox(obstacle))) {
                console.log("HIT");
            }
        });
    }

    // destroy() {
    //     // TODO
    // }
}