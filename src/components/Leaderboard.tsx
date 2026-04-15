import React, { useEffect, useState } from 'react';
import { Trophy, Medal, User } from 'lucide-react';
import { motion } from 'motion/react';

interface ScoreEntry {
  name: string;
  score: number;
  date: number;
}

export const Leaderboard: React.FC<{ lastScore?: number }> = ({ lastScore }) => {
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [playerName, setPlayerName] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('hand_game_scores');
    if (saved) {
      setScores(JSON.parse(saved));
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || lastScore === undefined) return;

    const newEntry: ScoreEntry = {
      name: playerName.trim(),
      score: lastScore,
      date: Date.now()
    };

    const newScores = [...scores, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    setScores(newScores);
    localStorage.setItem('hand_game_scores', JSON.stringify(newScores));
    setSubmitted(true);
  };

  return (
    <div className="w-full max-w-md mx-auto bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
        <h3 className="text-xl font-black text-white flex items-center gap-2">
          <Trophy size={20} className="text-yellow-500" /> LEADERBOARD
        </h3>
      </div>

      <div className="p-6">
        {lastScore !== undefined && !submitted && (
          <form onSubmit={handleSubmit} className="mb-8 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
            <p className="text-sm text-zinc-400 mb-3 uppercase tracking-wider font-bold">New High Score: {lastScore}</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="flex-1 bg-black border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white transition-colors"
                maxLength={15}
              />
              <button 
                type="submit"
                className="bg-white text-black px-4 py-2 rounded-lg font-bold hover:bg-zinc-200 transition-colors"
              >
                SAVE
              </button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {scores.length === 0 ? (
            <p className="text-center text-zinc-500 py-8 italic">No scores yet. Be the first!</p>
          ) : (
            scores.map((entry, index) => (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                key={`${entry.date}-${index}`}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  index === 0 ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-zinc-800/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-6 text-center font-black ${
                    index === 0 ? 'text-yellow-500' : 
                    index === 1 ? 'text-zinc-400' : 
                    index === 2 ? 'text-orange-700' : 'text-zinc-600'
                  }`}>
                    {index + 1}
                  </span>
                  <span className="text-white font-medium">{entry.name}</span>
                </div>
                <span className="text-xl font-black text-white">{entry.score}</span>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
