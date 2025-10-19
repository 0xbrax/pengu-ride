import { Assets, EventEmitter } from "pixi.js";
import { Howl } from 'howler';
import { ASSETS_MAP } from "@/scripts/system/ASSETS.js";

export class Loader extends EventEmitter {
    constructor() {
        super();

        this.ASSETS_MAP = ASSETS_MAP;

        this.loadedAssetsCount = 0;
        this.totalAssetsCount = Object.keys(this.ASSETS_MAP).reduce((acc, key) => {
            return acc + Object.keys(this.ASSETS_MAP[key]).length;
        }, 0);
        
        void this.loadAssets();
    }

    // 0.0 ... 1.0
    // 0 is not emitted
    updateProgress() {
        this.loadedAssetsCount++;
        const progress = this.loadedAssetsCount / this.totalAssetsCount;
        this.emit('progress', progress);
    }

    loadAssets() {
        return new Promise(async resolve => {
            for (const key in this.ASSETS_MAP) {
                // if (key === 'audio') {
                //     for (const subKey in this.ASSETS_MAP[key]) {
                //         // $globals.assets[key][subKey] = await this.loadSound(this.ASSETS_MAP[key][subKey]);
                //         this.updateProgress();
                //     }
                //     continue;
                // }
                
                for (const currentAsset of this.ASSETS_MAP[key]) {
                    await Assets.load({ alias: currentAsset.alias, src: currentAsset.src });

                    this.updateProgress();
                }

            }

            resolve();
        });
    }

    loadSound(src) {
        return new Promise((resolve) => {
            const sound = new Howl({
                src: [src],
                onload: () => {
                    resolve(sound);
                },
            });
        });
    }

    // TODO use zustand
    // audioMixer() {
    //     $globals.assets.audio['BackgroundMusicTrack'].volume(0.3);
    //     $globals.assets.audio['BackgroundMusicTrack'].loop(true);
    //
    //     $globals.assets.audio['SlotClickSfx'].volume(0.5);
    //     $globals.assets.audio['SlotTickSfx'].volume(0.8);
    // }
}