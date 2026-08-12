import * as THREE from 'three';
import { ANIMAL_SPOTS } from '../../data/animals';
import { AnimalSpot } from '../../types/savannah';
import { SAVANNAH_CONSTANTS, terrainH } from '../../utils/noise';
import { buildAnimalRig, AnimalRig } from './FaunaRigFactory';

type FaunaBehavior =
  | 'grazer'
  | 'browser'
  | 'megafauna'
  | 'predator'
  | 'waterbird'
  | 'waterbuffalo';

type FaunaAgentState =
  | 'idle'
  | 'wander'
  | 'graze'
  | 'drink'
  | 'rest'
  | 'patrol'
  | 'flee'
  | 'stalk'
  | 'chase';

interface FaunaSpeciesProfile {
  behavior: FaunaBehavior;
  color: string;
  scale: number;
  speed: number;
  radius: number;
  waterAffinity: number;
}

interface FaunaAgent {
  speciesId: string;
  homeX: number;
  homeZ: number;
  pos: THREE.Vector3;
  target: THREE.Vector3;
  heading: number;
  state: FaunaAgentState;
  timer: number;
  acc: number;
  speed: number;
  scale: number;
  variance: number;
  rig: AnimalRig;
}

interface SpeciesBucket {
  spot: AnimalSpot;
  profile: FaunaSpeciesProfile;
  agents: FaunaAgent[];
  centroid: THREE.Vector3;
}

const { WX, WZ, WATER_R, WATER_LEVEL } = SAVANNAH_CONSTANTS;

const DEFAULT_PROFILE: FaunaSpeciesProfile = {
  behavior: 'grazer',
  color: '#c9b27a',
  scale: 1.0,
  speed: 2.6,
  radius: 10,
  waterAffinity: 0.15,
};

/**
 * Catatan:
 * Key mengikuti id yang ada di ANIMAL_SPOTS.
 * Saat ini ada id 'g ajah' dengan spasi dari data animals.ts.
 * Nanti bisa kita rapikan, tapi untuk sekarang kita ikuti data yang ada.
 */
const FAUNA_PROFILES: Record<string, FaunaSpeciesProfile> = {
  zebra: {
    behavior: 'grazer',
    color: '#c8c2b4',
    scale: 1.0,
    speed: 3.2,
    radius: 12,
    waterAffinity: 0.15,
  },
  jerapah: {
    behavior: 'browser',
    color: '#e3b45a',
    scale: 1.75,
    speed: 1.7,
    radius: 14,
    waterAffinity: 0.1,
  },
  'g ajah': {
    behavior: 'megafauna',
    color: '#a4a8ad',
    scale: 2.25,
    speed: 1.35,
    radius: 14,
    waterAffinity: 0.45,
  },
  singa: {
    behavior: 'predator',
    color: '#d8a45a',
    scale: 1.2,
    speed: 2.6,
    radius: 16,
    waterAffinity: 0.05,
  },
  antelop: {
    behavior: 'grazer',
    color: '#c3a56a',
    scale: 0.85,
    speed: 4.2,
    radius: 14,
    waterAffinity: 0.12,
  },
  kerbau: {
    behavior: 'waterbuffalo',
    color: '#6a6257',
    scale: 1.35,
    speed: 1.8,
    radius: 10,
    waterAffinity: 0.75,
  },
  cheetah: {
    behavior: 'predator',
    color: '#dbb56a',
    scale: 1.05,
    speed: 4.6,
    radius: 18,
    waterAffinity: 0.05,
  },
  flaminggo: {
    behavior: 'waterbird',
    color: '#f4a9c8',
    scale: 0.9,
    speed: 2.3,
    radius: 6,
    waterAffinity: 1.0,
  },
};

export class FaunaSystemModule {
  public group: THREE.Group;

  private buckets: SpeciesBucket[] = [];
  private predatorAgents: FaunaAgent[] = [];
  private preyAgents: FaunaAgent[] = [];

