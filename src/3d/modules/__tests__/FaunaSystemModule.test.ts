import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { FaunaSystemModule } from '../FaunaSystemModule';
import { ANIMAL_SPOTS } from '../../../data/animals';
import { SAVANNAH_CONSTANTS } from '../../../utils/noise';

const { WX, WZ, WATER_R, WATER_LEVEL } = SAVANNAH_CONSTANTS;

// Akses pragmatis ke member private untuk unit test.
type Internal = any;

const TOTAL_AGENTS = ANIMAL_SPOTS.reduce((s, a) => s + a.count, 0);

function createModule() {
  return new FaunaSystemModule();
}

function bucketsOf(m: FaunaSystemModule): any[] {
  return (m as Internal).buckets;
}

function profileOf(m: FaunaSystemModule, id: string) {
  const b = bucketsOf(m).find((x: any) => x.spot.id === id);
  return b.profile;
}

/* ================================================================== */
/*  INISIALISASI                                                       */
/* ================================================================== */
describe('FaunaSystemModule — inisialisasi', () => {
  const mod = createModule();
  const buckets = bucketsOf(mod);

  it('membuat satu bucket per spesies', () => {
    expect(buckets.length).toBe(ANIMAL_SPOTS.length);
  });

  it('total agen sesuai data (104)', () => {
    const total = buckets.reduce((s: number, b: any) => s + b.agents.length, 0);
    expect(total).toBe(TOTAL_AGENTS);
  });

  it('setiap agen memiliki rig model 3D mandiri', () => {
    for (const b of buckets) {
      for (const a of b.agents) {
        expect(a.rig).toBeTruthy();
        expect(a.rig.group).toBeInstanceOf(THREE.Group);
      }
    }
  });

  it('predator terdaftar (singa 5 + cheetah 2 = 7)', () => {
    expect((mod as Internal).predatorAgents.length).toBe(7);
  });

  it('posisi awal finite & hewan darat tidak di bawah clamp ground', () => {
    for (const b of buckets) {
      for (const a of b.agents) {
        expect(Number.isFinite(a.pos.x)).toBe(true);
        expect(Number.isFinite(a.pos.y)).toBe(true);
        expect(Number.isFinite(a.pos.z)).toBe(true);

        if (b.profile.waterAffinity < 0.6) {
          expect(a.pos.y).toBeGreaterThanOrEqual(WATER_LEVEL + 0.1);
        }
      }
    }
  });
});

/* ================================================================== */
/*  STATE MACHINE                                                      */
/* ================================================================== */
describe('state machine', () => {
  const mod = createModule();
  const anyMod = mod as Internal;

  const sampleStates = (id: string, time: number, n = 300) => {
    const b = bucketsOf(mod).find((x: any) => x.spot.id === id)!;
    const set = new Set<string>();
    for (let i = 0; i < n; i++) {
      const agent = anyMod.createAgent(b.spot, b.profile);
      anyMod.chooseState(agent, b.profile, time, false);
      set.add(agent.state);
    }
    return set;
  };

  it('predator siang hanya rest / wander / patrol', () => {
    const s = sampleStates('singa', 12);
    for (const st of s) {
      expect(['rest', 'wander', 'patrol']).toContain(st);
    }
  });

  it('grazer siang tidak pernah patrol / flee dari chooseState', () => {
    const s = sampleStates('zebra', 12);
    for (const st of s) {
      expect(['idle', 'wander', 'graze', 'drink', 'rest']).toContain(st);
    }
  });

  it('waterbird siang hanya idle / wander / drink / rest', () => {
    const s = sampleStates('flaminggo', 12);
    for (const st of s) {
      expect(['idle', 'wander', 'drink', 'rest']).toContain(st);
    }
  });

  it('grazer malam mayoritas rest / idle', () => {
    const b = bucketsOf(mod).find((x: any) => x.spot.id === 'zebra')!;
    let calm = 0;
    const n = 300;
    for (let i = 0; i < n; i++) {
      const agent = anyMod.createAgent(b.spot, b.profile);
      anyMod.chooseState(agent, b.profile, 23, false);
      if (agent.state === 'rest' || agent.state === 'idle') calm++;
    }
    expect(calm / n).toBeGreaterThan(0.6);
  });

  it('stateSpeed: flee tercepat, graze lambat, rest/idle nol', () => {
    expect(anyMod.stateSpeed('idle', false)).toBe(0);
    expect(anyMod.stateSpeed('rest', false)).toBe(0);
    expect(anyMod.stateSpeed('flee', false)).toBeGreaterThan(
      anyMod.stateSpeed('wander', false)
    );
    expect(anyMod.stateSpeed('graze', false)).toBeLessThan(
      anyMod.stateSpeed('wander', false)
    );
  });

  it('fearRadius: grazer 16, predator 0', () => {
    expect(anyMod.fearRadius(profileOf(mod, 'zebra'))).toBe(16);
    expect(anyMod.fearRadius(profileOf(mod, 'singa'))).toBe(0);
  });

  it('stateDuration selalu positif untuk semua state', () => {
    const b = bucketsOf(mod)[0];
    for (const st of ['idle', 'wander', 'graze', 'drink', 'rest', 'patrol', 'flee']) {
      expect(anyMod.stateDuration(st, b.profile, false)).toBeGreaterThan(0);
    }
  });
});

