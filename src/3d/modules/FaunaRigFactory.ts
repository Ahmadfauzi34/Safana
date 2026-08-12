import * as THREE from 'three';
import { createAnimalPatternTexture } from '../../utils/textures';

export interface AnimalRig {
  group: THREE.Group;
  bodyPivot: THREE.Group;
  headPivot: THREE.Group;
  tailPivot: THREE.Group | null;
  legs: { pivot: THREE.Group; phase: number }[];
  walkPhase: number;
  headMix: number;
  baseHeadRot: number;
  baseY: number;
  type: 'quad' | 'bird';
}

interface Look {
  type: 'quad' | 'bird';
  body: string;
  leg: string;
  accent: string;
  bodyR: number;
  bodyLen: number;
  legH: number;
  neckLen: number;
  headR: number;
  feature?: 'horns' | 'mane' | 'trunk' | 'ossicones';
}

const LOOKS: Record<string, Look> = {
  antelop: { type: 'quad', body: '#ffffff', leg: '#B89B74', accent: '#FDFBF7', bodyR: 0.3, bodyLen: 0.8, legH: 0.8, neckLen: 0.5, headR: 0.16, feature: 'horns' },
  zebra: { type: 'quad', body: '#ffffff', leg: '#7A7570', accent: '#FDFBF7', bodyR: 0.34, bodyLen: 0.9, legH: 0.8, neckLen: 0.45, headR: 0.18, feature: 'mane' },
  jerapah: { type: 'quad', body: '#ffffff', leg: '#F2E1BC', accent: '#3A2413', bodyR: 0.38, bodyLen: 0.9, legH: 1.5, neckLen: 1.4, headR: 0.16, feature: 'ossicones' },
  'g ajah': { type: 'quad', body: '#ffffff', leg: '#9AA0A8', accent: '#D9B3B0', bodyR: 0.8, bodyLen: 1.4, legH: 1.2, neckLen: 0.5, headR: 0.5, feature: 'trunk' },
  singa: { type: 'quad', body: '#ffffff', leg: '#C49A6C', accent: '#D98C55', bodyR: 0.35, bodyLen: 0.95, legH: 0.7, neckLen: 0.35, headR: 0.22, feature: 'mane' },
  cheetah: { type: 'quad', body: '#ffffff', leg: '#D4C085', accent: '#F2E2A5', bodyR: 0.3, bodyLen: 1.0, legH: 0.75, neckLen: 0.4, headR: 0.18 },
  kerbau: { type: 'quad', body: '#ffffff', leg: '#5A554D', accent: '#E3DAC9', bodyR: 0.5, bodyLen: 1.1, legH: 0.9, neckLen: 0.4, headR: 0.3, feature: 'horns' },
  flaminggo: { type: 'bird', body: '#ffffff', leg: '#E8878F', accent: '#FAD4E0', bodyR: 0.28, bodyLen: 0.5, legH: 0.8, neckLen: 0.6, headR: 0.12 },
};

const DEFAULT_LOOK = LOOKS.antelop;

const m = (color: string) => new THREE.MeshLambertMaterial({ color });

