import {Application, EventEmitter} from "pixi.js";

// import { gsap } from "gsap";
// import { PixiPlugin } from "gsap/PixiPlugin";
import { Loader } from "@/scripts/system/Loader.js";
import { SceneManager } from "@/scripts/scene/SceneManager.js";
import { LoadingScene } from "@/scripts/scene/LoadingScene.js";
import { MainScene } from "@/scripts/scene/MainScene.js";

// gsap.registerPlugin(PixiPlugin);
// PixiPlugin.registerPIXI(PIXI);

let instance = null; // one instance only

export class App extends EventEmitter {
    constructor(container) {
        super();

        if (instance) {
            return instance;
        }
        instance = this;

        this.container = container;
        this.app = null;
        this.sceneManager = null;

        void this.run();
    }

    async run() {
        this.originalRect = {
            h: window.innerHeight,
            w: window.innerWidth,
            pixelRatio: Math.min(window.devicePixelRatio, 2)
        };

        this.app = new Application();

        await this.app.init({
            height: this.originalRect.h,
            width: this.originalRect.w,
            resizeTo: window,
            resolution: this.originalRect.pixelRatio,
            autoDensity: true,
            sortableChildren: true,
        });

        this.app.stage.eventMode = "static";

        this.container.appendChild(this.app.canvas);

        this.sceneManager = new SceneManager();

        this.app.ticker.add(ticker => {
            const dt = ticker.deltaMS / 1_000;
            this.sceneManager.update(dt);
        });

        void this.start();
    }

    async start() {
        const loadingScene = new LoadingScene();
        this.sceneManager.start(loadingScene);

        await loadingScene.createLoading();

        this.loader = new Loader();
        this.loader.on("progress", (progress) => {
            console.log("PROGRESS: ", progress);

            this.emit("progress", progress);
            loadingScene.setProgress(progress);

            // loading complete
            if (progress === 1) {
                requestAnimationFrame(() => {
                    console.log("READY");

                    this.emit("ready");
                    this.sceneManager.destroy();

                    this.sceneManager.start(new MainScene());
                    this.sceneManager.scene.on("coin-collected", () => {
                        this.emit("coin-collected");
                    });
                    this.sceneManager.scene.on("game-over", () => {
                        this.emit("game-over");
                    });
                });
            }
        })

        this.resize(this.originalRect);
        window.addEventListener('resize', () => {
            this.resize(this.originalRect);
        });
    }

    resize(originalRect) {
        this.app.renderer.resize(window.innerWidth, window.innerHeight);
        this.sceneManager.resize(originalRect);
    }
}
