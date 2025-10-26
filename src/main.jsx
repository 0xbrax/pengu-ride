import "./style.css";


import {StrictMode} from "react";
import {createRoot} from "react-dom/client";

import ReactApp from "@/ReactApp.jsx";
import {$globals} from "@/scripts/system/SETUP.js";
import {exitFullscreen} from "@/scripts/system/utils.js";
import {Howler} from "howler";
import {gsap} from "gsap";
import {PixiPlugin} from "gsap/PixiPlugin";
import {useGSAP} from "@gsap/react";

gsap.registerPlugin(PixiPlugin, useGSAP);


createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ReactApp/>
  </StrictMode>,
);


let wakelock;
window.addEventListener("load", async () => {
  try {
    wakelock = await navigator.wakeLock.request("screen");

    $globals.isWakelockActive = true;
  } catch (error) {
    //
  }
});
document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState === "visible") {
    if ($globals.isAudioActive === true) Howler.mute(false);

    if (wakelock) {
      wakelock = await navigator.wakeLock.request("screen");
      $globals.isWakelockActive = true;
    }
  } else {
    if ($globals.isAudioActive === true) Howler.mute(true);

    if ($globals.isFullscreenActive) exitFullscreen();

    if (wakelock) {
      wakelock.release();
      $globals.isWakelockActive = false;
    }
  }
});

