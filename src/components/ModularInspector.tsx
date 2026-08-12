import React from 'react';
import { X, Layers, Sliders, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { ModularVisibility, SavannahConfig } from '../types/savannah';

interface ModularInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  config: SavannahConfig;
  onUpdateConfig: (updated: Partial<SavannahConfig>) => void;
  onResetAllLayers: () => void;
}

export const ModularInspector: React.FC<ModularInspectorProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  onResetAllLayers,
}) => {
  if (!isOpen) return null;

  const visibilityItems: { key: keyof ModularVisibility; label: string; icon: string }[] = [
    { key: 'terrain', label: 'Medan Tanah Savana', icon: '🏞️' },
    { key: 'water', label: 'Kolam Air Kubangan', icon: '💧' },
    { key: 'acacias', label: 'Pohon Akasia Leafy', icon: '🌳' },
    { key: 'deadTrees', label: 'Pohon Kering Siluet', icon: '🪵' },
    { key: 'grass', label: 'Rumput Goyang (3,200 tufts)', icon: '🌾' },
    { key: 'flowers', label: 'Bunga Liar Warna-warni', icon: '🌸' },
    { key: 'bushes', label: 'Semak Belukar Savana', icon: '🌿' },
    { key: 'rocks', label: 'Batu-Batuan Alami', icon: '🪨' },
    { key: 'termiteMounds', label: 'Gundukan Rayap Merah', icon: '🐜' },
    { key: 'fallenLogs', label: 'Batang Kayu Tumbang', icon: '🪵' },
    { key: 'reeds', label: 'Ilalang Tepi Kolam', icon: '🌾' },
    { key: 'clouds', label: 'Awan Berarak', icon: '☁️' },
    { key: 'stars', label: 'Bintang Langit Malam', icon: '🌟' },
    { key: 'fireflies', label: 'Kunang-kunang Malam', icon: '🪲' },
    { key: 'rain', label: 'Tetesan Hujan', icon: '🌧️' },
    { key: 'animalMarkers', label: 'Pin Lokasi Satwa', icon: '🐾' },
    { key: 'faunaAgents', label: 'Agen Hewan Hidup', icon: '🦬' },
  ];

  const handleToggleVisibility = (key: keyof ModularVisibility) => {
    onUpdateConfig({
      visibility: {
        ...config.visibility,
        [key]: !config.visibility[key],
      },
    });
  };

  const handleToggleAll = (enable: boolean) => {
    const newVis: ModularVisibility = { ...config.visibility };
    (Object.keys(newVis) as (keyof ModularVisibility)[]).forEach((k) => {
      newVis[k] = enable;
    });
    onUpdateConfig({ visibility: newVis });
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[380px] bg-[#fffcf2]/95 border-l border-[#8c6437]/30 shadow-2xl backdrop-blur-xl flex flex-col transition-all">
      {/* Header */}
      <div className="p-4 border-b border-[#8c6437]/20 flex items-center justify-between bg-[#f8efd8]/80">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-[#8a6a42] text-white">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-['Caveat'] font-bold text-2xl text-[#4a3421] leading-none">
              Manajemen Objek 3D
            </h2>
            <p className="text-[11px] font-bold text-[#7a5c38]">
              Aktifkan/nonaktifkan modul objek &amp; atur efektivitas visual
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-xl hover:bg-[#ebd8b8] text-[#5b4025] transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Quick Batch Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleToggleAll(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#f4e8cd] text-[#4a3421] border border-[#8c6437]/30 text-xs font-bold hover:bg-[#e8d2b0] transition-all"
          >
            <Eye className="w-3.5 h-3.5" /> Tampilkan Semua
          </button>
          <button
            onClick={() => handleToggleAll(false)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#f4e8cd] text-[#4a3421] border border-[#8c6437]/30 text-xs font-bold hover:bg-[#e8d2b0] transition-all"
          >
            <EyeOff className="w-3.5 h-3.5" /> Sembunyikan Semua
          </button>
          <button
            onClick={onResetAllLayers}
            title="Reset Pengaturan Default"
            className="p-2 rounded-xl bg-[#f4e8cd] text-[#4a3421] border border-[#8c6437]/30 hover:bg-[#e8d2b0] transition-all"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Modular Layer Toggles Grid */}
        <div>
          <h3 className="font-['Caveat'] font-bold text-xl text-[#4a3421] mb-2 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-[#b8874a]" /> Modul Objek 3D ({visibilityItems.filter(i => config.visibility[i.key]).length}/{visibilityItems.length} Aktif)
          </h3>
          <div className="space-y-1.5">
            {visibilityItems.map((item) => {
              const active = config.visibility[item.key];
              return (
                <div
                  key={item.key}
                  onClick={() => handleToggleVisibility(item.key)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                    active
                      ? 'bg-[#fff8e7] border-[#8a6a42]/40 shadow-sm'
                      : 'bg-[#f4e8cd]/50 border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-xs font-bold text-[#4a3421]">{item.label}</span>
                  </div>
                  <div
                    className={`w-9 h-5 rounded-full transition-colors relative ${
                      active ? 'bg-[#8a6a42]' : 'bg-[#c2ab8c]'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.75 transition-transform ${
                        active ? 'left-4.5' : 'left-0.75'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Global Shaders & Dynamics Parameters */}
        <div className="bg-[#f8efd8]/90 p-3.5 rounded-2xl border border-[#8c6437]/25 space-y-3">
          <h3 className="font-['Caveat'] font-bold text-xl text-[#4a3421] flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-[#b8874a]" /> Parameter Cat Air &amp; Angin
          </h3>

          <div>
            <div className="flex justify-between text-xs font-extrabold text-[#5b4025] mb-1">
              <span>Intensitas Kuas Cat Air</span>
              <span className="text-[#b8874a]">{Math.round(config.watercolorIntensity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1.6"
              step="0.05"
              value={config.watercolorIntensity}
              onChange={(e) => onUpdateConfig({ watercolorIntensity: parseFloat(e.target.value) })}
              className="w-full accent-[#b8874a] cursor-pointer h-1.5 rounded-lg bg-[#e8d2b0]"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-extrabold text-[#5b4025] mb-1">
              <span>Kecepatan Goyangan Angin</span>
              <span className="text-[#b8874a]">{config.windSpeed.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="3.0"
              step="0.1"
              value={config.windSpeed}
              onChange={(e) => onUpdateConfig({ windSpeed: parseFloat(e.target.value) })}
              className="w-full accent-[#b8874a] cursor-pointer h-1.5 rounded-lg bg-[#e8d2b0]"
            />
          </div>
        </div>
      </div>

      {/* Footer info */}
      <div className="p-3 border-t border-[#8c6437]/20 bg-[#f8efd8] text-center text-[11px] font-extrabold text-[#7a5c38]">
        Setiap modul objek dibuat secara terpisah (modular) untuk efisiensi render.
      </div>
    </div>
  );
};
