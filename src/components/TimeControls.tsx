import React, { useState, useEffect } from 'react';
import { Play, Pause, ChevronUp, ChevronDown, Clock } from 'lucide-react';
import { TimePhase } from '../types/savannah';
import { motion, AnimatePresence } from 'motion/react';

interface TimeControlsProps {
  timeOfDay: number;
  timePhase: TimePhase;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSetTime: (h: number) => void;
  timeSpeed: number;
  onChangeSpeed: (speed: number) => void;
}

export const TimeControls: React.FC<TimeControlsProps> = ({
  timeOfDay,
  timePhase,
  isPlaying,
  onTogglePlay,
  onSetTime,
  timeSpeed,
  onChangeSpeed,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 640) {
      setIsOpen(true);
    }
  }, []);

  const hours = Math.floor(timeOfDay);
  const minutes = Math.floor((timeOfDay % 1) * 60);
  const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

  const presets = [
    { label: 'Fajar', h: 5.5 },
    { label: 'Pagi', h: 8.0 },
    { label: 'Siang', h: 12.5 },
    { label: 'Sore', h: 16.5 },
    { label: 'Senja', h: 18.5 },
    { label: 'Malam', h: 22.0 },
  ];

  return (
    <div className="pointer-events-auto bg-[#fffcf2]/95 border border-[#8c6437]/30 rounded-2xl backdrop-blur-md shadow-lg p-2 sm:p-3 w-[180px] sm:w-[260px] transition-all">
      {/* Header Bar with Clock & Play Button */}
      <div className="flex items-center justify-between">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 cursor-pointer select-none"
        >
          <Clock className="w-3.5 h-3.5 text-[#b8874a]" />
          <div>
            <div className="font-['Caveat'] font-bold text-xl sm:text-3xl leading-none text-[#4a3421]">
              {formattedTime}
            </div>
            <div className="text-[9px] font-extrabold text-[#b8874a] uppercase tracking-wider">
              {timePhase}
            </div>
          </div>

          <button className="text-[#7a5c38] p-0.5">
            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>

        <button
          onClick={onTogglePlay}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#8a6a42] text-[#fff7ea] hover:bg-[#6b4e2d] active:scale-95 flex items-center justify-center transition-all shadow-md"
          title={isPlaying ? 'Jeda Simulasi Waktu' : 'Jalankan Waktu'}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
        </button>
      </div>

      {/* Sliding Time Controls */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="time-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="space-y-2 mt-2 pt-2 border-t border-[#8c6437]/20">
              {/* Preset Time Chips */}
              <div className="grid grid-cols-6 gap-1">
                {presets.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => onSetTime(p.h)}
                    className="px-0.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-extrabold bg-[#fffbe8] text-[#5b4025] border border-[#8c6437]/20 hover:bg-[#8a6a42] hover:text-white transition-all text-center"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Jam Slider */}
              <div>
                <div className="flex justify-between text-[10px] font-extrabold text-[#5b4025] mb-0.5">
                  <span>Jam</span>
                  <span className="text-[#b8874a]">{timeOfDay.toFixed(1)}h</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="24"
                  step="0.1"
                  value={timeOfDay}
                  onChange={(e) => onSetTime(parseFloat(e.target.value))}
                  className="w-full accent-[#b8874a] cursor-pointer h-1.5 rounded-lg bg-[#e8d2b0]"
                />
              </div>

              {/* Kecepatan Slider */}
              <div>
                <div className="flex justify-between text-[10px] font-extrabold text-[#5b4025] mb-0.5">
                  <span>Kecepatan</span>
                  <span className="text-[#b8874a]">1s = {timeSpeed}m</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  step="2"
                  value={timeSpeed}
                  onChange={(e) => onChangeSpeed(parseInt(e.target.value, 10))}
                  className="w-full accent-[#b8874a] cursor-pointer h-1.5 rounded-lg bg-[#e8d2b0]"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
