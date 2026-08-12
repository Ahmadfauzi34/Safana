import React, { useState, useEffect } from 'react';
import { WeatherPreset } from '../types/savannah';
import { Sun, Cloud, CloudRain, Zap, ChevronDown, ChevronUp, Compass } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WeatherControlsProps {
  weather: WeatherPreset;
  onChangeWeather: (w: WeatherPreset) => void;
  onResetTopView: () => void;
  autoRotate: boolean;
  onToggleAutoRotate: () => void;
  showMarkers: boolean;
  onToggleMarkers: () => void;
}

export const WeatherControls: React.FC<WeatherControlsProps> = ({
  weather,
  onChangeWeather,
  onResetTopView,
  autoRotate,
  onToggleAutoRotate,
  showMarkers,
  onToggleMarkers,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 640) {
      setIsOpen(true);
    }
  }, []);

  const options: { id: WeatherPreset; label: string; icon: React.ReactNode }[] = [
    { id: 'cerah', label: 'Cerah', icon: <Sun className="w-3 h-3 text-amber-500" /> },
    { id: 'berawan', label: 'Awan', icon: <Cloud className="w-3 h-3 text-slate-500" /> },
    { id: 'hujan', label: 'Hujan', icon: <CloudRain className="w-3 h-3 text-blue-500" /> },
    { id: 'badai', label: 'Badai', icon: <Zap className="w-3 h-3 text-amber-600" /> },
  ];

  return (
    <div className="pointer-events-auto bg-[#fffcf2]/95 border border-[#8c6437]/30 rounded-2xl backdrop-blur-md shadow-lg p-2 sm:p-3 w-[150px] sm:w-[210px] transition-all">
      {/* Header Bar */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-[#b8874a]" />
          <h2 className="font-['Caveat'] font-bold text-base sm:text-xl text-[#4a3421] leading-none">
            Cuaca &amp; View
          </h2>
        </div>

        <button className="p-0.5 text-[#7a5c38]">
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Sliding Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="weather-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="space-y-2 mt-2 pt-2 border-t border-[#8c6437]/20">
              {/* Weather Options Grid */}
              <div className="grid grid-cols-2 gap-1">
                {options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => onChangeWeather(opt.id)}
                    className={`flex items-center justify-center gap-1 px-1 py-1 rounded-xl text-[10px] sm:text-[11px] font-extrabold transition-all border ${
                      weather === opt.id
                        ? 'bg-[#8a6a42] text-[#fff7ea] border-[#8a6a42] shadow-sm'
                        : 'bg-[#fffbe8] text-[#5b4025] border-[#8c6437]/25 hover:bg-white'
                    }`}
                  >
                    {opt.icon}
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>

              {/* View Mode Buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={onToggleAutoRotate}
                  className={`flex-1 px-1 py-1 rounded-xl text-[10px] font-extrabold transition-all border ${
                    autoRotate
                      ? 'bg-[#8a6a42] text-[#fff7ea] border-[#8a6a42]'
                      : 'bg-[#fffbe8] text-[#5b4025] border-[#8c6437]/25'
                  }`}
                >
                  ⟳ Rotasi
                </button>
                <button
                  onClick={onResetTopView}
                  className="flex-1 px-1 py-1 rounded-xl text-[10px] font-extrabold bg-[#fffbe8] text-[#5b4025] border border-[#8c6437]/25 hover:bg-white"
                >
                  ⤒ Atas
                </button>
                <button
                  onClick={onToggleMarkers}
                  className={`flex-1 px-1 py-1 rounded-xl text-[10px] font-extrabold transition-all border ${
                    showMarkers
                      ? 'bg-[#8a6a42] text-[#fff7ea] border-[#8a6a42]'
                      : 'bg-[#fffbe8] text-[#5b4025] border-[#8c6437]/25'
                  }`}
                >
                  🐾 Pin
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
