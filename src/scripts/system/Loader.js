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

  // Option 4: Parallel with individual progress - Best of both worlds
  loadAssets() {
    return new Promise(async resolve => {
      const allAssets = [];

      // Collect all assets with progress tracking
      for (const key in this.ASSETS_MAP) {
        for (const currentAsset of this.ASSETS_MAP[key]) {
          // Create promise that updates progress immediately when this specific asset completes
          allAssets.push(
            Assets.load({ alias: currentAsset.alias, src: currentAsset.src })
              .then(() => this.updateProgress()) // Progress updates as soon as this asset finishes
          );
        }
      }

      // Load all assets in parallel - maximum speed
      // Progress updates smoothly as individual assets complete
      // Best approach: fast loading + smooth progress bar
      await Promise.all(allAssets);

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