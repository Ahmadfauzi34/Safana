import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { SavannahConfig, TimePhase, WeatherConfig, WeatherPreset } from '../types/savannah';
import { clamp, lerp, smoothstep, terrainH } from '../utils/noise';

import { AtmosphereModule } from './modules/AtmosphereModule';
import { FaunaSpotsModule } from './modules/FaunaSpotsModule';
import { FloraModule } from './modules/FloraModule';
import { LandscapePropsModule } from './modules/LandscapePropsModule';
import { TerrainModule } from './modules/TerrainModule';
import { WaterModule } from './modules/WaterModule';
import { FaunaSystemModule } from './modules/FaunaSystemModule';

/* ================= Keyframe Color Palette for 24-Hour Time Interpolation ================= */
const GRAY = new THREE.Color(0x9aa0a8);

interface TimeKeyframe {
  t: number; // Hour 0..24
  sky: THREE.Color;
  fog: THREE.Color;
  sun: THREE.Color;
  sunI: number;
  hs: THREE.Color;
  hg: THREE.Color;
  hi: number;
}

const KEYS_RAW = [
  { t: 0, sky: 0x141b33, fog: 0x1b2340, sun: 0x8fa5d9, sunI: 0.0, hs: 0x2a3560, hg: 0x161d30, hi: 0.5 },
  { t: 4.6, sky: 0x1a2140, fog: 0x222a48, sun: 0x8fa5d9, sunI: 0.0, hs: 0x2c3763, hg: 0x181f33, hi: 0.52 },
  { t: 5.6, sky: 0x5a4a6e, fog: 0x5d4f6e, sun: 0xe08d5f, sunI: 0.35, hs: 0x6e5a80, hg: 0x3a3350, hi: 0.62 },
  { t: 6.6, sky: 0xe89a63, fog: 0xdda173, sun: 0xff9e5c, sunI: 0.95, hs: 0xe8b088, hg: 0x7a5f4a, hi: 0.8 },
  { t: 8.5, sky: 0xf2c88e, fog: 0xecd0a0, sun: 0xffc684, sunI: 1.3, hs: 0xf5dcae, hg: 0x8a7248, hi: 1.0 },
  { t: 12, sky: 0xf7e6bd, fog: 0xf2e2bd, sun: 0xfff1c9, sunI: 1.55, hs: 0xffefc9, hg: 0x8f7a4e, hi: 1.1 },
  { t: 15.5, sky: 0xf4d8a0, fog: 0xefd6a6, sun: 0xffd894, sunI: 1.4, hs: 0xf8e2b4, hg: 0x8a7248, hi: 1.05 },
  { t: 17.5, sky: 0xefad72, fog: 0xe5a978, sun: 0xffa45e, sunI: 1.0, hs: 0xf0bd8a, hg: 0x7c5f42, hi: 0.85 },
  { t: 18.6, sky: 0xc86f52, fog: 0xc47d5e, sun: 0xff7a44, sunI: 0.55, hs: 0xc98a70, hg: 0x5c4636, hi: 0.7 },
  { t: 19.6, sky: 0x4d4266, fog: 0x4c4566, sun: 0xa877a0, sunI: 0.18, hs: 0x5c5180, hg: 0x2c2842, hi: 0.6 },
  { t: 21, sky: 0x1c2444, fog: 0x232b4a, sun: 0x8fa5d9, sunI: 0.0, hs: 0x2e3966, hg: 0x191f36, hi: 0.52 },
  { t: 24, sky: 0x141b33, fog: 0x1b2340, sun: 0x8fa5d9, sunI: 0.0, hs: 0x2a3560, hg: 0x161d30, hi: 0.5 },
];

const KEYS: TimeKeyframe[] = KEYS_RAW.map((k) => ({
  t: k.t,
  sky: new THREE.Color(k.sky),
  fog: new THREE.Color(k.fog),
  sun: new THREE.Color(k.sun),
  sunI: k.sunI,
  hs: new THREE.Color(k.hs),
  hg: new THREE.Color(k.hg),
  hi: k.hi,
}));

