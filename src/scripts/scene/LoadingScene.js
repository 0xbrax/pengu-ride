import { App } from "@/scripts/system/App.js";
import {Assets, TilingSprite, Filter, GlProgram, BlurFilter} from "pixi.js";
import frostVertexShader from "@/shaders/frost/vertex.glsl";
import frostFragmentShader from "@/shaders/frost/fragment.glsl";

export class LoadingScene {
    constructor() {
        this.gameInstance = new App();
        void this.createLoading();
    }

    async createLoading() {
        const texture = await Assets.load("/game-background.png");
        texture.source.addressMode = "repeat";

        this.sprite = new TilingSprite({
            texture: texture,
        });
        this.sprite.anchor.x = 0.5;
        this.originalHeight = texture.height;

        this.updateSpriteSize();
        this.gameInstance.app.stage.addChild(this.sprite);

        this.blurFilter = new BlurFilter({
            strength: 3, // Overall blur strength
            quality: 2, // Blur quality (higher = better but slower)
            kernelSize: 5, // Size of blur kernel matrix: 3, 5, 7, 9, 15 ... (higher = better but slower)
            repeatEdgePixels: true, // Enable edge pixel clamping
        });

        this.frostFilter = new Filter({
            glProgram: new GlProgram({ vertex: frostVertexShader, fragment: frostFragmentShader }),
            resources: {
                frostUniforms: {
                    uResolution: { value: [
                            this.gameInstance.app.screen.width,
                            this.gameInstance.app.screen.height
                        ], type: "vec2<f32>" },
                    uProgress: { value: 1.0, type: "f32" }, // 0.0 ... 1.0
                },
            },
        });

        this.sprite.filters = [this.frostFilter, this.blurFilter];
    }

    setProgress(progress) {
        const reversedProgress = 1.0 - progress;

        this.frostFilter.resources.frostUniforms.uniforms.uProgress = reversedProgress;
    }

    updateSpriteSize() {
        if (!this.sprite) {
            return;
        }

        this.sprite.x = this.gameInstance.app.screen.width / 2;

        const scaleY = this.gameInstance.app.screen.height / this.originalHeight;
        this.sprite.tileScale.set(scaleY);
        // this.sprite.tileScale.y *= -1;

        this.sprite.height = this.gameInstance.app.screen.height;
        this.sprite.width = this.gameInstance.app.screen.width;

        if (this.frostFilter) {
            this.frostFilter.resources.frostUniforms.uniforms.uResolution = [this.gameInstance.app.screen.width, this.gameInstance.app.screen.height];
        }
    }

    resize() {
        this.updateSpriteSize();
    }

    destroy() {
        if (this.sprite && this.sprite.parent) {
            this.sprite.parent.removeChild(this.sprite);
        }

        if (this.blurFilter) {
            this.blurFilter.destroy();
            this.blurFilter = null;
        }

        if (this.frostFilter) {
            this.frostFilter.destroy();
            this.frostFilter = null;
        }

        if (this.sprite) {
            this.sprite.destroy();
            this.sprite = null;
        }

        this.originalHeight = null;
        this.gameInstance = null;
    }

}
