import {EventEmitter} from "pixi.js";
import {App} from "@/scripts/system/App.js";
import { Background } from "@/scripts/game/Background.js";
import {CoinManager} from "@/scripts/game/CoinManager.js";
import {Character} from "@/scripts/game/Character.js";
import {Enemy} from "@/scripts/game/Enemy.js";
import {testForAABB} from "@/scripts/system/utils.js";

export class MainScene extends EventEmitter {
    constructor() {
        super();
        this.gameInstance = new App();


        this.background = new Background();
        this.character = new Character();
        this.enemy = new Enemy();


        const seed = (crypto?.getRandomValues)
          ? crypto.getRandomValues(new Uint32Array(1))[0] >>> 0
          : (Date.now() >>> 0);

        console.log("SEED: ", seed, "\n")

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
        this.coins.init();

        this.play();
    }

    play() {
        this.character.jump();

        this.gameInstance.container.addEventListener('pointerdown', (event) => {
            this.character.jump();
        });
    }

    resize(originalRect) {
        this.background.resize();
        this.character.resize();
        this.enemy.resize();
        this.coins.resize();
    }

    // destroy() {
    //     // TODO
    // }

    update(dt) {
        this.character.update(dt);
        this.enemy.update(dt);

        if (this.character.spine && this.character.isAlive) {
            this.background.update(dt);
            this.coins.update(dt);
        }

        if (this.character.spine && this.coins._alive) {
            this.coins._alive.forEach((coin) => {
                if (testForAABB(this.character.getHitbox(), coin.getBounds())) {
                    this.emit("coin-collected");
                    this.coins._despawn(coin);
                }
            })
        }

        if (this.character.spine && this.enemy.sprite && this.character.isAlive) {
            if (testForAABB(this.character.getHitbox(), this.enemy.getHitbox())) {
                this.enemy.playAnim("attack");
                this.enemy.fixedSpeed = true;

                this.character.die(this.enemy.dir);
            }
        }
    }
}