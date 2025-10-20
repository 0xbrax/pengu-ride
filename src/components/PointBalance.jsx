import {useScoreStore} from "@/store/useScoreStore.js";

export default function PointBalance({
  balance,
}) {
  const bestScore = useScoreStore(s => s.bestScore);

  return (
    <div className="pointer-events-none absolute z-10 top-0 left-0 w-full flex justify-between items-center font-semibold p-4">
      <div className="bg-white text-black px-4 py-2 rounded-lg shadow-lg border border-gray-200 font-semibold">
        {bestScore > 0 ? `Best: ${bestScore}` : "Start Tapping"}
      </div>

      <div className="bg-white text-black px-4 py-2 rounded-lg shadow-lg border border-gray-200 font-semibold">
        Score: {balance}
      </div>
    </div>
  )
}