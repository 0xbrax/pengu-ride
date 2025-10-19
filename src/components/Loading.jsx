import {useMemo} from "react";

export default function Loading({
  progress
}) {
  const progressPercentage = useMemo(() => {
    return Math.round(progress * 100);
  }, [progress]);

  return (
    <div className="w-full h-full fixed z-10 top-0 left-0 flex flex-col justify-center items-center">
      {/* Contenitore principale */}
      <div className="relative z-10 flex flex-col items-center gap-8">

        {/* Testo Loading */}
        <div className="text-center font-black text-4xl text-black text-shadow-white mb-8">
          Pengu<br/>
          Ride
        </div>

        {/* Barra di progresso */}
        <div className="w-80 max-w-sm">
          {/* Container barra */}
          <div className="relative w-full h-4 bg-slate-800/60 rounded-full overflow-hidden border-2 border-white/20 backdrop-blur-sm">
            {/* Sfondo ghiacciato */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>

            {/* Barra di progresso animata */}
            <div
              className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 transition-all duration-300 ease-out relative overflow-hidden"
              style={{ width: `${progressPercentage}%` }}
            >
              {/* Riflesso sulla barra */}
              <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/30 to-white/10"></div>

              {/* Effetto shimmer */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite] w-full"></div>
            </div>
          </div>

          {/* Percentuale */}
          <div className="text-center mt-4">
            <span className="font-mono text-2xl text-black font-bold text-shadow-white">
              {progressPercentage}%
            </span>
          </div>
        </div>
      </div>
    </div>

  )
}