import * as PIXI from "pixi.js"
import { Application } from "pixi.js";

// import { gsap } from "gsap";
// import { PixiPlugin } from "gsap/PixiPlugin";
import { $globals } from "./utils.js";
import { Loader } from "./Loader.js";
import { SceneManager } from "../scene/SceneManager.js";
import { LoaderScene } from "../scene/LoaderScene.js";
import { MainScene } from "../scene/MainScene.js";

let instance = null; // one instance only about this class

export class App {
    constructor(container) {
        if (instance) {
            return instance;
        }
        instance = this;

        this.app = null;
        this.container = container;

        void this.run();
    }

    async run() {
        // gsap.registerPlugin(PixiPlugin);
        // PixiPlugin.registerPIXI(PIXI);

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

        $globals.sceneManager = new SceneManager();
        this.app.ticker.add(ticker => {
            const dt = ticker.deltaMS / 1_000;
            $globals.sceneManager.update(dt);
        });

        this.start();
        
        // this.loader = new Loader();
        //
        // this.loader.preloadAssets().then(() => {
        //     this.loadingScene = new LoaderScene();
        //
        //     this.loader.EE.on('progress', (progress) => {
        //         this.loadingScene.setText(progress);
        //     });
        //
        //     this.loader.loadAssets().then(() => {
        //         this.start();
        //
        //         this.loadingScene.createDisclaimer();
        //         this.loadingScene.setText('enter');
        //         this.loadingScene.content.style.cursor = 'pointer';
        //         this.loadingScene.content.addEventListener('click', () => {
        //             this.loadingScene.remove();
        //             $globals.assets.audio['BackgroundMusicTrack'].play();
        //             $globals.sceneManager.scene.slot.reelsFadeIn();
        //         }, { once: true });
        //     });
        // });
    }

    start() {
        // $globals.sceneManager.start(new MainScene());
        const scene = new LoaderScene();

        $globals.sceneManager.start(scene);

        this.resize(this.originalRect);
        window.addEventListener('resize', () => {
            this.resize(this.originalRect);
        });
    }

    resize(originalRect) {
        this.app.renderer.resize(window.innerWidth, window.innerHeight);
        $globals.sceneManager.resize(originalRect);
    }
}
