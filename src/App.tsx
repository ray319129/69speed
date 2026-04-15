import { useState } from 'react';
import { HandGame } from './components/HandGame';
import { Leaderboard } from './components/Leaderboard';
import { motion } from 'motion/react';
import { Activity } from 'lucide-react';

export default function App() {
  const [lastScore, setLastScore] = useState<number | undefined>(undefined);

  const handleGameOver = (score: number) => {
    setLastScore(score);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-orange-500 selection:text-white">
      {/* Background Decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-600 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-zinc-800 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12 flex flex-col items-center">
        {/* Header */}
        <header className="mb-12 text-center">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-bold tracking-widest uppercase mb-4"
          >
            <Activity size={14} className="text-orange-500" />
            AI Motion Tracking
          </motion.div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-4 italic uppercase">
            Hand <span className="text-orange-500">Dash</span>
          </h1>
          <p className="text-zinc-400 max-w-lg mx-auto text-lg">
            使用鏡頭追蹤你的手部動作。握緊拳頭，來回擺動來獲得高分！
          </p>
        </header>

        <main className="w-full flex flex-col lg:flex-row gap-12 items-start justify-center">
          {/* Game Section */}
          <section className="w-full lg:flex-1">
            <HandGame onGameOver={handleGameOver} />
          </section>

          {/* Sidebar Section */}
          <aside className="w-full lg:w-96">
            <Leaderboard lastScore={lastScore} />
            
            <div className="mt-8 p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
              <h4 className="text-sm font-black text-zinc-500 uppercase tracking-widest mb-4">How to Play</h4>
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold">1</span>
                  <p className="text-zinc-400 text-sm">允許相機權限並站在鏡頭前。</p>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold">2</span>
                  <p className="text-zinc-400 text-sm">雙手握拳（如圖示）。</p>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold">3</span>
                  <p className="text-zinc-400 text-sm">將拳頭向外推開，再收回靠近頭部。</p>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold">4</span>
                  <p className="text-zinc-400 text-sm">在 30 秒內挑戰最高分！</p>
                </li>
              </ul>
            </div>
          </aside>
        </main>

        <footer className="mt-24 pb-12 text-zinc-600 text-sm font-medium uppercase tracking-widest">
          Built with MediaPipe & React
        </footer>
      </div>
    </div>
  );
}
