import {$globals} from "@/scripts/system/SETUP.js";

export const getRandomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Collision detection
export const testForAABB = (objectBounds1, objectBounds2) => {
    return (
      objectBounds1.x < objectBounds2.x + objectBounds2.width &&
      objectBounds1.x + objectBounds1.width > objectBounds2.x &&
      objectBounds1.y < objectBounds2.y + objectBounds2.height &&
      objectBounds1.y + objectBounds1.height > objectBounds2.y
    );
};

// Misc
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
