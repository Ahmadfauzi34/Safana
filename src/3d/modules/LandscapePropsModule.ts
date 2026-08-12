import * as THREE from 'three';
import {
  validSpot,
  terrainH,
  SAVANNAH_CONSTANTS,
} from '../../utils/noise';

export class LandscapePropsModule {
  public group: THREE.Group;
  public rockMesh: THREE.InstancedMesh | null = null;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'LandscapePropsGroup';
    this.initRocks();
    this.initTermiteMounds();
    this.initFallenLogs();
  }

  /* ------------------- Rocks ------------------- */
  private initRocks() {
    const geo = new THREE.DodecahedronGeometry(0.65, 0);
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
    const COUNT = 42;

    this.rockMesh = new THREE.InstancedMesh(geo, mat, COUNT);
    this.rockMesh.name = 'SavannahRocks';
    this.rockMesh.castShadow = true;
    this.rockMesh.receiveShadow = true;

    const dummy = new THREE.Object3D();
    const cT = new THREE.Color();
    const { WX, WZ, WATER_R, WATER_LEVEL } = SAVANNAH_CONSTANTS;

    let placed = 0;
    let tries = 0;

    while (placed < COUNT && tries < 500) {
      tries++;
      let x = (Math.random() * 2 - 1) * 108;
      let z = (Math.random() * 2 - 1) * 108;

      if (placed < 10) {
        const a = Math.random() * 6.28;
        const rr = WATER_R + 1.2 + Math.random() * 2.5;
        x = WX + Math.cos(a) * rr;
        z = WZ + Math.sin(a) * rr;
      }

      let h = terrainH(x, z);
      if (h < WATER_LEVEL - 0.6) h = WATER_LEVEL - 0.6;

      dummy.position.set(x, h + 0.1, z);
      dummy.rotation.set(
        Math.random() * 3,
        Math.random() * 3,
        Math.random() * 3
      );
      const s = 0.35 + Math.random() * 1.25;
      dummy.scale.set(
        s * (0.8 + Math.random() * 0.5),
        s * (0.6 + Math.random() * 0.5),
        s * (0.8 + Math.random() * 0.5)
      );
      dummy.updateMatrix();

      this.rockMesh.setMatrixAt(placed, dummy.matrix);
      cT.setHex(0x9a8f7c).offsetHSL(
        (Math.random() - 0.5) * 0.03,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.12
      );
      this.rockMesh.setColorAt(placed, cT);
      placed++;
    }

    this.rockMesh.count = placed;
    this.rockMesh.instanceMatrix.needsUpdate = true;
    if (this.rockMesh.instanceColor) this.rockMesh.instanceColor.needsUpdate = true;
    this.rockMesh.computeBoundingSphere();

    this.group.add(this.rockMesh);
  }

  /* ------------------- Termite Mounds ------------------- */
  private initTermiteMounds() {
    const grp = new THREE.Group();
    grp.name = 'TermiteMounds';
    const mMat = new THREE.MeshLambertMaterial({ color: 0x8a6a48, flatShading: true });

    for (let i = 0; i < 8; i++) {
      const x = (Math.random() * 2 - 1) * 95;
      const z = (Math.random() * 2 - 1) * 95;
      const h = validSpot(x, z, 6, 0.3);
      if (h === null) {
        i--;
        continue;
      }
      const m = new THREE.Mesh(
        new THREE.ConeGeometry(0.45 + Math.random() * 0.3, 1.2 + Math.random() * 0.9, 7),
        mMat
      );
      m.position.set(x, h + 0.5, z);
      m.rotation.y = Math.random() * 3;
      m.castShadow = true;
      grp.add(m);
    }
    this.group.add(grp);
  }

  /* ------------------- Fallen Logs ------------------- */
  private initFallenLogs() {
    const grp = new THREE.Group();
    grp.name = 'FallenLogs';
    const lMat = new THREE.MeshLambertMaterial({ color: 0x6e4f33, flatShading: true });

    for (let i = 0; i < 5; i++) {
      const x = (Math.random() * 2 - 1) * 90;
      const z = (Math.random() * 2 - 1) * 90;
      const h = validSpot(x, z, 6, 0.3);
      if (h === null) {
        i--;
        continue;
      }
      const l = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.27, 2.6 + Math.random() * 1.4, 7),
        lMat
      );
      l.rotation.z = Math.PI / 2;
      l.rotation.y = Math.random() * Math.PI;
      l.position.set(x, h + 0.15, z);
      l.castShadow = true;
      grp.add(l);
    }
    this.group.add(grp);
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
