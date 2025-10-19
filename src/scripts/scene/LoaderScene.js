import { App } from "@/scripts/system/App.js";
import {Assets, TilingSprite, Filter, GlProgram, BlurFilter} from "pixi.js";
import frostVertexShader from "@/shaders/frost/vertex.glsl";
import frostFragmentShader from "@/shaders/frost/fragment.glsl";

const vertex = `
    in vec2 aPosition;

    void main(void) {
        gl_Position = vec4(aPosition * 2.0 - 1.0, 0.0, 1.0);
    }
`;

const fragment = `
    void main(void) {
        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    }
`;

export class LoaderScene {
    constructor() {
        this.gameInstance = new App();
        void this.createLoader();
    }

    async createLoader() {
        const texture = await Assets.load("/4_game_background.png");
        texture.source.addressMode = "repeat";

        this.sprite = new TilingSprite({
            texture: texture,
        });
        this.sprite.anchor.x = 0.5;
        this.originalHeight = texture.height;

        this.updateSpriteSize();
        this.gameInstance.app.stage.addChild(this.sprite);



// Create with custom settings
//         const blurFilter = new BlurFilter({
//             strength: 8,      // Overall blur strength
//             quality: 4,       // Blur quality (higher = better but slower)
//             kernelSize: 5   ,  // Size of blur kernel matrix
//             repeatEdgePixels: true, // Enable edge pixel clamping
//         });

        this.frostFilter = new Filter({
            glProgram: new GlProgram({ vertex: frostVertexShader, fragment: frostFragmentShader }),
            resources: {
                frostUniforms: {
                    uResolution: { value: [
                            this.gameInstance.app.screen.width,
                            this.gameInstance.app.screen.height
                        ], type: "vec2<f32>" },
                    uProgress: { value: 0.0, type: "f32" }, // 0.0 ... 1.0
                },
            },
        });

        this.sprite.filters = [this.frostFilter];

        const totalElements = 18;
        const delay = 300;

        for (let i = 0; i < totalElements; i++) {
            setTimeout(() => {
                const progress = (i + 1) / totalElements; // 0.055, 0.111, 0.166... fino a 1.0
                this.frostFilter.resources.frostUniforms.uniforms.uProgress = progress;
                console.log(`Elemento ${i + 1}/${totalElements} - Progress: ${progress.toFixed(3)}`);
            }, i * delay);
        }
    }

    updateSpriteSize() {
        if (!this.sprite) {
            return;
        }

        this.sprite.x = this.gameInstance.app.screen.width / 2;

        const scaleY = this.gameInstance.app.screen.height / this.originalHeight;
        this.sprite.tileScale.set(scaleY);
        this.sprite.tileScale.y *= -1;

        this.sprite.height = this.gameInstance.app.screen.height;
        this.sprite.width = this.gameInstance.app.screen.width;

        // aggiorna la risoluzione del filtro se presente
        if (this.frostFilter) {
            this.frostFilter.resources.frostUniforms.uniforms.uResolution = [this.gameInstance.app.screen.width, this.gameInstance.app.screen.height];
        }
    }

    resize() {
        this.updateSpriteSize();
    }
}
