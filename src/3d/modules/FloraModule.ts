import * as THREE from 'three';
import {
  validSpot,
  pathDist,
  terrainH,
  fbm,
  rnd2,
  clamp,
  SAVANNAH_CONSTANTS,
} from '../../utils/noise';

export interface TreeData {
  group: THREE.Group;
  canopy: THREE.Mesh;
  phase: number;
}

export class FloraModule {
  public group: THREE.Group;
  public treeAnimList: TreeData[] = [];
  public grassMesh: THREE.InstancedMesh | null = null;
  public flowerMesh: THREE.InstancedMesh | null = null;
  public bushMesh: THREE.InstancedMesh | null = null;
  public reedMesh: THREE.InstancedMesh | null = null;

  public uTimeWind = { value: 0 };
  public uWindSpeed = { value: 1.0 };

  private grassMat: THREE.MeshLambertMaterial | null = null;
  public treeSpots: { x: number; z: number; h: number }[] = [];

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'FloraGroup';
    this.initTrees();
    this.initDeadTrees();
    this.initGrass();
    this.initFlowers();
    this.initBushes();
    this.initReeds();
  }

  /* ------------------- Acacia Trees ------------------- */
  private initTrees() {
    const trunkGeo = new THREE.CylinderGeometry(0.16, 0.34, 3, 6);
    trunkGeo.translate(0, 1.5, 0);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2e, flatShading: true });

    const canopyBase = new THREE.SphereGeometry(1, 9, 7);
    const pos = canopyBase.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setXYZ(
        i,
        pos.getX(i) + (rnd2(i, 1) - 0.5) * 0.22,
        pos.getY(i) + (rnd2(i, 2) - 0.5) * 0.18,
        pos.getZ(i) + (rnd2(i, 3) - 0.5) * 0.22
      );
    }
    canopyBase.computeVertexNormals();

    const canopyMats = [0x5c6e33, 0x6b7a3c, 0x51662f, 0x75824a].map(
      (c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true })
    );

    let attempts = 0;
    while (this.treeSpots.length < 28 && attempts < 900) {
      attempts++;
      const x = (Math.random() * 2 - 1) * 92;
      const z = (Math.random() * 2 - 1) * 92;
      if (pathDist(x, z) < 5) continue;
      const h = validSpot(x, z, 7, 0.3);
      if (h === null) continue;
      let ok = true;
      for (const t of this.treeSpots) {
        if (Math.hypot(x - t.x, z - t.z) < 9) {
          ok = false;
          break;
        }
      }
      if (ok) this.treeSpots.push({ x, z, h });
    }

    const treesGroup = new THREE.Group();
    treesGroup.name = 'AcaciaTrees';

    for (const t of this.treeSpots) {
      const treeGrp = new THREE.Group();
      treeGrp.position.set(t.x, t.h - 0.1, t.z);
      treeGrp.rotation.z = (Math.random() - 0.5) * 0.12;
      treeGrp.rotation.x = (Math.random() - 0.5) * 0.12;

      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.castShadow = true;
      treeGrp.add(trunk);

      const r = 2.2 + Math.random() * 1.3;
      const mat = canopyMats[Math.floor(Math.random() * canopyMats.length)];
      const canopy = new THREE.Mesh(canopyBase, mat);
      canopy.scale.set(r, r * 0.33, r);
      canopy.position.y = 3.0 + r * 0.22;
      canopy.castShadow = true;
      treeGrp.add(canopy);

      if (Math.random() < 0.5) {
        const mat2 = canopyMats[Math.floor(Math.random() * canopyMats.length)];
        const c2 = new THREE.Mesh(canopyBase, mat2);
        c2.scale.set(r * 0.55, r * 0.17, r * 0.55);
        c2.position.y = 3.0 + r * 0.45;
        c2.castShadow = true;
        treeGrp.add(c2);
      }

      treesGroup.add(treeGrp);
      this.treeAnimList.push({ canopy, group: treeGrp, phase: Math.random() * 6.28 });
    }

    this.group.add(treesGroup);
  }

  /* ------------------- Dead Silhouette Trees ------------------- */
  private initDeadTrees() {
    const deadGrp = new THREE.Group();
    deadGrp.name = 'DeadTrees';
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5a3a, flatShading: true });

    for (let i = 0; i < 5; i++) {
      const x = (Math.random() * 2 - 1) * 88;
      const z = (Math.random() * 2 - 1) * 88;
      const h = validSpot(x, z, 7, 0.4);
      if (h === null) {
        i--;
        continue;
      }
      const grp = new THREE.Group();
      grp.position.set(x, h, z);
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.24, 3.4, 5), trunkMat);
      tr.position.y = 1.7;
      tr.castShadow = true;
      grp.add(tr);

      for (let b = 0; b < 3; b++) {
        const br = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.08, 1.5, 4), trunkMat);
        br.position.y = 3 + b * 0.3;
        br.rotation.z = (Math.random() - 0.5) * 1.4;
        br.rotation.x = (Math.random() - 0.5) * 1.4;
        br.castShadow = true;
        grp.add(br);
      }
      grp.rotation.z = (Math.random() - 0.5) * 0.2;
      deadGrp.add(grp);
    }
    this.group.add(deadGrp);
  }

  /* ------------------- Grass Tufts ------------------- */
  private makeTuftGeo(blades: number): THREE.BufferGeometry {
    const pa: number[] = [];
    const ca: number[] = [];

    for (let b = 0; b < blades; b++) {
      const a = (b / blades) * Math.PI * 2 + Math.random() * 0.8;
      const rad = 0.04 + Math.random() * 0.1;
      const h = 0.55 + Math.random() * 0.55;
      const w = 0.05 + Math.random() * 0.05;
      const lean = 0.15 + Math.random() * 0.35;

      const bx = Math.cos(a) * rad;
      const bz = Math.sin(a) * rad;
      const tx = bx + Math.cos(a) * lean + (Math.random() - 0.5) * 0.1;
      const tz = bz + Math.sin(a) * lean + (Math.random() - 0.5) * 0.1;

      const px = -Math.sin(a) * w;
      const pz = Math.cos(a) * w;

      pa.push(bx - px, 0, bz - pz, bx + px, 0, bz + pz, tx, h, tz);
      ca.push(0.5, 0.48, 0.35, 0.5, 0.48, 0.35, 1.05, 1.02, 0.85);
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pa, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(ca, 3));
    return g;
  }

  private initGrass() {
    this.grassMat = new THREE.MeshLambertMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      flatShading: true,
    });

    this.grassMat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = this.uTimeWind;
      sh.uniforms.uWind = this.uWindSpeed;
      sh.vertexShader =
        'uniform float uTime;\nuniform float uWind;\n' +
        sh.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           #ifdef USE_INSTANCING
             float ph = instanceMatrix[3][0] * 0.35 + instanceMatrix[3][2] * 0.27;
             float sw = sin(uTime * 1.8 + ph) + 0.5 * sin(uTime * 2.7 + ph * 1.7);
             float amt = position.y * uWind * 0.12;
             transformed.x += sw * amt;
             transformed.z += cos(uTime * 1.4 + ph) * amt * 0.7;
           #endif`
        );
    };

    const GRASS_COUNT = 3200;
    this.grassMesh = new THREE.InstancedMesh(this.makeTuftGeo(7), this.grassMat, GRASS_COUNT);
    this.grassMesh.name = 'GrassTufts';
    this.grassMesh.receiveShadow = false;

    const dummy = new THREE.Object3D();
    const G_A = new THREE.Color(0xc7a54c);
    const G_B = new THREE.Color(0x87984c);
    const cT = new THREE.Color();

    let placed = 0;
    let tries = 0;

    while (placed < GRASS_COUNT && tries < GRASS_COUNT * 8) {
      tries++;
      const x = (Math.random() * 2 - 1) * 112;
      const z = (Math.random() * 2 - 1) * 112;
      const pd = pathDist(x, z);
      if (pd < 1.4) continue;
      if (pd < 3.4 && Math.random() < 0.65) continue;

      const h = validSpot(x, z, 0.8, 0.12);
      if (h === null) continue;

      dummy.position.set(x, h - 0.02, z);
      dummy.rotation.y = Math.random() * Math.PI;
      const s = 0.7 + Math.random() * 1.2;
      dummy.scale.set(s, s * (0.8 + Math.random() * 0.8), s);
      dummy.updateMatrix();

      this.grassMesh.setMatrixAt(placed, dummy.matrix);

      const moist = fbm(x * 0.045 + 11.3, z * 0.045 + 5.9, 4);
      cT.copy(G_A).lerp(G_B, clamp(moist * 1.3 - 0.2, 0, 1));
      cT.offsetHSL(
        (Math.random() - 0.5) * 0.03,
        (Math.random() - 0.5) * 0.08,
        (Math.random() - 0.5) * 0.08
      );
      this.grassMesh.setColorAt(placed, cT);
      placed++;
    }

    this.grassMesh.count = placed;
    this.grassMesh.instanceMatrix.needsUpdate = true;
    if (this.grassMesh.instanceColor) this.grassMesh.instanceColor.needsUpdate = true;
    this.grassMesh.computeBoundingSphere();

    this.group.add(this.grassMesh);
  }

  /* ------------------- Wild Flowers ------------------- */
  private initFlowers() {
    const fGeo = new THREE.CircleGeometry(0.12, 6);
    fGeo.rotateX(-Math.PI / 2);
    const fMat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      flatShading: true,
    });

    const COUNT = 280;
    this.flowerMesh = new THREE.InstancedMesh(fGeo, fMat, COUNT);
    this.flowerMesh.name = 'WildFlowers';

    const dummy = new THREE.Object3D();
    const palette = [0xe8c33f, 0xd97742, 0xc96a8a, 0xf0ead2, 0xb46aa8];
    const cT = new THREE.Color();

    let placed = 0;
    let tries = 0;

    while (placed < COUNT && tries < 2500) {
      tries++;
      const x = (Math.random() * 2 - 1) * 105;
      const z = (Math.random() * 2 - 1) * 105;
      const h = validSpot(x, z, 1.2, 0.2);
      if (h === null) continue;
      if (pathDist(x, z) < 2.6) continue;

      dummy.position.set(x, h + 0.08 + Math.random() * 0.1, z);
      dummy.rotation.set(0, Math.random() * Math.PI, 0);
      const s = 0.7 + Math.random() * 0.9;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();

      this.flowerMesh.setMatrixAt(placed, dummy.matrix);
      cT.setHex(palette[Math.floor(Math.random() * palette.length)]);
      this.flowerMesh.setColorAt(placed, cT);
      placed++;
    }

    this.flowerMesh.count = placed;
    this.flowerMesh.instanceMatrix.needsUpdate = true;
    if (this.flowerMesh.instanceColor) this.flowerMesh.instanceColor.needsUpdate = true;
    this.flowerMesh.computeBoundingSphere();

    this.group.add(this.flowerMesh);
  }

  /* ------------------- Bushes ------------------- */
  private initBushes() {
    const geo = new THREE.IcosahedronGeometry(0.85, 1);
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
    const COUNT = 48;

    this.bushMesh = new THREE.InstancedMesh(geo, mat, COUNT);
    this.bushMesh.name = 'SavannahBushes';
    this.bushMesh.castShadow = true;
    this.bushMesh.receiveShadow = true;

    const dummy = new THREE.Object3D();
    const cT = new THREE.Color();

    let placed = 0;
    let tries = 0;

    while (placed < COUNT && tries < 500) {
      tries++;
      const x = (Math.random() * 2 - 1) * 105;
      const z = (Math.random() * 2 - 1) * 105;
      const h = validSpot(x, z, 1.6, 0.2);
      if (h === null) continue;

      dummy.position.set(x, h + 0.25, z);
      dummy.rotation.y = Math.random() * Math.PI;
      const s = 0.7 + Math.random() * 0.9;
      dummy.scale.set(s * 1.2, s * 0.7, s * 1.2);
      dummy.updateMatrix();

      this.bushMesh.setMatrixAt(placed, dummy.matrix);
      cT.setHex(0x77804a).offsetHSL(
        (Math.random() - 0.5) * 0.04,
        (Math.random() - 0.5) * 0.15,
        (Math.random() - 0.5) * 0.1 - 0.03
      );
      this.bushMesh.setColorAt(placed, cT);
      placed++;
    }

    this.bushMesh.count = placed;
    this.bushMesh.instanceMatrix.needsUpdate = true;
    if (this.bushMesh.instanceColor) this.bushMesh.instanceColor.needsUpdate = true;
    this.bushMesh.computeBoundingSphere();

    this.group.add(this.bushMesh);
  }

  /* ------------------- Reeds ------------------- */
  private initReeds() {
    const geo = new THREE.ConeGeometry(0.07, 1.5, 4).translate(0, 0.75, 0);
    const mat = new THREE.MeshLambertMaterial({ color: 0x6d7f3f, flatShading: true });
    const COUNT = 60;

    this.reedMesh = new THREE.InstancedMesh(geo, mat, COUNT);
    this.reedMesh.name = 'WaterReeds';

    const dummy = new THREE.Object3D();
    const { WX, WZ, WATER_R, WATER_LEVEL } = SAVANNAH_CONSTANTS;

    let placed = 0;
    let tries = 0;

    while (placed < COUNT && tries < 400) {
      tries++;
      const a = Math.random() * 6.28;
      const rr = WATER_R + 0.4 + Math.random() * 2.4;
      const x = WX + Math.cos(a) * rr;
      const z = WZ + Math.sin(a) * rr;
      const h = terrainH(x, z);

      if (h < WATER_LEVEL + 0.02 || h > WATER_LEVEL + 1.3) continue;

      dummy.position.set(x, h, z);
      dummy.rotation.set(
        (Math.random() - 0.5) * 0.3,
        Math.random() * Math.PI,
        (Math.random() - 0.5) * 0.3
      );
      const s = 0.7 + Math.random() * 0.9;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();

      this.reedMesh.setMatrixAt(placed, dummy.matrix);
      placed++;
    }

    this.reedMesh.count = placed;
    this.reedMesh.instanceMatrix.needsUpdate = true;
    this.reedMesh.computeBoundingSphere();

    this.group.add(this.reedMesh);
  }

  public update(time: number, windMultiplier: number, wetness: number) {
    this.uTimeWind.value = time;
    this.uWindSpeed.value = windMultiplier;

    // Tree sway animation
    for (const ta of this.treeAnimList) {
      ta.canopy.rotation.z = Math.sin(time * 0.9 + ta.phase) * 0.03 * windMultiplier;
    }

    // Grass wetness darkening
    if (this.grassMat) {
      this.grassMat.color.setScalar(1 - wetness * 0.18);
    }
  }

  public setLayerVisibility(layer: string, visible: boolean) {
    this.group.traverse((child) => {
      if (child.name.toLowerCase().includes(layer.toLowerCase())) {
        child.visible = visible;
      }
    });
  }

  public dispose() {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    });
  }
}
