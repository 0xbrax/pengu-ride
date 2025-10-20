import { useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

export default function StartGame({
  startGame,
}) {
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [currentNumber, setCurrentNumber] = useState('');
  const startButtonRef = useRef(null);
  const countdownRef = useRef(null);
  const numberRef = useRef(null);

  useGSAP(() => {
    if (!isCountingDown && startButtonRef.current) {
      gsap.fromTo(startButtonRef.current,
        {
          scale: 0,
          opacity: 0
        },
        {
          scale: 1,
          opacity: 1,
          duration: 0.6,
          ease: "back.out(1.7)"
        }
      );
    }
  }, [isCountingDown]);


  const { contextSafe } = useGSAP();

  const handleCountdown = contextSafe(() => {
    if (isCountingDown) {
      return;
    }

    setIsCountingDown(true);

    const numbers = ['3', '2', '1', 'GO!'];
    let currentIndex = 0;

    const showNextNumber = () => {
      if (currentIndex < numbers.length) {
        setCurrentNumber(numbers[currentIndex]);

        // Animazione per ogni numero
        gsap.fromTo(numberRef.current,
          {
            scale: 0,
            opacity: 0,
            rotation: -180
          },
          {
            scale: currentIndex === 3 ? 1.5 : 2, // GO! un po' più piccolo
            opacity: 1,
            rotation: 0,
            duration: 0.3,
            ease: "back.out(2)",
            onComplete: () => {
              // Pausa prima del prossimo numero
              gsap.to(numberRef.current, {
                scale: currentIndex === 3 ? 1.5 : 1.2,
                duration: 0.2,
                delay: currentIndex === 3 ? 0.3 : 0.4, // GO! resta un po' meno
                ease: "power2.out",
                onComplete: () => {
                  if (currentIndex === 3) {
                    // Dopo GO!, nascondi il countdown e avvia il gioco
                    gsap.to(countdownRef.current, {
                      opacity: 0,
                      scale: 0,
                      duration: 0.3,
                      onComplete: () => {
                        setIsCountingDown(false);
                        setCurrentNumber('');
                        startGame();
                      }
                    });
                  } else {
                    // Nascondi il numero corrente e mostra il prossimo
                    gsap.to(numberRef.current, {
                      scale: 0,
                      opacity: 0,
                      rotation: 180,
                      duration: 0.2,
                      onComplete: () => {
                        currentIndex++;
                        showNextNumber();
                      }
                    });
                  }
                }
              });
            }
          }
        );
      }
    };

    // Mostra il countdown container
    gsap.fromTo(countdownRef.current,
      { opacity: 0, scale: 0 },
      {
        opacity: 1,
        scale: 1,
        duration: 0.2,
        onComplete: showNextNumber
      }
    );
  });

  return (
    <>
      <div
        ref={startButtonRef}
        onPointerDown={handleCountdown}
        className="absolute top-4/6 left-1/2 -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
        style={{ display: isCountingDown ? 'none' : 'flex' }}
      >
        {/* Effetto ghiaccio di sfondo */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100/20 to-cyan-200/30 rounded-full blur-xl scale-110 group-hover:scale-125 transition-all duration-300"></div>

        {/* Bottone principale */}
        <div className="relative inline-flex items-center justify-center px-10 py-5 text-4xl font-bold text-white transition-all duration-300 bg-gradient-to-br from-slate-700 via-blue-800 to-cyan-600 rounded-full shadow-2xl border-4 border-white/30 backdrop-blur-sm hover:scale-110 active:scale-95 hover:shadow-cyan-300/60 hover:border-cyan-300/60 group-hover:from-slate-600 group-hover:via-blue-700 group-hover:to-cyan-500">

          {/* Riflesso ghiacciato */}
          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-white/20 rounded-full"></div>

          {/* Particelle di neve animate */}
          <div className="absolute inset-0 overflow-hidden rounded-full">
            <div className="absolute top-2 left-4 w-1 h-1 bg-white/60 rounded-full animate-pulse"></div>
            <div className="absolute top-6 right-6 w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce"></div>
            <div className="absolute bottom-4 left-8 w-1 h-1 bg-cyan-200/70 rounded-full animate-pulse delay-300"></div>
            <div className="absolute bottom-6 right-4 w-1 h-1 bg-white/50 rounded-full animate-bounce delay-500"></div>
          </div>

          {/* Testo con effetto ghiaccio */}
          <span className="relative flex items-center drop-shadow-lg">
            START
            {/* Cristalli di ghiaccio sul testo */}
            <div className="absolute -top-1 -right-1 w-2 h-2 text-cyan-300 opacity-70 group-hover:opacity-100 transition-all duration-300 group-hover:rotate-12">
              ❄
            </div>
          </span>

          {/* Bordo ghiacciato interno */}
          <div className="absolute inset-1 border border-white/20 rounded-full"></div>
        </div>
      </div>


      {/* Countdown Overlay */}
      {isCountingDown && (
        <div
          ref={countdownRef}
          className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
        >
          <div
            ref={numberRef}
            className="text-6xl font-bold text-white drop-shadow-2xl"
            style={{
              textShadow: '0 0 20px rgba(255,255,255,0.5)',
            }}
          >
            {currentNumber}
          </div>
        </div>
      )}
    </>
  );
}