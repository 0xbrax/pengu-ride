import { App as PixiApp } from "@/scripts/system/App.js";
import {useCallback, useEffect, useRef, useState} from "react";
import {$configs} from "@/scripts/system/SETUP.js";
import Loading from "@/components/Loading.jsx";
import PointBalance from "@/components/PointBalance.jsx";
import StartGame from "@/components/StartGame.jsx";
import {useScoreStore} from "@/store/useScoreStore.js";

export default function ReactApp() {
  const gameContainer = useRef(null);
  const [gameInstance, setGameInstance] = useState(null);

  const [isGameReady, setIsGameReady] = useState(false);
  const [isGamePlaying, setIsGamePlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [balance, setBalance] = useState(0);

  const updateBest = useScoreStore((s) => s.updateBest);

  const startGame = useCallback(() => {
    updateBest(balance);

    setBalance(0);
    setIsGamePlaying(true);
    gameInstance.sceneManager.scene.play();
  }, [gameInstance, balance, updateBest]);

  useEffect(() => {
    if (gameContainer.current && !gameInstance) {
      setGameInstance(new PixiApp(gameContainer.current));
    }

    return () => {
      // clean up
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

      gameInstance.on("game-over", () => {
        const timeout = setTimeout(() => {
          setIsGamePlaying(false);

          clearTimeout(timeout);
        }, 1_000);
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
      {isGameReady && !isGamePlaying && (
        <StartGame
          startGame={startGame}
        />
      )}
    </>
  )
}