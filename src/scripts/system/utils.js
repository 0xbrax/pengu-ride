import { PROBABILITY_MIN_MULTIPLIER, PROBABILITY_UNIT_DIVISOR } from '@/scripts/system/SETUP.js';

export const $globals = {
    assets: {},
    sceneManager: null,
    isAudioActive: true,
    isFullscreenActive: false,
    isWakelockActive: false,
};

export const isMobile = !window.matchMedia('screen and (min-width: 576px)').matches;

// Collision detection
export const testForAABB = (object1, object2) => {
    const bounds1 = object1.getHitbox() ? object1.getHitbox() : object1.getBounds();
    const bounds2 = object2.getHitbox ? object2.getHitbox() : object2.getBounds();

    return (
      bounds1.x < bounds2.x + bounds2.width &&
      bounds1.x + bounds1.width > bounds2.x &&
      bounds1.y < bounds2.y + bounds2.height &&
      bounds1.y + bounds1.height > bounds2.y
    );
};

/*
* Misc
* */

export const enterFullscreen = () => {
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
        screen.orientation.lock('portrait-primary'); // auto unlock
        $globals.isFullscreenActive = true;
    } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen();
        screen.orientation.lock('portrait-primary'); // auto unlock
        $globals.isFullscreenActive = true;
    }
};
export const exitFullscreen = () => {
    if (document.exitFullscreen) {
        document.exitFullscreen();
        $globals.isFullscreenActive = false;
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
        $globals.isFullscreenActive = false;
    }
};
