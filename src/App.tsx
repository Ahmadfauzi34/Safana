import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SavannahScene } from './3d';
import { ANIMAL_SPOTS } from './data';
import { AnimalSpot, SavannahConfig, TimePhase, WeatherPreset } from './types';
import {
  HeaderCard,
  WeatherControls,
  TimeControls,
  ModularInspector,
  AnimalModal,
} from './components';
import { savannahAudio } from './utils';

const defaultConfig: SavannahConfig = {
  visibility: {
    terrain: true,
    water: true,
    acacias: true,
    deadTrees: true,
    grass: true,
    flowers: true,
    bushes: true,
    rocks: true,
    termiteMounds: true,
    fallenLogs: true,
    reeds: true,
    clouds: true,
    stars: true,
    fireflies: true,
    rain: true,
    animalMarkers: true,
    faunaAgents: true,
  },
  watercolorIntensity: 0.35,
  windSpeed: 1.0,
  timeOfDay: 7.0,
  isTimeRunning: true,
  timeSpeed: 10,
  weather: 'cerah',
  autoRotate: true,
  soundEnabled: false,
  activeAnimalId: null,
};

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<SavannahScene | null>(null);

  const [config, setConfig] = useState<SavannahConfig>(defaultConfig);
  const [timePhase, setTimePhase] = useState<TimePhase>('Pagi');
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState<AnimalSpot | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize 3D Scene
  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new SavannahScene(containerRef.current, defaultConfig);
    sceneRef.current = scene;

    scene.onAnimalClick = (animalId: string) => {
      const spot = ANIMAL_SPOTS.find((a) => a.id === animalId) || null;
      setSelectedAnimal(spot);
      scene.focusAnimalSpot(animalId);
      setConfig((prev) => ({ ...prev, activeAnimalId: animalId }));
    };

    scene.onTimeChange = (time: number, phase: TimePhase) => {
      setConfig((prev) => ({ ...prev, timeOfDay: time }));
      setTimePhase(phase);
    };

    // Fade splash screen
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 600);

    return () => {
      clearTimeout(timer);
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  // Sync state changes to 3D Scene
  const handleUpdateConfig = useCallback((updated: Partial<SavannahConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...updated };
      if (sceneRef.current) {
        sceneRef.current.updateConfig(next);
      }
      return next;
    });
  }, []);

  // Weather toggle
  const handleChangeWeather = (w: WeatherPreset) => {
    handleUpdateConfig({ weather: w });
  };

  // Time toggle
  const handleSetTime = (h: number) => {
    handleUpdateConfig({ timeOfDay: h });
    if (sceneRef.current) {
      setTimePhase(sceneRef.current.getTimePhaseName(h));
    }
  };

  const handleTogglePlay = () => {
    handleUpdateConfig({ isTimeRunning: !config.isTimeRunning });
  };

  const handleChangeSpeed = (speed: number) => {
    handleUpdateConfig({ timeSpeed: speed });
  };

  // Camera views
  const handleResetTopView = () => {
    if (sceneRef.current) {
      sceneRef.current.resetTopView();
      handleUpdateConfig({ activeAnimalId: null });
    }
  };

  const handleToggleAutoRotate = () => {
    handleUpdateConfig({ autoRotate: !config.autoRotate });
  };

  const handleToggleMarkers = () => {
    handleUpdateConfig({
      visibility: {
        ...config.visibility,
        animalMarkers: !config.visibility.animalMarkers,
      },
    });
  };

  // Sound toggle
  const handleToggleSound = () => {
    const nextSound = !config.soundEnabled;
    handleUpdateConfig({ soundEnabled: nextSound });
    if (nextSound) {
      savannahAudio.start();
    } else {
      savannahAudio.stop();
    }
  };

  const handleFocusAnimal = (animalId: string) => {
    if (sceneRef.current) {
      sceneRef.current.focusAnimalSpot(animalId);
      setConfig((prev) => ({ ...prev, activeAnimalId: animalId }));
    }
  };

  const handleResetAllLayers = () => {
    handleUpdateConfig({
      visibility: defaultConfig.visibility,
      watercolorIntensity: 0.35,
      windSpeed: 1.0,
    });
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none bg-[#f4e8cd] font-['Nunito',sans-serif]">
      {/* Loading Splash */}
      {!isLoaded && (
        <div className="fixed inset-0 z-50 bg-[#f4e8cd] flex items-center justify-center transition-opacity duration-1000">
          <div className="text-center space-y-3">
            <span className="font-['Caveat'] text-4xl text-[#8a6a42] font-bold animate-pulse">
              Melukis Padang Savana...
            </span>
            <div className="w-24 h-1 bg-[#8a6a42]/30 rounded-full mx-auto overflow-hidden">
              <div className="w-1/2 h-full bg-[#8a6a42] rounded-full animate-ping" />
            </div>
          </div>
        </div>
      )}

      {/* 3D Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 z-0 touch-none" />

      {/* UI Overlay Layer */}
      <div className="fixed inset-0 z-10 pointer-events-none p-4 sm:p-5 flex flex-col justify-between">
        {/* Top Bar: Title & Right Weather Options */}
        <div className="flex items-start justify-between gap-4">
          <HeaderCard
            onToggleInspector={() => setIsInspectorOpen(!isInspectorOpen)}
            isInspectorOpen={isInspectorOpen}
            soundEnabled={config.soundEnabled}
            onToggleSound={handleToggleSound}
            activeWeather={config.weather}
            timePhase={timePhase}
          />

          <WeatherControls
            weather={config.weather}
            onChangeWeather={handleChangeWeather}
            onResetTopView={handleResetTopView}
            autoRotate={config.autoRotate}
            onToggleAutoRotate={handleToggleAutoRotate}
            showMarkers={config.visibility.animalMarkers}
            onToggleMarkers={handleToggleMarkers}
          />
        </div>

        {/* Bottom Bar: Time Controls & Animal Selection Quick Bar */}
        <div className="flex items-end justify-between gap-4">
          <TimeControls
            timeOfDay={config.timeOfDay}
            timePhase={timePhase}
            isPlaying={config.isTimeRunning}
            onTogglePlay={handleTogglePlay}
            onSetTime={handleSetTime}
            timeSpeed={config.timeSpeed}
            onChangeSpeed={handleChangeSpeed}
          />

          {/* Quick Animal Selection Chips */}
          <div className="pointer-events-auto bg-[#fffcf2]/90 border border-[#8c6437]/30 rounded-2xl backdrop-blur-md shadow-lg p-2.5 hidden md:flex items-center gap-1.5 max-w-xl overflow-x-auto">
            <span className="text-xs font-extrabold text-[#7a5c38] px-2 whitespace-nowrap">
              🐾 Satwa:
            </span>
            {ANIMAL_SPOTS.map((animal) => (
              <button
                key={animal.id}
                onClick={() => {
                  setSelectedAnimal(animal);
                  handleFocusAnimal(animal.id);
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 border ${
                  config.activeAnimalId === animal.id
                    ? 'bg-[#8a6a42] text-white border-[#8a6a42]'
                    : 'bg-[#fffbe8] text-[#5b4025] border-[#8c6437]/25 hover:bg-white'
                }`}
              >
                <span>{animal.icon}</span>
                <span>{animal.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Drawer: Modular 3D Management Inspector */}
      <ModularInspector
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        config={config}
        onUpdateConfig={handleUpdateConfig}
        onResetAllLayers={handleResetAllLayers}
      />

      {/* Modal: Animal Details */}
      <AnimalModal
        animal={selectedAnimal}
        onClose={() => setSelectedAnimal(null)}
        onFocusCamera={handleFocusAnimal}
      />
    </div>
  );
}