  private _move = new THREE.Vector3();

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'FaunaSystemGroup';
    this.init();
  }

  /* ================= Initialization ================= */

  private init() {
    for (const spot of ANIMAL_SPOTS) {
      const profile = FAUNA_PROFILES[spot.id] ?? DEFAULT_PROFILE;

      const agents: FaunaAgent[] = [];

      for (let i = 0; i < spot.count; i++) {
        const agent = this.createAgent(spot, profile);
        const rig = buildAnimalRig(spot.id);
        agent.rig = rig;
        agents.push(agent);
        this.group.add(rig.group);
      }

      const bucket: SpeciesBucket = {
        spot,
        profile,
        agents,
        centroid: new THREE.Vector3(),
      };

      if (profile.behavior === 'predator') {
        for (const a of agents) {
          this.predatorAgents.push(a);
        }
      } else {
        for (const a of agents) {
          this.preyAgents.push(a);
        }
      }

      this.buckets.push(bucket);
    }
  }

  private createGeometry(profile: FaunaSpeciesProfile): THREE.BufferGeometry {
    let geo: THREE.BufferGeometry;

    if (profile.behavior === 'waterbird') {
      geo = new THREE.ConeGeometry(0.22, 1.15, 5);
    } else if (profile.behavior === 'megafauna') {
      geo = new THREE.CapsuleGeometry(0.52, 1.2, 3, 6);
    } else if (profile.behavior === 'predator') {
      geo = new THREE.CapsuleGeometry(0.34, 1.0, 3, 6);
    } else {
      geo = new THREE.CapsuleGeometry(0.38, 1.05, 3, 6);
    }

    // Buat orientasi body mengarah ke sumbu Z,
    // supaya rotation.y bisa dipakai sebagai heading.
    geo.rotateX(-Math.PI / 2);

    return geo;
  }

  private createAgent(
    spot: AnimalSpot,
    profile: FaunaSpeciesProfile
  ): FaunaAgent {
    const p = this.findPoint(
      {
        pos: new THREE.Vector3(spot.pos.x, 0, spot.pos.z),
        homeX: spot.pos.x,
        homeZ: spot.pos.z,
      } as FaunaAgent,
      profile,
      'wander',
      profile.radius
    );

    const y = this.groundY(p.x, p.z, profile);

    const variance = 0.9 + Math.random() * 0.25;

    return {
      speciesId: spot.id,
      homeX: spot.pos.x,
      homeZ: spot.pos.z,
      pos: new THREE.Vector3(p.x, y, p.z),
      target: new THREE.Vector3(p.x, y, p.z),
      heading: Math.random() * Math.PI * 2,
      state: 'idle',
      timer: 1 + Math.random() * 5,
      acc: Math.random() * 0.25,
      speed: profile.speed * (0.9 + Math.random() * 0.25),
      scale: profile.scale * variance,
      variance,
    } as FaunaAgent;
  }

  private nearestPrey(pred: FaunaAgent, maxDist: number): FaunaAgent | null {
    let best: FaunaAgent | null = null;
    let bestD = maxDist * maxDist;

    for (const q of this.preyAgents) {
      const dx = q.pos.x - pred.pos.x;
      const dz = q.pos.z - pred.pos.z;
      const d2 = dx * dx + dz * dz;

      if (d2 < bestD) {
        bestD = d2;
        best = q;
      }
    }

    return best;
  }

  /* ================= Main Update ================= */

  public update(
    dt: number,
    elapsed: number,
    cameraPos: THREE.Vector3,
    timeOfDay: number,
    selectedAnimalId: string | null
  ) {
    if (!this.group.visible) return;

    for (const bucket of this.buckets) {
      const isSelected = selectedAnimalId === bucket.spot.id;

      // 1. Centroid kawanan (referensi cohesion)
      bucket.centroid.set(0, 0, 0);
      for (const a of bucket.agents) bucket.centroid.add(a.pos);
      bucket.centroid.divideScalar(Math.max(1, bucket.agents.length));

      // 2. Update agen
      for (const agent of bucket.agents) {
        const sm = this.updateAgent(
          agent,
          bucket.profile,
          dt,
          cameraPos,
          timeOfDay,
          isSelected,
          bucket.centroid
        );

        this.updateRig(agent.rig, agent, Math.max(0, sm), dt);
      }
    }
  }

  private updateAgent(
    agent: FaunaAgent,
    profile: FaunaSpeciesProfile,
    dt: number,
    cameraPos: THREE.Vector3,
    timeOfDay: number,
    isSelected: boolean,
    centroid: THREE.Vector3
  ): number {
    agent.acc += dt;

    const dist = agent.pos.distanceTo(cameraPos);

    let interval = 0;
    if (dist > 120) interval = 0.22;
    else if (dist > 65) interval = 0.1;

    if (agent.acc < interval) return -1;

    const step = Math.min(agent.acc, 0.1);
    agent.acc = 0;

    agent.timer -= step;

    /* ============ FEAR CHECK: herbivora menghindari predator ============ */
    if (profile.behavior !== 'predator' && agent.state !== 'flee') {
      const fearR = this.fearRadius(profile);
      const fearR2 = fearR * fearR;

      for (const p of this.predatorAgents) {
        if (p.state === 'rest' || p.state === 'idle') continue;

        // Predator stalk bisa menyelinap lebih dekat sebelum ketahuan
        let fr = fearR;
        if (p.state === 'stalk') fr = fearR * 0.35;
        else if (p.state === 'chase') fr = fearR * 1.25;

        const fr2 = fr * fr;
        const dx = agent.pos.x - p.pos.x;
        const dz = agent.pos.z - p.pos.z;
        const d2 = dx * dx + dz * dz;

        if (d2 < fr2) {
          agent.state = 'flee';
          agent.timer = 1.2 + Math.random() * 1.4;

          const dl = Math.sqrt(d2) || 1;
          const run = 6 + Math.random() * 6;

          let tx = agent.pos.x + (dx / dl) * run;
          let tz = agent.pos.z + (dz / dl) * run;

          if (!this.isValidPoint(tx, tz, profile)) {
            tx = agent.homeX;
            tz = agent.homeZ;
          }

          agent.target.set(tx, this.groundY(tx, tz, profile), tz);

          // Penyelinap ketahuan → langsung mengejar!
          if (p.state === 'stalk') {
            p.state = 'chase';
            p.timer = 1.5 + Math.random() * 1.5;
          }

          break;
        }
      }
    }

    if (agent.timer <= 0) {
      this.chooseState(agent, profile, timeOfDay, isSelected);
    }

    /* ============ HUNT LOCK: stalk/chase mengejar mangsa terdekat ============ */
    if (
      profile.behavior === 'predator' &&
      (agent.state === 'stalk' || agent.state === 'chase')
    ) {
      const prey = this.nearestPrey(
        agent,
        agent.state === 'chase' ? 40 : 30
      );

      if (prey) {
        agent.target.set(prey.pos.x, prey.pos.y, prey.pos.z);
      } else {
        agent.state = 'wander';
        agent.timer = 2 + Math.random() * 3;
        this.chooseTarget(agent, profile, 'wander');
      }
    }

    const speedMul = this.stateSpeed(agent.state, isSelected);

    if (speedMul > 0) {
      this._move.subVectors(agent.target, agent.pos);
      this._move.y = 0;

      const d = this._move.length();

      if (d < 0.45) {
        this.chooseTarget(agent, profile, agent.state);
      } else {
        this._move.normalize();

        /* ============ COHESION: kawanan berkumpul longgar ============ */
        if (profile.behavior === 'grazer' && agent.state !== 'flee') {
          const cx = centroid.x - agent.pos.x;
          const cz = centroid.z - agent.pos.z;
          const cd = Math.hypot(cx, cz);

          if (cd > 7) {
            this._move.x += (cx / cd) * 0.35;
            this._move.z += (cz / cd) * 0.35;
            this._move.normalize();
          }
        }

        const delta = Math.min(d, agent.speed * speedMul * step);
        agent.pos.addScaledVector(this._move, delta);

        agent.heading = Math.atan2(this._move.x, this._move.z);
      }
    }

    const y = this.groundY(agent.pos.x, agent.pos.z, profile);
    agent.pos.y += (y - agent.pos.y) * Math.min(1, step * 6);

    return speedMul;
  }

  private fearRadius(profile: FaunaSpeciesProfile): number {
    switch (profile.behavior) {
      case 'grazer':
        return 16;   // zebra & gazelle paling penakut
      case 'browser':
        return 10;   // jerapah waspada tapi tenang
      case 'waterbird':
        return 9;    // flaminggo kagetan
      case 'waterbuffalo':
        return 7;    // kerbau berani, jarang mundur
      case 'megafauna':
        return 5;    // gajah hampir tidak takut
      default:
        return 0;
    }
  }

  /* ================= Behavior State Machine ================= */

  private chooseState(
    agent: FaunaAgent,
    profile: FaunaSpeciesProfile,
    timeOfDay: number,
    isSelected: boolean
  ) {
    const r = Math.random();

    const isNight = timeOfDay < 5.5 || timeOfDay >= 19.2;
    const isDawnDusk =
      (timeOfDay >= 5.5 && timeOfDay < 8.5) ||
      (timeOfDay >= 16.5 && timeOfDay < 19.2);

    let state: FaunaAgentState = 'idle';

    if (profile.behavior === 'predator') {
      const huntTime = isNight || isDawnDusk;
      const prey = huntTime ? this.nearestPrey(agent, 26) : null;

      if (prey && r < 0.35) {
        state = 'stalk';
      } else if (huntTime) {
        if (r < 0.3) state = 'rest';
        else if (r < 0.68) state = 'wander';
        else state = 'patrol';
      } else {
        if (r < 0.68) state = 'rest';
        else if (r < 0.9) state = 'wander';
        else state = 'patrol';
      }
    } else if (profile.behavior === 'waterbird') {
      if (isNight) {
        if (r < 0.65) state = 'rest';
        else state = 'idle';
      } else {
        if (r < 0.25) state = 'idle';
        else if (r < 0.65) state = 'wander';
        else state = 'drink';
      }
    } else if (profile.behavior === 'waterbuffalo') {
      if (isNight) {
        if (r < 0.55) state = 'rest';
        else state = 'idle';
      } else {
        if (r < 0.28) state = 'wander';
        else if (r < 0.58) state = 'graze';
        else state = 'drink';
      }
    } else {
      // grazer / browser / megafauna
      if (isNight) {
        if (r < 0.5) state = 'rest';
        else if (r < 0.8) state = 'idle';
        else state = 'wander';
      } else {
        if (r < 0.2) state = 'idle';
        else if (r < 0.56) state = 'graze';
        else if (r < 0.84) state = 'wander';
        else state = 'drink';
      }
    }

    agent.state = state;
    agent.timer = this.stateDuration(state, profile, isSelected);

    this.chooseTarget(agent, profile, state);
  }

  private stateDuration(
    state: FaunaAgentState,
    profile: FaunaSpeciesProfile,
    isSelected: boolean
  ): number {
    const boost = isSelected ? 0.85 : 1.0;

    switch (state) {
      case 'rest':
        return (4 + Math.random() * 8) * boost;
      case 'idle':
        return (1.5 + Math.random() * 3) * boost;
      case 'graze':
        return (3 + Math.random() * 5) * boost;
      case 'drink':
        return (2 + Math.random() * 4) * boost;
      case 'patrol':
        return (4 + Math.random() * 6) * boost;
      case 'stalk':
        return (5 + Math.random() * 5) * boost;
      case 'chase':
        return (1.5 + Math.random() * 1.5) * boost;
      case 'wander':
      default:
        return (2 + Math.random() * 5) * boost;
    }
  }

  private stateSpeed(state: FaunaAgentState, isSelected: boolean): number {
    const boost = isSelected ? 1.15 : 1.0;

    switch (state) {
      case 'wander':
        return 1.0 * boost;
      case 'patrol':
        return 1.25 * boost;
      case 'graze':
        return 0.3 * boost;
      case 'drink':
        return 0.55 * boost;
      case 'flee':
        return 2.1 * boost;
      case 'stalk':
        return 0.18 * boost;
      case 'chase':
        return 2.6 * boost;
      case 'idle':
      case 'rest':
      default:
        return 0;
    }
  }

  /* ================= Target / Navigation ================= */

  private chooseTarget(
    agent: FaunaAgent,
    profile: FaunaSpeciesProfile,
    state: FaunaAgentState
  ) {
    if (state === 'idle' || state === 'rest') {
      agent.target.copy(agent.pos);
      return;
    }

    if (state === 'stalk' || state === 'chase') {
      const prey = this.nearestPrey(agent, 40);
      if (prey) {
        agent.target.copy(prey.pos);
        return;
      }
    }

    const radius =
      state === 'patrol' ? profile.radius * 1.25 : profile.radius;

    const point = this.findPoint(agent, profile, state, radius);
    const y = this.groundY(point.x, point.z, profile);

    agent.target.set(point.x, y, point.z);
  }

  private findPoint(
    agent: FaunaAgent,
    profile: FaunaSpeciesProfile,
    state: FaunaAgentState,
    radius: number
  ): { x: number; z: number } {
    for (let i = 0; i < 16; i++) {
      let x = agent.homeX;
      let z = agent.homeZ;

      if (state === 'drink') {
        const a = Math.random() * Math.PI * 2;
        const rr = WATER_R + 1.45 + Math.random() * 3.0;

        x = WX + Math.cos(a) * rr;
        z = WZ + Math.sin(a) * rr;
      } else if (state === 'graze') {
        const a = Math.random() * Math.PI * 2;
        const r = 1 + Math.random() * 3.5;

        x = agent.pos.x + Math.cos(a) * r;
        z = agent.pos.z + Math.sin(a) * r;
      } else if (profile.waterAffinity > 0.6 && Math.random() < 0.7) {
        const a = Math.random() * Math.PI * 2;
        const rr = WATER_R + Math.random() * 4.5;

        x = WX + Math.cos(a) * rr;
        z = WZ + Math.sin(a) * rr;
      } else {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * radius;

        x = agent.homeX + Math.cos(a) * r;
        z = agent.homeZ + Math.sin(a) * r;
      }

      if (this.isValidPoint(x, z, profile)) {
        return { x, z };
      }
    }

    if (profile.waterAffinity >= 0.95) {
      for (let i = 0; i < 8; i++) {
        const a = Math.random() * Math.PI * 2;
        const rr = WATER_R + 0.8 + Math.random() * 1.2;
        const x = WX + Math.cos(a) * rr;
        const z = WZ + Math.sin(a) * rr;
        if (this.isValidPoint(x, z, profile)) return { x, z };
      }
    }

    return {
      x: agent.homeX,
      z: agent.homeZ,
    };
  }

  private isValidPoint(
    x: number,
    z: number,
    profile: FaunaSpeciesProfile
  ): boolean {
    const dWater = Math.hypot(x - WX, z - WZ);
    const h = terrainH(x, z);

    // Flaminggo: hanya di dangkalan dalam kolam
    if (profile.waterAffinity >= 0.95) {
      return (
        dWater < WATER_R + 2 &&
        h > WATER_LEVEL - 0.7 &&
        h < WATER_LEVEL + 1.2
      );
    }

    // Kerbau: tepi kolam + kubangan dangkal
    if (profile.waterAffinity >= 0.6) {
      return dWater < WATER_R + 6 && h > WATER_LEVEL - 0.4;
    }

    // Hewan darat: jangan masuk air
    if (dWater < WATER_R + 1.25) return false;
    if (h < WATER_LEVEL + 0.18) return false;

    return true;
  }

  private groundY(
    x: number,
    z: number,
    profile: FaunaSpeciesProfile
  ): number {
    const h = terrainH(x, z);

    if (profile.waterAffinity >= 0.95) {
      return Math.max(h, WATER_LEVEL - 0.25);
    }

    if (profile.waterAffinity >= 0.6) {
      return Math.max(h, WATER_LEVEL - 0.3);
    }

    return Math.max(h, WATER_LEVEL + 0.12);
  }

  private updateRig(
    rig: AnimalRig,
    agent: FaunaAgent,
    speedMul: number,
    dt: number
  ) {
    rig.group.position.copy(agent.pos);
    rig.group.rotation.y = agent.heading;
    rig.group.scale.setScalar(agent.variance);

    const moving = speedMul > 0.05;

    if (moving) {
      rig.walkPhase += dt * (3.5 + agent.speed * speedMul * 2.0);
    }

    // Walk cycle kaki
    let amp = 0;
    if (moving) {
      if (agent.state === 'stalk') amp = 0.18;        // langkah mengendap
      else if (agent.state === 'chase') amp = 0.7;    // sprint penuh
      else if (agent.state === 'flee') amp = 0.65;    // panik
      else amp = speedMul < 0.6 ? 0.25 : 0.55;
    }

    for (const leg of rig.legs) {
      const target = Math.sin(rig.walkPhase + leg.phase) * amp;
      leg.pivot.rotation.x += (target - leg.pivot.rotation.x) * 0.35;
    }

    // Kepala menunduk saat graze / drink
    const wantDown =
      agent.state === 'graze' || agent.state === 'drink'
        ? 1
        : agent.state === 'stalk'
          ? 0.55   // kepala rendah saat mengintai
          : 0;

    rig.headMix += (wantDown - rig.headMix) * Math.min(1, dt * 3);

    const downAmt = rig.type === 'bird' ? 1.5 : 0.85;
    rig.headPivot.rotation.x = rig.baseHeadRot + rig.headMix * downAmt;

    // Body bob saat jalan
    const bobAmp = agent.state === 'flee' || agent.state === 'chase' ? 0.12 : 0.06;
    const bob = moving ? Math.abs(Math.sin(rig.walkPhase)) * bobAmp : 0;
    rig.bodyPivot.position.y = rig.baseY + bob;

    // Ekor
    if (rig.tailPivot) {
      rig.tailPivot.rotation.y = Math.sin(rig.walkPhase * 0.6) * 0.25;
    }
  }

  /* ================= Dispose ================= */

  public dispose() {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
        obj.geometry.dispose();

        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m: any) => {
          if (m.map) m.map.dispose();
          m.dispose();
        });
      }
    });
  }
}
