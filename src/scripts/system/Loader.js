import { Assets, EventEmitter } from "pixi.js";
import { Howl } from 'howler';
import { ASSETS_MAP } from "@/scripts/system/ASSETS.js";
import {$globals} from "@/scripts/system/SETUP.js";

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
      const allAssets = [];

      for (const key in this.ASSETS_MAP) {
        if (key === "audio") {
          for (const currentAsset of this.ASSETS_MAP[key]) {
            allAssets.push(
              this.loadSound({ alias: currentAsset.alias, src: currentAsset.src })
                .then(() => this.updateProgress())
            );
          }
          continue;
        }

        for (const currentAsset of this.ASSETS_MAP[key]) {
          allAssets.push(
            Assets.load({ alias: currentAsset.alias, src: currentAsset.src })
              .then(() => this.updateProgress())
          );
        }
      }

      await Promise.all(allAssets);

      resolve();
    });
  }

    loadSound({ alias, src }) {
        return new Promise((resolve) => {
            const sound = new Howl({
                src: [src],
                onload: () => {
                    $globals.sounds.set(alias, sound);
                    resolve(sound);
                },
            });
        });
    }
}