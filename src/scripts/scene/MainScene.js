import * as PIXI from "pixi.js";
import { Background } from "@/scripts/game/Background.js";

import {testForAABB} from "@/scripts/system/utils.js";
import {App} from "@/scripts/system/App.js";
import {CoinManager} from "@/scripts/game/CoinManager.js";
import {Character, CHARACTER_ANIMATIONS} from "@/scripts/game/Character.js";
import {Container} from "pixi.js";
import {Enemy} from "@/scripts/game/Enemy.js";

export class MainScene {
    constructor() {
        this.gameInstance = new App();

        // this.gameInstance.app.stage.eventMode = 'static';
        // this.gameInstance.app.stage.hitArea = this.gameInstance.app.screen;

        this.container = new Container();
        // TODO add everything here (?) not used now
        this.gameInstance.app.stage.addChild(this.container);

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
        void this.coins.init();

        this.play();
    }

    play() {
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

    destroy() {
        // this.gameInstance.app.stage.removeChild(this.container);
        // this.container.destroy();
    }

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
                    this.coins._despawn(coin);
                }
            })
        }

        if (this.character.spine && this.enemy.sprite && this.character.isAlive) {
            if (testForAABB(this.character.getHitbox(), this.enemy.getHitbox())) {
                this.enemy.playAnim("attack");
                this.character.spine.state.addAnimation(0, CHARACTER_ANIMATIONS.DEAD, false, 0.2);

                this.character.isAlive = false;
            }
        }
    }
}