export const WEATHER_CONFIGS: Record<WeatherPreset, WeatherConfig> = {
  cerah: {
    sunMul: 1.0,
    gray: 0.0,
    fogNear: 150,
    fogFar: 380,
    cloudN: 5,
    cloudColor: { r: 1.0, g: 1.0, b: 1.0 },
    wind: 1.0,
    rain: 0,
    thunderProbability: 0,
  },
  berawan: {
    sunMul: 0.62,
    gray: 0.4,
    fogNear: 110,
    fogFar: 300,
    cloudN: 12,
    cloudColor: { r: 0.8, g: 0.82, b: 0.86 },
    wind: 1.6,
    rain: 0,
    thunderProbability: 0,
  },
  hujan: {
    sunMul: 0.38,
    gray: 0.65,
    fogNear: 75,
    fogFar: 220,
    cloudN: 16,
    cloudColor: { r: 0.6, g: 0.63, b: 0.68 },
    wind: 2.6,
    rain: 1,
    thunderProbability: 0.4,
  },
  badai: {
    sunMul: 0.22,
    gray: 0.85,
    fogNear: 50,
    fogFar: 180,
    cloudN: 16,
    cloudColor: { r: 0.35, g: 0.38, b: 0.42 },
    wind: 3.8,
    rain: 1.5,
    thunderProbability: 0.9,
  },
};

export class SavannahScene {
  public container: HTMLElement;
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public controls: OrbitControls;

  // Lights
  public hemiLight: THREE.HemisphereLight;
  public sunLight: THREE.DirectionalLight;
  public moonLight: THREE.DirectionalLight;

  // Modular Sub-systems
  public terrainModule: TerrainModule;
  public waterModule: WaterModule;
  public floraModule: FloraModule;
  public landscapePropsModule: LandscapePropsModule;
  public atmosphereModule: AtmosphereModule;
  public faunaSpotsModule: FaunaSpotsModule;
  public faunaSystemModule: FaunaSystemModule;

  // Animation & Clock State
  private clock = new THREE.Clock();
  private animFrameId: number | null = null;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  // Reusable Color Objects to prevent GC allocations in animation loop
  private _sky = new THREE.Color();
  private _fog = new THREE.Color();
  private _sun = new THREE.Color();
  private _hs = new THREE.Color();
  private _hg = new THREE.Color();
  private _finalSky = new THREE.Color();
  private _finalFog = new THREE.Color();
  private _finalSun = new THREE.Color();

  // Active Weather & Dynamics
  public config: SavannahConfig;
  private rainAmt = 0;
  private grayAmt = 0;
  private wetAmt = 0;
  private flash = 0;
  private lightningTimer = 5;
  private curCloudColor = new THREE.Color(1, 1, 1);

  // Throttled UI State Callbacks
  private lastReportedTime = -1;
  private lastReportedPhase: TimePhase | null = null;

  // Adaptive Performance Monitor
  private fpsFrameCount = 0;
  private fpsTimeAcc = 0;
  private isAdaptiveLowRes = false;

  // Camera Interpolation Tween
  private tween: {
    t: number;
    dur: number;
    fp: THREE.Vector3;
    tp: THREE.Vector3;
    ft: THREE.Vector3;
    tt: THREE.Vector3;
    wasAuto: boolean;
  } | null = null;

  // Event Callbacks
  public onAnimalClick?: (animalId: string) => void;
  public onTimeChange?: (time: number, phase: TimePhase) => void;

  constructor(container: HTMLElement, initialConfig: SavannahConfig) {
    this.container = container;
    this.config = { ...initialConfig };

    // 1. Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // 2. Scene & Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf7e6bd);
    this.scene.fog = new THREE.Fog(0xf2e2bd, 150, 380);

    // 3. Camera
    this.camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      900
    );
    this.camera.position.set(18, 130, 58);

    // 4. Orbit Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 35;
    this.controls.maxDistance = 320;
    this.controls.minPolarAngle = 0.12;
    this.controls.maxPolarAngle = 1.25;
    this.controls.autoRotate = this.config.autoRotate;
    this.controls.autoRotateSpeed = 0.5;

