import React, { useState, useEffect } from 'react';
import { Layers, Volume2, VolumeX, ChevronDown, ChevronUp, Sparkles, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HeaderCardProps {
  onToggleInspector: () => void;
  isInspectorOpen: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  activeWeather: string;
  timePhase: string;
}

export const HeaderCard: React.FC<HeaderCardProps> = ({
  onToggleInspector,
  isInspectorOpen,
  soundEnabled,
  onToggleSound,
  activeWeather,
  timePhase,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Default open on desktop, default closed on mobile
    if (typeof window !== 'undefined' && window.innerWidth >= 640) {
      setIsOpen(true);
    }
  }, []);

  return (
    <header className="pointer-events-auto bg-[#fffcf2]/95 border border-[#8c6437]/30 rounded-2xl backdrop-blur-md shadow-lg p-2 sm:p-3 max-w-[200px] sm:max-w-[340px] transition-all">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-1.5">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 cursor-pointer select-none"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#b8874a] sm:hidden" />
          <div>
            <h1 className="font-['Caveat'] font-bold text-lg sm:text-3xl text-[#4a3421] leading-none">
              Padang Savana 3D
            </h1>
            <div className="h-0.5 sm:h-1 w-14 sm:w-28 my-0.5 rounded-full bg-gradient-to-r from-[#d9a44a] via-[#b8874a] to-[#b8874a]/20" />
          </div>

          <button className="p-0.5 text-[#7a5c38]">
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onToggleSound}
            title={soundEnabled ? 'Matikan Suara Ambience' : 'Aktifkan Suara Ambience'}
            className={`p-1.5 rounded-xl text-xs font-bold transition-all border ${
              soundEnabled
                ? 'bg-[#8a6a42] text-[#fff7ea] border-[#8a6a42]'
                : 'bg-[#fffabe] text-[#5b4025] border-[#8c6437]/30 hover:bg-white'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onToggleInspector}
            className={`flex items-center gap-1 px-1.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              isInspectorOpen
                ? 'bg-[#8a6a42] text-[#fff7ea] border-[#8a6a42]'
                : 'bg-[#fffabe] text-[#5b4025] border-[#8c6437]/30 hover:bg-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Kelola 3D</span>
          </button>
        </div>
      </div>

      {/* Sliding Expandable Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="header-details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <p className="text-[11px] font-semibold text-[#7a5c38] leading-relaxed mt-1.5 hidden sm:block">
              Simulasi lanskap 3D interaktif dengan objek modular, cuaca, dan siklus waktu.
            </p>

            <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-[#8c6437]/20 text-[10px] sm:text-[11px] font-bold text-[#8a6a42]">
              <span className="px-2 py-0.5 rounded-full bg-[#f4e8cd] border border-[#8c6437]/20">
                {timePhase}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#f4e8cd] border border-[#8c6437]/20 capitalize">
                {activeWeather}
              </span>
              <span className="flex items-center gap-1 ml-auto text-[10px] text-[#7a5c38]/80 font-semibold hidden sm:flex">
                <Eye className="w-3 h-3" /> Drag &amp; Zoom
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
