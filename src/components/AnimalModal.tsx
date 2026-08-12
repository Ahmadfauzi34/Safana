import React from 'react';
import { X, MapPin, Compass, ShieldAlert, Sparkles, Navigation } from 'lucide-react';
import { AnimalSpot } from '../types/savannah';

interface AnimalModalProps {
  animal: AnimalSpot | null;
  onClose: () => void;
  onFocusCamera: (animalId: string) => void;
}

export const AnimalModal: React.FC<AnimalModalProps> = ({ animal, onClose, onFocusCamera }) => {
  if (!animal) return null;

  const statusColors: Record<string, string> = {
    Aman: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    Rentan: 'bg-amber-100 text-amber-800 border-amber-300',
    'Mendekati Kepunahan': 'bg-orange-100 text-orange-800 border-orange-300',
    'Terancam Punah': 'bg-rose-100 text-rose-800 border-rose-300',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in pointer-events-auto">
      <div className="bg-[#fffcf2] border-2 border-[#8c6437]/40 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col relative">
        {/* Top Header Banner */}
        <div
          className="p-5 text-white flex items-start justify-between relative overflow-hidden"
          style={{ backgroundColor: animal.color }}
        >
          <div className="relative z-10">
            <span className="text-4xl mb-1 block">{animal.icon}</span>
            <h2 className="font-['Caveat'] font-bold text-3xl sm:text-4xl leading-none drop-shadow-sm">
              {animal.name}
            </h2>
            <p className="text-xs font-semibold opacity-90 italic">
              {animal.species} ({animal.latin})
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white transition-all relative z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Decorative background watermark */}
          <span className="absolute -right-4 -bottom-6 text-9xl opacity-15 select-none">
            {animal.icon}
          </span>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Status & Quick Stats */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-extrabold border ${
                statusColors[animal.status] || 'bg-gray-100 text-gray-800'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
              Status: {animal.status}
            </span>

            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[#f4e8cd] text-[#5b4025] border border-[#8c6437]/25">
              🍖 {animal.diet}
            </span>

            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[#f4e8cd] text-[#5b4025] border border-[#8c6437]/25">
              🐾 Jumlah: ±{animal.count} ekor
            </span>
          </div>

          {/* Habitat */}
          <div className="flex items-center gap-2 text-xs font-extrabold text-[#7a5c38] bg-[#f8efd8] p-2.5 rounded-xl border border-[#8c6437]/20">
            <MapPin className="w-4 h-4 text-[#b8874a] shrink-0" />
            <span>Habitat Utama: {animal.habitat}</span>
          </div>

          {/* Description */}
          <div>
            <h3 className="font-['Caveat'] font-bold text-xl text-[#4a3421] mb-1 flex items-center gap-1">
              <Compass className="w-4 h-4 text-[#b8874a]" /> deskripsi Spesies
            </h3>
            <p className="text-xs font-semibold text-[#5b4025] leading-relaxed">
              {animal.description}
            </p>
          </div>

          {/* Fun Fact Box */}
          <div className="bg-[#fff7ea] border border-[#e8d2b0] rounded-2xl p-3.5 space-y-1">
            <div className="flex items-center gap-1.5 font-['Caveat'] font-bold text-lg text-[#b8874a]">
              <Sparkles className="w-4 h-4" /> Fakta Unik
            </div>
            <p className="text-xs font-extrabold text-[#7a5c38] italic leading-relaxed">
              &quot;{animal.funFact}&quot;
            </p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-[#f8efd8] border-t border-[#8c6437]/20 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#8c6437]/30 text-xs font-bold text-[#5b4025] hover:bg-white transition-all"
          >
            Tutup
          </button>

          <button
            onClick={() => {
              onFocusCamera(animal.id);
              onClose();
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#8a6a42] text-[#fff7ea] hover:bg-[#6b4e2d] text-xs font-extrabold transition-all shadow-md active:scale-95"
          >
            <Navigation className="w-3.5 h-3.5" /> Arahkan Kamera ke Lokasi
          </button>
        </div>
      </div>
    </div>
  );
};