export function buildAnimalRig(speciesId: string): AnimalRig {
  const look = LOOKS[speciesId] ?? DEFAULT_LOOK;

  const group = new THREE.Group();
  group.name = `HeroAnimal_${speciesId.replace(/\s+/g, '-')}`;

  const bodyPivot = new THREE.Group();
  group.add(bodyPivot);

  const bodyTex = createAnimalPatternTexture(speciesId);
  const mBody = new THREE.MeshStandardMaterial({ 
    map: bodyTex, 
    roughness: 0.85, 
    metalness: 0.0,
    color: 0xffffff,
    flatShading: true 
  });
  const mLeg = new THREE.MeshStandardMaterial({ color: look.leg, roughness: 0.9, metalness: 0.0, flatShading: true });
  const mAcc = new THREE.MeshStandardMaterial({ color: look.accent, roughness: 0.9, metalness: 0.0, flatShading: true });

  const legs: { pivot: THREE.Group; phase: number }[] = [];
  let tailPivot: THREE.Group | null = null;
  let headPivot: THREE.Group;

  bodyPivot.position.y = look.legH;

  if (look.type === 'quad') {
    /* ---------- BODY ---------- */
    const bodyGeo = new THREE.CapsuleGeometry(look.bodyR, look.bodyLen, 2, 6);
    bodyGeo.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(bodyGeo, mBody);
    body.position.y = look.bodyR * 0.4;
    body.castShadow = true;
    bodyPivot.add(body);

    /* ---------- LEGS ---------- */
    const legGeo = new THREE.BoxGeometry(look.bodyR * 0.35, look.legH, look.bodyR * 0.35);
    legGeo.translate(0, -look.legH / 2, 0);

    const lx = look.bodyR * 0.55;
    const lz = look.bodyLen * 0.42;
    const offs: [number, number, number][] = [
      [lx, lz, 0],
      [-lx, lz, Math.PI],
      [lx, -lz, Math.PI],
      [-lx, -lz, 0],
    ];

    for (const [x, z, phase] of offs) {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0, z);
      pivot.add(new THREE.Mesh(legGeo, mLeg));
      bodyPivot.add(pivot);
      legs.push({ pivot, phase });
    }

    /* ---------- TAIL ---------- */
    tailPivot = new THREE.Group();
    tailPivot.position.set(0, look.bodyR * 0.3, -(look.bodyLen * 0.5 + look.bodyR * 0.8));
    const tail = new THREE.Mesh(
      new THREE.ConeGeometry(look.bodyR * 0.18, look.bodyR * 1.6, 4),
      mLeg
    );
    tail.rotation.x = Math.PI - 0.4;
    tailPivot.add(tail);
    bodyPivot.add(tailPivot);

    /* ---------- NECK + HEAD ---------- */
    headPivot = new THREE.Group();
    headPivot.position.set(0, look.bodyR * 0.45, look.bodyLen * 0.5 + look.bodyR * 0.4);

    const neck = new THREE.Mesh(
      new THREE.BoxGeometry(look.bodyR * 0.4, look.neckLen, look.bodyR * 0.4),
      mBody
    );
    neck.position.y = look.neckLen / 2;
    headPivot.add(neck);

    const head = new THREE.Mesh(
      new THREE.BoxGeometry(look.headR * 1.1, look.headR * 1.1, look.headR * 1.4),
      mBody
    );
    head.position.y = look.neckLen + look.headR * 0.4;
    head.castShadow = true;
    headPivot.add(head);

    const snout = new THREE.Mesh(
      new THREE.BoxGeometry(look.headR * 0.7, look.headR * 0.6, look.headR * 0.9),
      mLeg
    );
    snout.position.set(0, look.neckLen + look.headR * 0.15, look.headR * 1.1);
    headPivot.add(snout);

    /* ---------- SPECIES FEATURE ---------- */
    if (look.feature === 'horns') {
      const hg = new THREE.ConeGeometry(look.headR * 0.25, look.headR * 2.2, 4);
      for (const sx of [1, -1]) {
        const horn = new THREE.Mesh(hg, mAcc);
        horn.position.set(sx * look.headR * 0.5, look.neckLen + look.headR * 1.1, -look.headR * 0.2);
        horn.rotation.z = -sx * 0.35;
        horn.rotation.x = -0.3;
        headPivot.add(horn);
      }
    } else if (look.feature === 'ossicones') {
      const og = new THREE.CylinderGeometry(look.headR * 0.12, look.headR * 0.12, look.headR * 1.2, 4);
      for (const sx of [1, -1]) {
        const o = new THREE.Mesh(og, mAcc);
        o.position.set(sx * look.headR * 0.4, look.neckLen + look.headR * 1.2, 0);
        headPivot.add(o);
      }
    } else if (look.feature === 'mane') {
      const mane = new THREE.Mesh(new THREE.SphereGeometry(look.headR * 1.5, 6, 5), mAcc);
      mane.position.y = look.neckLen * 0.75;
      mane.scale.set(1, 1.3, 1);
      headPivot.add(mane);
    } else if (look.feature === 'trunk') {
      const trunk = new THREE.Mesh(
        new THREE.ConeGeometry(look.headR * 0.35, look.headR * 2.4, 5),
        mLeg
      );
      trunk.rotation.x = Math.PI;
      trunk.position.set(0, look.neckLen + look.headR * 0.1, look.headR * 1.5);
      headPivot.add(trunk);

      const earG = new THREE.ConeGeometry(look.headR * 0.4, look.headR * 0.9, 4);
      for (const sx of [1, -1]) {
        const ear = new THREE.Mesh(earG, mBody);
        ear.position.set(sx * look.headR * 0.9, look.neckLen + look.headR * 0.8, 0);
        ear.rotation.z = sx * 1.2;
        headPivot.add(ear);
      }
    }

    bodyPivot.add(headPivot);
  } else {
    /* ================= BIRD (FLAMINGGO) ================= */
    const bodyGeo = new THREE.SphereGeometry(look.bodyR, 8, 6);
    bodyGeo.scale(1, 0.9, 1.5);
    const body = new THREE.Mesh(bodyGeo, mBody);
    body.castShadow = true;
    bodyPivot.add(body);

    const legGeo = new THREE.CylinderGeometry(0.03, 0.03, look.legH, 4);
    legGeo.translate(0, -look.legH / 2, 0);

    for (const [x, phase] of [[look.bodyR * 0.3, 0], [-look.bodyR * 0.3, Math.PI]]) {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0, 0);
      pivot.add(new THREE.Mesh(legGeo, mLeg));
      bodyPivot.add(pivot);
      legs.push({ pivot, phase });
    }

    tailPivot = new THREE.Group();
    tailPivot.position.set(0, look.bodyR * 0.2, -look.bodyR * 1.4);
    const tail = new THREE.Mesh(
      new THREE.ConeGeometry(look.bodyR * 0.35, look.bodyR * 1.2, 4),
      mAcc
    );
    tail.rotation.x = -Math.PI / 2.4;
    tailPivot.add(tail);
    bodyPivot.add(tailPivot);

    headPivot = new THREE.Group();
    headPivot.position.set(0, look.bodyR * 0.5, look.bodyR * 1.1);

    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.05, look.neckLen, 5),
      mBody
    );
    neck.position.y = look.neckLen / 2;
    headPivot.add(neck);

    const head = new THREE.Mesh(new THREE.SphereGeometry(look.headR, 6, 5), mBody);
    head.position.y = look.neckLen + look.headR * 0.5;
    headPivot.add(head);

    const beak = new THREE.Mesh(
      new THREE.ConeGeometry(look.headR * 0.5, look.headR * 1.6, 4),
      mAcc
    );
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, look.neckLen + look.headR * 0.4, look.headR * 1.4);
    headPivot.add(beak);

    bodyPivot.add(headPivot);
  }

  const baseHeadRot =
    look.type === 'bird'
      ? 0.05
      : look.feature === 'trunk'
        ? 0.4
        : look.neckLen > 1
          ? 0.12
          : 0.32;

  headPivot.rotation.x = baseHeadRot;

  return {
    group,
    bodyPivot,
    headPivot,
    tailPivot,
    legs,
    walkPhase: Math.random() * 6.28,
    headMix: 0,
    baseHeadRot,
    baseY: look.legH,
    type: look.type,
  };
}
