import { Assets, EventEmitter } from "pixi.js";
import { Howl } from 'howler';
import { $globals } from "./utils.js";
import { assets } from "./Assets.js";

export class Loader {
    constructor() {
        this.EE = new EventEmitter();
        this.assets = assets;

        for (const key in this.assets) {
            $globals.assets[key] = {};
        }
    }

    preloadAssets() {
        return new Promise(async resolve => {
            $globals.assets.preload['LogoFullImage'] = this.assets.preload['LogoFullImage'];

            resolve();
        });
    }

    loadAssets() {
        return new Promise(async resolve => {
            const totalAssetsCount = Object.keys(this.assets).reduce((acc, key) => {
                if (key === 'preload') return acc;
                return acc + Object.keys(this.assets[key]).length;
            }, 0);

            let loadedAssetsCount = 0;
            const updateProgress = () => {
                const progress = parseInt((loadedAssetsCount / totalAssetsCount) * 100);
                this.EE.emit('progress', progress);
            };
            updateProgress();

            for (const key in this.assets) {
                if (key === 'preload') continue;

                if (key === 'audio') {
                    for (const subKey in this.assets[key]) {
                        $globals.assets[key][subKey] = await this.loadSound(this.assets[key][subKey]);

                        loadedAssetsCount++;
                        updateProgress();
                    }
                    continue;
                }

                if (key === 'symbols' || key === 'character') {
                    for (const subKey in this.assets[key]) {
                        Assets.add({ alias: subKey, src: this.assets[key][subKey] });
                        $globals.assets[key][subKey] = await Assets.load(subKey);

                        loadedAssetsCount++;
                        updateProgress();
                    }

                    continue;
                }

                if (key === 'other') {
                    for (const subKey in this.assets[key]) {
                        $globals.assets[key][subKey] = this.assets[key][subKey];
                        loadedAssetsCount++;
                        updateProgress();
                    }

                    continue;
                }

                for (const subKey in this.assets[key]) {
                    Assets.add({ alias: subKey, src: this.assets[key][subKey] });
                    $globals.assets[key][subKey] = await Assets.load(subKey);

                    loadedAssetsCount++;
                    updateProgress();
                }
            }

            loadedAssetsCount = totalAssetsCount;
            updateProgress();
            this.audioMixer();

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

    audioMixer() {
        $globals.assets.audio['BackgroundMusicTrack'].volume(0.3);
        $globals.assets.audio['BackgroundMusicTrack'].loop(true);

        $globals.assets.audio['SlotClickSfx'].volume(0.5);
        $globals.assets.audio['SlotTickSfx'].volume(0.8);
    }
}