import { App as PixiApp } from "@/scripts/system/App.js";
import { useEffect, useRef, useState } from "react";
import {$configs} from "@/scripts/system/SETUP.js";
import Loading from "@/components/Loading.jsx";
import PointBalance from "@/components/PointBalance.jsx";

export default function ReactApp() {
  const gameContainer = useRef(null);
  const [gameInstance, setGameInstance] = useState(null);

  const [isGameReady, setIsGameReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    if (gameContainer.current && !gameInstance) {

      // TODO use store (?)
      setGameInstance(new PixiApp(gameContainer.current));
    }

    return () => {
      // destroy and set instance to null
      gameInstance?.destroy();
      setGameInstance(null);
    }
  }, []);

  useEffect(() => {
    if (gameInstance) {
      gameInstance.on("progress", (progress) => {
        setProgress(progress);
      });

      gameInstance.once("ready", () => {
        setIsGameReady(true);
      });

      gameInstance.on("coin-collected", () => {


        setBalance(((prev) => (prev + $configs.SCORE_PER_COIN)));
      });
    }
  }, [gameInstance]);

  return (
    <>
      {/*
        Game canvas
      */}
      <div
        className="relative z-0"
        ref={gameContainer}
      />

      {/*
        React components
      */}
      {!isGameReady && (
        <Loading
          progress={progress}
        />
      )}
      {isGameReady && (
        <PointBalance
          balance={balance}
        />
      )}
    </>
  )
}