    // 5. Lighting
    this.hemiLight = new THREE.HemisphereLight(0xffefc9, 0x8f7a4e, 1.1);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff1c9, 1.5);
    this.sunLight.position.set(60, 110, 55);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.left = -130;
    this.sunLight.shadow.camera.right = 130;
    this.sunLight.shadow.camera.top = 130;
    this.sunLight.shadow.camera.bottom = -130;
    this.sunLight.shadow.camera.near = 20;
    this.sunLight.shadow.camera.far = 420;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.moonLight = new THREE.DirectionalLight(0x8fa5d9, 0);
    this.moonLight.position.set(-60, 95, -40);
    this.moonLight.castShadow = false;
    this.moonLight.shadow.mapSize.set(512, 512);
    this.moonLight.shadow.camera.left = -130;
    this.moonLight.shadow.camera.right = 130;
    this.moonLight.shadow.camera.top = 130;
    this.moonLight.shadow.camera.bottom = -130;
    this.moonLight.shadow.camera.near = 20;
    this.moonLight.shadow.camera.far = 420;
    this.moonLight.shadow.bias = -0.0005;
    this.scene.add(this.moonLight);
    this.scene.add(this.moonLight.target);

    // 6. Instantiate Modular Sub-systems
    this.terrainModule = new TerrainModule(this.renderer);
    this.scene.add(this.terrainModule.mesh);

    this.waterModule = new WaterModule();
    this.scene.add(this.waterModule.mesh);

    this.floraModule = new FloraModule();
    this.scene.add(this.floraModule.group);

    this.landscapePropsModule = new LandscapePropsModule();
    this.scene.add(this.landscapePropsModule.group);

    this.atmosphereModule = new AtmosphereModule(this.floraModule.treeSpots);
    this.scene.add(this.atmosphereModule.group);

    this.faunaSpotsModule = new FaunaSpotsModule();
    this.scene.add(this.faunaSpotsModule.group);

    this.faunaSystemModule = new FaunaSystemModule();
    this.scene.add(this.faunaSystemModule.group);

    // 7. Event Listeners
    window.addEventListener('resize', this.onResize);
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);

    // 8. Start Loop
    this.animate();
  }

  /* ================= Time Keyframe Interpolation ================= */
  private sampleKeys(h: number) {
    const hour = ((h % 24) + 24) % 24;
    let i = 0;
    while (i < KEYS.length - 1 && KEYS[i + 1].t < hour) i++;
    const a = KEYS[i];
    const b = KEYS[i + 1];
    const k = smoothstep(a.t, b.t, hour);

    this._sky.lerpColors(a.sky, b.sky, k);
    this._fog.lerpColors(a.fog, b.fog, k);
    this._sun.lerpColors(a.sun, b.sun, k);
    this._hs.lerpColors(a.hs, b.hs, k);
    this._hg.lerpColors(a.hg, b.hg, k);
    const sunI = lerp(a.sunI, b.sunI, k);
    const hi = lerp(a.hi, b.hi, k);

    return {
      sky: this._sky,
      fog: this._fog,
      sun: this._sun,
      hs: this._hs,
      hg: this._hg,
      sunI,
      hi,
    };
  }

  public getTimePhaseName(h: number): TimePhase {
    if (h >= 4.5 && h < 8) return 'Fajar';
    if (h >= 8 && h < 11) return 'Pagi';
    if (h >= 11 && h < 15) return 'Siang';
    if (h >= 15 && h < 18) return 'Sore';
    if (h >= 18 && h < 19.8) return 'Senja';
    return 'Malam';
  }

  /* ================= Main Animation Loop ================= */
  private animate = () => {
    this.animFrameId = requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.elapsedTime;

    // Adaptive Performance Adjustment
    this.fpsFrameCount++;
    this.fpsTimeAcc += dt;
    if (this.fpsTimeAcc >= 1.0) {
      const fps = this.fpsFrameCount / this.fpsTimeAcc;
      this.fpsFrameCount = 0;
      this.fpsTimeAcc = 0;

      if (fps < 38 && !this.isAdaptiveLowRes && window.devicePixelRatio > 1) {
        this.isAdaptiveLowRes = true;
        this.renderer.setPixelRatio(1.0);
        this.onResize();
      } else if (fps > 55 && this.isAdaptiveLowRes && window.devicePixelRatio > 1) {
        this.isAdaptiveLowRes = false;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this.onResize();
      }
    }

    // 1. Update Simulation Clock & Throttle React State Updates
    if (this.config.isTimeRunning) {
      this.config.timeOfDay = (this.config.timeOfDay + (dt * this.config.timeSpeed) / 60) % 24;
      const phase = this.getTimePhaseName(this.config.timeOfDay);
      if (
        Math.abs(this.config.timeOfDay - this.lastReportedTime) >= 0.08 ||
        phase !== this.lastReportedPhase
      ) {
        this.lastReportedTime = this.config.timeOfDay;
        this.lastReportedPhase = phase;
        if (this.onTimeChange) {
          this.onTimeChange(this.config.timeOfDay, phase);
        }
      }
    }

    // 2. Sample Lighting based on time
    const lightFrame = this.sampleKeys(this.config.timeOfDay);
    const ang = ((this.config.timeOfDay - 6) / 12) * Math.PI;
    const se = Math.sin(ang);
    const dayFactor = smoothstep(-0.06, 0.2, se);
    const nightFactor = 1 - dayFactor;

    // 3. Weather dynamics
    const wx = WEATHER_CONFIGS[this.config.weather];
    this.rainAmt += (wx.rain - this.rainAmt) * Math.min(1, dt * 1.2);
    this.grayAmt += (wx.gray - this.grayAmt) * Math.min(1, dt * 1.2);
    this.wetAmt += (wx.rain * 0.9 - this.wetAmt) * Math.min(1, dt * 0.4);

    this._finalSky.copy(lightFrame.sky).lerp(GRAY, this.grayAmt * 0.45);
    this._finalFog.copy(lightFrame.fog).lerp(GRAY, this.grayAmt * 0.55);
    this._finalSun.copy(lightFrame.sun).lerp(GRAY, this.grayAmt * 0.40);

    this.scene.background = this._finalSky;
    if (this.scene.fog && this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color = this._finalFog;
      this.scene.fog.near = lerp(this.scene.fog.near, wx.fogNear, Math.min(1, dt * 1.5));
      this.scene.fog.far = lerp(this.scene.fog.far, wx.fogFar, Math.min(1, dt * 1.5));
    }

    // Thunder / Lightning
    if (wx.thunderProbability > 0) {
      this.lightningTimer -= dt;
      if (this.lightningTimer <= 0) {
        this.flash = 1.0;
        this.lightningTimer = 4 + Math.random() * (10 / wx.thunderProbability);
      }
    }
    this.flash *= Math.exp(-dt * 7);

    // Sun & Moon Direction & Selective Shadow Mapping
    const sunVis = se > 0.02;
    const moonVis = nightFactor > 0.02;

    this.sunLight.color = this._finalSun;
    this.sunLight.intensity = lightFrame.sunI * wx.sunMul + this.flash * 1.4;
    this.sunLight.position.set(Math.cos(ang) * 130, Math.max(se * 110, 4), 55);
    this.sunLight.visible = sunVis;
    this.sunLight.castShadow = sunVis;

    this.moonLight.intensity = 0.26 * nightFactor * (1 - this.rainAmt * 0.6);
    this.moonLight.position.set(-Math.cos(ang) * 120, Math.max(-se * 100, 4), -40);
    this.moonLight.visible = moonVis;
    this.moonLight.castShadow = moonVis;

    this.hemiLight.color.copy(lightFrame.hs).lerp(GRAY, this.grayAmt * 0.6);
    this.hemiLight.groundColor.copy(lightFrame.hg);
    this.hemiLight.intensity = lightFrame.hi * (1 - this.grayAmt * 0.25) + this.flash * 0.6;

    // 4. Update Sub-modules
    this.terrainModule.setWetness(this.wetAmt);
    this.waterModule.update(elapsed, this.rainAmt, dayFactor * (1 - this.grayAmt * 0.4), this._finalSky);

    const activeWind = wx.wind * this.config.windSpeed;
    this.floraModule.update(elapsed, activeWind, this.wetAmt);

    this.curCloudColor.lerp(
      new THREE.Color(wx.cloudColor.r, wx.cloudColor.g, wx.cloudColor.b),
      Math.min(1, dt * 1.5)
    );
    this.atmosphereModule.update(
      dt,
      elapsed,
      nightFactor,
      this.rainAmt,
      this.grayAmt,
      wx.cloudN,
      this.curCloudColor,
      activeWind
    );

    this.faunaSpotsModule.update(elapsed, this.config.activeAnimalId);

    this.faunaSystemModule.update(
      dt,
      elapsed,
      this.camera.position,
      this.config.timeOfDay,
      this.config.activeAnimalId
    );

    // 5. Camera Tweens
    if (this.tween) {
      this.tween.t += dt;
      let k = Math.min(1, this.tween.t / this.tween.dur);
      k = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; // Smooth cubic easing
      this.camera.position.lerpVectors(this.tween.fp, this.tween.tp, k);
      this.controls.target.lerpVectors(this.tween.ft, this.tween.tt, k);
      if (k >= 1) {
        this.controls.autoRotate = this.tween.wasAuto;
        this.tween = null;
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  /* ================= Camera Navigation ================= */
  public flyTo(targetPos: THREE.Vector3, lookAtTarget: THREE.Vector3, duration = 1.4) {
    this.tween = {
      t: 0,
      dur: duration,
      fp: this.camera.position.clone(),
      tp: targetPos,
      ft: this.controls.target.clone(),
      tt: lookAtTarget,
      wasAuto: this.controls.autoRotate,
    };
    this.controls.autoRotate = false;
  }

  public resetTopView() {
    this.flyTo(new THREE.Vector3(0.1, 170, 14), new THREE.Vector3(0, 0, 0));
  }

  public focusAnimalSpot(animalId: string) {
    const marker = this.faunaSpotsModule.markers.find((m) => m.spot.id === animalId);
    if (!marker) return;
    this.config.activeAnimalId = animalId;

    const { x, z } = marker.spot.pos;
    const h = terrainH(x, z);
    const targetCam = new THREE.Vector3(x + 18, h + 18, z + 24);
    const targetLook = new THREE.Vector3(x, h + 2, z);

    this.flyTo(targetCam, targetLook, 1.5);
  }

  /* ================= Modular Management API ================= */
  public updateConfig(newConfig: Partial<SavannahConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.controls.autoRotate = this.config.autoRotate;

    // Apply visibility toggles cleanly across modules
    const vis = this.config.visibility;
    this.terrainModule.mesh.visible = vis.terrain;
    this.waterModule.mesh.visible = vis.water;

    this.floraModule.setLayerVisibility('acacia', vis.acacias);
    this.floraModule.setLayerVisibility('dead', vis.deadTrees);
    this.floraModule.setLayerVisibility('grass', vis.grass);
    this.floraModule.setLayerVisibility('flower', vis.flowers);
    this.floraModule.setLayerVisibility('bush', vis.bushes);
    this.floraModule.setLayerVisibility('reed', vis.reeds);

    if (this.landscapePropsModule.rockMesh) this.landscapePropsModule.rockMesh.visible = vis.rocks;
    this.landscapePropsModule.group.traverse((c) => {
      if (c.name.includes('Termite')) c.visible = vis.termiteMounds;
      if (c.name.includes('Fallen')) c.visible = vis.fallenLogs;
    });

    this.atmosphereModule.group.traverse((c) => {
      if (c.name.includes('Clouds')) c.visible = vis.clouds;
      if (c.name.includes('Stars')) c.visible = vis.stars;
      if (c.name.includes('Fireflies')) c.visible = vis.fireflies;
      if (c.name.includes('Rain')) c.visible = vis.rain;
    });

    this.faunaSpotsModule.group.visible = vis.animalMarkers;
    this.faunaSystemModule.group.visible = vis.faunaAgents;
  }

  /* ================= Raycasting & Selection ================= */
  private onPointerDown = (event: PointerEvent) => {
    // Exclude clicks if dragging camera heavily
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hitBoxes = this.faunaSpotsModule.getHitBoxes();
    const intersects = this.raycaster.intersectObjects(hitBoxes, false);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const animalId = hit.userData.animalId;
      if (animalId && this.onAnimalClick) {
        this.onAnimalClick(animalId);
      }
    }
  };

  /* ================= Resize & Dispose ================= */
  private onResize = () => {
    if (!this.container) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(w, h);
  };

  public dispose() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.onResize);
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);

    this.terrainModule.dispose();
    this.waterModule.dispose();
    this.floraModule.dispose();
    this.landscapePropsModule.dispose();
    this.atmosphereModule.dispose();
    this.faunaSpotsModule.dispose();
    this.faunaSystemModule.dispose();

    this.renderer.dispose();
    this.container.innerHTML = '';
  }
}
