export type WeatherPreset = 'cerah' | 'berawan' | 'hujan' | 'badai';

export type TimePhase = 'Fajar' | 'Pagi' | 'Siang' | 'Sore' | 'Senja' | 'Malam';

export interface AnimalSpot {
  id: string;
  name: string;
  species: string;
  latin: string;
  pos: { x: number; z: number };
  count: number;
  habitat: string;
  diet: 'Herbivora' | 'Karnivora' | 'Omnivora';
  status: 'Aman' | 'Rentan' | 'Mendekati Kepunahan' | 'Terancam Punah';
  description: string;
  funFact: string;
  color: string;
  icon: string;
}

export interface ModularVisibility {
  terrain: boolean;
  water: boolean;
  acacias: boolean;
  deadTrees: boolean;
  grass: boolean;
  flowers: boolean;
  bushes: boolean;
  rocks: boolean;
  termiteMounds: boolean;
  fallenLogs: boolean;
  reeds: boolean;
  clouds: boolean;
  stars: boolean;
  fireflies: boolean;
  rain: boolean;
  animalMarkers: boolean;
  faunaAgents: boolean;
}

export interface SavannahConfig {
  visibility: ModularVisibility;
  watercolorIntensity: number;
  windSpeed: number;
  timeOfDay: number; // 0..24
  isTimeRunning: boolean;
  timeSpeed: number; // 1 second = N minutes
  weather: WeatherPreset;
  autoRotate: boolean;
  soundEnabled: boolean;
  activeAnimalId: string | null;
}

export interface WeatherConfig {
  sunMul: number;
  gray: number;
  fogNear: number;
  fogFar: number;
  cloudN: number;
  cloudColor: { r: number; g: number; b: number };
  wind: number;
  rain: number;
  thunderProbability: number;
}
