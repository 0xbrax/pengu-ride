import {Container} from "pixi.js";

export class SceneManager {
    constructor() {
        this.scene = null;
    }

    start(scene) {
        this.scene = scene
    }

    resize(originalRect) {
        if (this.scene && this.scene.resize) {
            this.scene.resize(originalRect);
        }
    }

    destroy() {
        if (this.scene && this.scene.destroy) {
            this.scene.destroy();
            this.scene = null;
        }
    }

    update(dt) {
        if (this.scene && this.scene.update) {
            this.scene.update(dt);
        }
    }
}