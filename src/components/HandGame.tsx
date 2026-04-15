import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { HandDetector, isFist } from '../lib/handDetection';
import { Results, HAND_CONNECTIONS } from '@mediapipe/hands';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';

const WebcamAny = Webcam as any;
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Camera, RefreshCw, Play, Pause } from 'lucide-react';

interface HandState {
  lastX: number;
  isOut: boolean;
  score: number;
  isFist: boolean;
}

export const HandGame: React.FC<{ onGameOver: (score: number) => void }> = ({ onGameOver }) => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectorRef = useRef<HandDetector | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'FINISHED'>('IDLE');
  
  // Hand tracking states
  const handStatesRef = useRef<{ [key: string]: HandState }>({
    'Left': { lastX: 0.5, isOut: false, score: 0, isFist: false },
    'Right': { lastX: 0.5, isOut: false, score: 0, isFist: false }
  });

  const onResults = useCallback((results: Results) => {
    if (!canvasRef.current || !webcamRef.current?.video) return;

    const canvasCtx = canvasRef.current.getContext('2d');
    if (!canvasCtx) return;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // Draw results (optional, for feedback)
    if (results.multiHandLandmarks) {
      results.multiHandLandmarks.forEach((landmarks, index) => {
        const label = results.multiHandedness[index].label; // 'Left' or 'Right'
        const fist = isFist(landmarks);
        const currentX = landmarks[0].x; // Wrist X
        
        const state = handStatesRef.current[label];
        state.isFist = fist;

        if (gameState === 'PLAYING' && fist) {
          // Scoring logic:
          // Left hand: Away is X < 0.3, Towards is X > 0.5
          // Right hand: Away is X > 0.7, Towards is X < 0.5
          // (Assuming mirrored video, so Left hand is on the right side of screen, but MediaPipe labels are usually relative to the person)
          // Let's just use relative movement from center (0.5)
          
          const center = 0.5;
          const threshold = 0.15;

          if (label === 'Left') {
             // MediaPipe 'Left' is usually the user's left hand. 
             // In mirrored view, user's left hand is on the right side of the screen (X > 0.5)
             // Away from head (center) means moving further right (X increases)
             if (!state.isOut && currentX > center + threshold) {
               state.isOut = true;
             } else if (state.isOut && currentX < center + 0.05) {
               state.isOut = false;
               setScore(prev => prev + 1);
             }
          } else {
             // User's right hand is on the left side of the screen (X < 0.5)
             // Away from head (center) means moving further left (X decreases)
             if (!state.isOut && currentX < center - threshold) {
               state.isOut = true;
             } else if (state.isOut && currentX > center - 0.05) {
               state.isOut = false;
               setScore(prev => prev + 1);
             }
          }
        }

        // Draw hand connections and landmarks
        const color = fist ? (state.isOut ? '#F27D26' : '#00FF00') : '#FFFFFF';
        
        drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
          color: color,
          lineWidth: 5
        });
        drawLandmarks(canvasCtx, landmarks, {
          color: color,
          lineWidth: 2,
          radius: 4
        });
      });
    }
    canvasCtx.restore();
  }, [gameState]);

  useEffect(() => {
    detectorRef.current = new HandDetector(onResults);
    
    const interval = setInterval(async () => {
      if (webcamRef.current?.video && webcamRef.current.video.readyState === 4) {
        await detectorRef.current?.send(webcamRef.current.video);
      }
    }, 50);

    return () => {
      detectorRef.current?.close();
      clearInterval(interval);
    };
  }, [onResults]);

  useEffect(() => {
    let timer: number;
    if (gameState === 'PLAYING' && timeLeft > 0) {
      timer = window.setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && gameState === 'PLAYING') {
      setGameState('FINISHED');
      onGameOver(score);
    }
    return () => clearInterval(timer);
  }, [gameState, timeLeft, score, onGameOver]);

  const startGame = () => {
    setScore(0);
    setTimeLeft(30);
    setGameState('PLAYING');
    handStatesRef.current['Left'].isOut = false;
    handStatesRef.current['Right'].isOut = false;
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto aspect-video bg-black rounded-2xl overflow-hidden border-4 border-zinc-800 shadow-2xl">
      <WebcamAny
        ref={webcamRef}
        mirrored
        audio={false}
        className="absolute inset-0 w-full h-full object-cover"
        videoConstraints={{ facingMode: 'user' }}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
        width={1280}
        height={720}
      />

      {/* HUD */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-start pointer-events-none z-20">
        <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-700 p-4 rounded-xl shadow-lg">
          <p className="text-zinc-400 text-xs uppercase tracking-widest font-bold mb-1">Score</p>
          <p className="text-4xl font-black text-white tabular-nums">{score}</p>
        </div>
        
        <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-700 p-4 rounded-xl text-right shadow-lg">
          <p className="text-zinc-400 text-xs uppercase tracking-widest font-bold mb-1">Time</p>
          <p className={`text-4xl font-black tabular-nums ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
            {timeLeft}s
          </p>
        </div>
      </div>

      {/* Overlays */}
      <AnimatePresence>
        {gameState === 'IDLE' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center z-30"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="max-w-md"
            >
              <h2 className="text-5xl font-black text-white mb-4 tracking-tighter">READY?</h2>
              <p className="text-zinc-400 mb-8 leading-relaxed">
                握住拳頭，將手向外推再收回。
                <br />
                <span className="text-orange-500 font-bold">來回一次得一分！</span>
              </p>
              <button
                onClick={startGame}
                className="group relative px-8 py-4 bg-white text-black font-black rounded-full overflow-hidden transition-transform hover:scale-105 active:scale-95"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Play size={24} fill="currentColor" /> START GAME
                </span>
              </button>
            </motion.div>
          </motion.div>
        )}

        {gameState === 'FINISHED' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center z-30"
          >
            <Trophy size={64} className="text-yellow-500 mb-4" />
            <h2 className="text-5xl font-black text-white mb-2 tracking-tighter">TIME'S UP!</h2>
            <p className="text-zinc-400 text-xl mb-8">Final Score: <span className="text-white font-black">{score}</span></p>
            <button
              onClick={startGame}
              className="flex items-center gap-2 px-8 py-4 bg-zinc-800 text-white font-bold rounded-full hover:bg-zinc-700 transition-colors"
            >
              <RefreshCw size={20} /> TRY AGAIN
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instructions Hint */}
      {gameState === 'PLAYING' && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md px-6 py-3 rounded-full border border-white/20 z-20 shadow-xl">
          <p className="text-white text-sm font-bold flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-orange-500 animate-ping" />
            握拳並來回移動手部
          </p>
        </div>
      )}
    </div>
  );
};
