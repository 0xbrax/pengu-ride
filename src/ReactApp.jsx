import { App as PixiApp } from "@/scripts/system/App.js";
import { useEffect, useRef, useState } from "react";

export default function ReactApp() {
  const gameContainer = useRef(null);
  const [gameInstance, setGameInstance] = useState(null);

  useEffect(() => {
    if (gameContainer.current && !gameInstance) {

      // TODO use store
      setGameInstance(new PixiApp(gameContainer.current));
    }

    return () => {
      // destroy and set instance to null
      gameInstance?.destroy();
      setGameInstance(null);
    }
  }, []);

  return (
    <>
      <div ref={gameContainer} />

      {/* React Components */}
    </>
  )
}