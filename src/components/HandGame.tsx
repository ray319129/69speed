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
  const webcamRef = useRef<any>(null);
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

  const [isDetectorReady, setIsDetectorReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const onResults = useCallback((results: Results) => {
    if (!isDetectorReady) setIsDetectorReady(true);
    if (!canvasRef.current || !webcamRef.current?.video) return;

    const video = webcamRef.current.video;
    const canvas = canvasRef.current;
    
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    const canvasCtx = canvas.getContext('2d');
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
          const center = 0.5;
          const threshold = 0.15;

          // In mirrored view:
          // User's Left Hand is on the RIGHT side of the screen (X > 0.5)
          // Moving AWAY from head means moving FURTHER RIGHT (X increases)
          // User's Right Hand is on the LEFT side of the screen (X < 0.5)
          // Moving AWAY from head means moving FURTHER LEFT (X decreases)

          if (label === 'Left') {
             // User's Left Hand (on screen right)
             if (!state.isOut && currentX > center + threshold) {
               state.isOut = true;
             } else if (state.isOut && currentX < center + 0.05) {
               state.isOut = false;
               setScore(prev => prev + 1);
             }
          } else {
             // User's Right Hand (on screen left)
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
      const video = webcamRef.current?.video;
      if (video && video.readyState >= 2) { // HAVE_CURRENT_DATA or better
        try {
          await detectorRef.current?.send(video);
        } catch (err) {
          console.error('Detector error:', err);
        }
      }
    }, 100); // Slightly slower to be safer

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

  const onUserMedia = (stream: MediaStream) => {
    console.log('Webcam started successfully', stream);
    setCameraError(null);
  };

  const onUserMediaError = (error: string | DOMException) => {
    console.error('Webcam error:', error);
    setCameraError(typeof error === 'string' ? error : error.message);
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto aspect-video bg-zinc-900 rounded-2xl overflow-hidden border-4 border-zinc-800 shadow-2xl">
      {/* Error State */}
      {cameraError && (
        <div className="absolute inset-0 bg-zinc-900 flex flex-col items-center justify-center z-50 p-8 text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
            <Camera size={32} className="text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">攝影機權限遭拒絕</h3>
          <p className="text-zinc-400 mb-6 max-w-xs">
            請在瀏覽器網址列點擊攝影機圖示允許權限，或點擊右上方「在新分頁開啟」圖示以獲得最佳體驗。
          </p>
          <div className="flex gap-3">
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-zinc-200 transition-colors"
            >
              重新整理
            </button>
            <a 
              href={window.location.href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-6 py-2 bg-zinc-800 text-white font-bold rounded-lg hover:bg-zinc-700 transition-colors"
            >
              在新分頁開啟
            </a>
          </div>
        </div>
      )}

      {/* Video Layer - Fully visible */}
      <WebcamAny
        ref={webcamRef}
        mirrored
        audio={false}
        onUserMedia={onUserMedia}
        onUserMediaError={onUserMediaError}
        className="absolute inset-0 w-full h-full object-cover"
        videoConstraints={{ 
          facingMode: 'user' 
        }}
      />
      
      {!isDetectorReady && (
        <div className="absolute inset-0 bg-zinc-900 flex flex-col items-center justify-center z-50">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-zinc-400 font-bold animate-pulse">INITIALIZING AI...</p>
        </div>
      )}
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