/* ================================================================== */
/*  ATURAN AIR & NAVIGASI                                              */
/* ================================================================== */
describe('aturan air & navigasi', () => {
  const mod = createModule();
  const anyMod = mod as Internal;
  const land = profileOf(mod, 'zebra');
  const buffalo = profileOf(mod, 'kerbau');
  const flamingo = profileOf(mod, 'flaminggo');

  it('hewan darat invalid di tengah kolam', () => {
    expect(anyMod.isValidPoint(WX, WZ, land)).toBe(false);
  });

  it('hewan darat punya titik valid di daratan', () => {
    let found = false;
    outer: for (let x = -60; x <= 60; x += 6) {
      for (let z = -60; z <= 60; z += 6) {
        if (anyMod.isValidPoint(x, z, land)) {
          found = true;
          break outer;
        }
      }
    }
    expect(found).toBe(true);
  });

  it('flaminggo invalid di pusat kolam yang dalam', () => {
    expect(anyMod.isValidPoint(WX, WZ, flamingo)).toBe(false);
  });

  it('flaminggo punya titik dangkal valid di ring kolam', () => {
    let found = false;
    outer: for (let r = WATER_R + 0.6; r <= WATER_R + 2.0; r += 0.3) {
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 16) {
        const x = WX + Math.cos(a) * r;
        const z = WZ + Math.sin(a) * r;
        if (anyMod.isValidPoint(x, z, flamingo)) {
          found = true;
          break outer;
        }
      }
    }
    expect(found).toBe(true);
  });

  it('kerbau valid di tepi kolam', () => {
    let found = false;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 16) {
      const x = WX + Math.cos(a) * (WATER_R + 3);
      const z = WZ + Math.sin(a) * (WATER_R + 3);
      if (anyMod.isValidPoint(x, z, buffalo)) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it('groundY clamp sesuai waterAffinity', () => {
    expect(anyMod.groundY(WX, WZ, land)).toBeCloseTo(WATER_LEVEL + 0.12, 5);
    expect(anyMod.groundY(WX, WZ, flamingo)).toBeCloseTo(WATER_LEVEL - 0.25, 5);
    expect(anyMod.groundY(WX, WZ, buffalo)).toBeCloseTo(WATER_LEVEL - 0.3, 5);
  });

  it('findPoint fallback ke home bila semua kandidat invalid', () => {
    const b = bucketsOf(mod).find((x: any) => x.spot.id === 'zebra')!;
    const agent = anyMod.createAgent(b.spot, b.profile);
    agent.homeX = WX;
    agent.homeZ = WZ;

    const p = anyMod.findPoint(agent, land, 'wander', 2);
    expect(p.x).toBe(WX);
    expect(p.z).toBe(WZ);
  });
});

/* ================================================================== */
/*  PERILAKU: FEAR & PERGERAKAN                                        */
/* ================================================================== */
describe('perilaku: fear & pergerakan', () => {
  const mod = createModule();
  const anyMod = mod as Internal;
  const camFar = new THREE.Vector3(1000, 500, 1000);

  it('herbivora masuk flee saat predator aktif mendekat', () => {
    const b = bucketsOf(mod).find((x: any) => x.spot.id === 'antelop')!;
    const agent = b.agents[0];
    const pred = (mod as Internal).predatorAgents[0];

    const savedPos = pred.pos.clone();
    const savedState = pred.state;

    pred.pos.set(agent.pos.x + 5, agent.pos.y, agent.pos.z);
    pred.state = 'patrol'; // predator aktif

    agent.state = 'wander';
    agent.timer = 5;
    agent.acc = 1;

    const sm = anyMod.updateAgent(agent, b.profile, 0.1, camFar, 12, false, b.centroid);

    expect(agent.state).toBe('flee');
    expect(sm).toBeGreaterThan(1.5); // flee harus cepat

    pred.pos.copy(savedPos);
    pred.state = savedState;
  });

  it('agen wander bergerak menuju target', () => {
    const b = bucketsOf(mod).find((x: any) => x.spot.id === 'zebra')!;
    const agent = anyMod.createAgent(b.spot, b.profile);

    agent.state = 'wander';
    agent.timer = 5;
    agent.acc = 1;
    agent.target.set(agent.pos.x + 4, agent.pos.y, agent.pos.z + 4);

    const start = agent.pos.clone();
    anyMod.updateAgent(agent, b.profile, 0.1, camFar, 12, false, b.centroid);

    expect(agent.pos.distanceTo(start)).toBeGreaterThan(0);
    expect(agent.pos.y).toBeGreaterThanOrEqual(WATER_LEVEL + 0.1);
  });

  it('rest / idle tidak bergerak horizontal', () => {
    const b = bucketsOf(mod).find((x: any) => x.spot.id === 'zebra')!;
    const agent = anyMod.createAgent(b.spot, b.profile);

    agent.state = 'rest';
    agent.acc = 1;

    const start = agent.pos.clone();
    const sm = anyMod.updateAgent(agent, b.profile, 0.1, camFar, 12, false, b.centroid);

    expect(sm).toBe(0);
    expect(agent.pos.x).toBe(start.x);
    expect(agent.pos.z).toBe(start.z);
  });
});

/* ================================================================== */
/*  HUNTING & STALKING                                                 */
/* ================================================================== */
describe('predator hunting: stalk & chase', () => {
  const mod = createModule();
  const anyMod = mod as Internal;
  const camFar = new THREE.Vector3(1000, 500, 1000);

  it('stalk lambat (mengendap), chase sangat cepat', () => {
    expect(anyMod.stateSpeed('stalk', false)).toBeLessThan(
      anyMod.stateSpeed('wander', false)
    );
    expect(anyMod.stateSpeed('chase', false)).toBeGreaterThan(
      anyMod.stateSpeed('patrol', false)
    );
  });

  it('nearestPrey mengembalikan mangsa terdekat', () => {
    const pred = (mod as Internal).predatorAgents[0];
    const preyList = (mod as Internal).preyAgents;

    const saved = preyList[0].pos.clone();
    preyList[0].pos.set(pred.pos.x + 3, pred.pos.y, pred.pos.z);

    const found = anyMod.nearestPrey(pred, 10);
    expect(found).toBe(preyList[0]);

    preyList[0].pos.copy(saved);
  });

  it('stalk yang ketahuan dekat → prey flee & predator chase', () => {
    const b = bucketsOf(mod).find((x: any) => x.spot.id === 'antelop')!;
    const agent = b.agents[1];
    const pred = (mod as Internal).predatorAgents[0];

    const sp = pred.pos.clone();
    const ss = pred.state;

    pred.state = 'stalk';
    // 4 < panic radius antelop saat stalk (14 * 0.35 = 4.9)
    pred.pos.set(agent.pos.x + 4, agent.pos.y, agent.pos.z);

    agent.state = 'graze';
    agent.timer = 5;
    agent.acc = 1;

    anyMod.updateAgent(agent, b.profile, 0.1, camFar, 20, false, b.centroid);

    expect(agent.state).toBe('flee');
    expect(pred.state).toBe('chase');

    pred.pos.copy(sp);
    pred.state = ss;
  });

  it('stalk dari jarak jauh TIDAK memicu panic', () => {
    const b = bucketsOf(mod).find((x: any) => x.spot.id === 'zebra')!;
    const agent = anyMod.createAgent(b.spot, b.profile);
    const pred = (mod as Internal).predatorAgents[0];

    const sp = pred.pos.clone();
    const ss = pred.state;

    pred.state = 'stalk';
    // 10 > panic radius stalk zebra (12 * 0.35 = 4.2)
    pred.pos.set(agent.pos.x + 10, agent.pos.y, agent.pos.z);

    agent.state = 'graze';
    agent.timer = 5;
    agent.acc = 1;

    anyMod.updateAgent(agent, b.profile, 0.1, camFar, 20, false, b.centroid);

    expect(agent.state).not.toBe('flee');

    pred.pos.copy(sp);
    pred.state = ss;
  });

  it('stateDuration stalk & chase positif', () => {
    const b = bucketsOf(mod).find((x: any) => x.spot.id === 'singa')!;
    expect(anyMod.stateDuration('stalk', b.profile, false)).toBeGreaterThan(0);
    expect(anyMod.stateDuration('chase', b.profile, false)).toBeGreaterThan(0);
  });
});

/* ================================================================== */
/*  VISIBILITY                                                         */
/* ================================================================== */
describe('visibility', () => {
  it('update tidak berjalan saat group invisible', () => {
    const mod = createModule();
    mod.group.visible = false;

    const b = bucketsOf(mod)[0];
    const before = b.agents[0].pos.clone();

    mod.update(0.5, 0, new THREE.Vector3(0, 10, 0), 12, null);

    expect(b.agents[0].pos.equals(before)).toBe(true);
  });
});

/* ================================================================== */
/*  DISPOSE                                                            */
/* ================================================================== */
describe('dispose', () => {
  it('dispose tidak melempar error', () => {
    const mod = createModule();
    expect(() => mod.dispose()).not.toThrow();
  });
});
