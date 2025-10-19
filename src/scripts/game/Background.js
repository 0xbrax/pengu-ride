import {Assets, Container, TilingSprite} from "pixi.js";
import { App } from "@/scripts/system/App";
import {ASSETS_MAP} from "@/scripts/system/ASSETS.js";

const BASE_SPEED = 30;
const STEP_SPEED = 24;

export const COIN_SPEED = BASE_SPEED + STEP_SPEED * (ASSETS_MAP.background.length - 1);

export class Background {
    constructor() {
        this.gameInstance = new App();
        this.ASSETS_MAP = ASSETS_MAP;

        this.container = new Container({
            sortableChildren: true,
        });
        this.container.zIndex = 0;
        this.createLayers();
    }

    createLayers() {
        this.textures = this.ASSETS_MAP.background.map(tex => Assets.get(tex.alias));

        this.layers = this.textures.map((tex, i) => {
            const ts = new TilingSprite({
                texture: this.textures[i],
                width: this.gameInstance.app.screen.width,
                height: this.gameInstance.app.screen.height,
            });

            const scale = this.gameInstance.app.screen.height / tex.height;
            ts.tileScale.set(scale, scale);
            ts.width = this.gameInstance.app.screen.width;
            ts.height = this.gameInstance.app.screen.height;

            ts.zIndex = i;
            this.container.addChild(ts);
            this.gameInstance.app.stage.addChild(this.container);
            return ts;
        });

        this.speeds = this.layers.map((_, i) => BASE_SPEED + STEP_SPEED * i);

        this.resize();
    }

    resize() {
        if (!this.layers) {
            return;
        }

        this.layers.forEach((ts, i) => {
            const tex = this.textures[i];
            const scale = this.gameInstance.app.screen.height / tex.height;
            ts.tileScale.set(scale, scale);
            ts.width = this.gameInstance.app.screen.width;
            ts.height = this.gameInstance.app.screen.height;
        });
    }

    update(dt) {
        if (!this.layers) {
            return;
        }

        for (let i = 0; i < this.layers.length; i++) {
            this.layers[i].tilePosition.x -= this.speeds[i] * dt;
        }
    }
}