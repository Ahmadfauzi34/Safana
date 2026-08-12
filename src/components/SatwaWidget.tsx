import React, { useState, useEffect } from 'react';
import { PawPrint, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AnimalSpot } from '../types/savannah';
import { ANIMAL_SPOTS } from '../data/animals';

interface SatwaWidgetProps {
  activeAnimalId: string | null;
  onSelectAnimal: (animal: AnimalSpot) => void;
}

export const SatwaWidget: React.FC<SatwaWidgetProps> = ({
  activeAnimalId,
  onSelectAnimal,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 640) {
      setIsOpen(true);
    }
  }, []);

  return (
    <div className="pointer-events-auto bg-[#fffcf2]/95 border border-[#8c6437]/30 rounded-2xl backdrop-blur-md shadow-lg p-2 sm:p-2.5 w-[150px] sm:w-auto max-w-[150px] sm:max-w-md transition-all">
      {/* Header Bar */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-1.5">
          <PawPrint className="w-3.5 h-3.5 text-[#b8874a]" />
          <h2 className="font-['Caveat'] font-bold text-base sm:text-xl text-[#4a3421] leading-none">
            Satwa Savana
          </h2>
        </div>

        <button className="p-0.5 text-[#7a5c38]">
          {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Sliding Content Chips */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="satwa-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="mt-1.5 pt-1.5 border-t border-[#8c6437]/20 flex items-center gap-1 overflow-x-auto scrollbar-none">
              {ANIMAL_SPOTS.map((animal) => (
                <button
                  key={animal.id}
                  onClick={() => onSelectAnimal(animal)}
                  className={`px-2 py-1 rounded-xl text-[10.5px] font-bold transition-all whitespace-nowrap flex items-center gap-1 border flex-shrink-0 ${
                    activeAnimalId === animal.id
                      ? 'bg-[#8a6a42] text-white border-[#8a6a42] shadow-sm'
                      : 'bg-[#fffbe8] text-[#5b4025] border-[#8c6437]/20 hover:bg-white'
                  }`}
                >
                  <span>{animal.icon}</span>
                  <span>{animal.name}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
