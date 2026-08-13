import * as THREE from 'three';
import {
  validSpot,
  terrainH,
  SAVANNAH_CONSTANTS,
} from '../../utils/noise';

/* ============================================================
   LandscapePropsModule — Detail + Polish ala Story Book
   ------------------------------------------------------------
   DETAIL : boulder ber-cluster + pebble, gundukan rayap dengan
            cerobong satelit, log + tunggul + tutup serat kayu,
            rumput rumpun, semak, lidah buaya berbunga oranye.
   POLES  : seeded RNG (dunia deterministik), palet hangat cerah,
            offset tutup kayu anti z-fighting, dispose aman.
   PERF   : semuanya InstancedMesh → ±12 draw call total.
   ============================================================ */

const WORLD_SEED = 1947; // 🌍 benih dunia — ganti untuk varian layout lain

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const UP = new THREE.Vector3(0, 1, 0);
const FORWARD = new THREE.Vector3(0, 0, 1);

interface InstanceEntry {
  matrix: THREE.Matrix4;
  color: THREE.Color;
}

export class LandscapePropsModule {
  public group: THREE.Group;
  public rockMesh: THREE.InstancedMesh | null = null; // ⬅ backward compat

  private rng: () => number;
  private matFlat: THREE.MeshLambertMaterial;
  private geometries = new Set<THREE.BufferGeometry>();

  constructor() {
    this.rng = mulberry32(WORLD_SEED);
    this.matFlat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      flatShading: true,
    });

    this.group = new THREE.Group();
    this.group.name = 'LandscapePropsGroup';

    this.initRocks();
    this.initTermiteMounds();
    this.initFallenLogs();
    this.initGrassTufts();
    this.initShrubsAndAloes();
  }

  /* ------------------- helpers ------------------- */

  private rand(min: number, max: number): number {
    return min + this.rng() * (max - min);
  }

  /** Jitter HSL kecil supaya tiap instance tidak terlihat seragam */
  private hslJitter(c: THREE.Color, dh: number, ds: number, dl: number): THREE.Color {
    return c.offsetHSL(
      (this.rng() - 0.5) * dh,
      (this.rng() - 0.5) * ds,
      (this.rng() - 0.5) * dl
    );
  }

  /** Bangun InstancedMesh dari daftar entry + registrasi geometrinya */
  private buildInstanced(
    name: string,
    geo: THREE.BufferGeometry,
    entries: InstanceEntry[],
    opts: { cast?: boolean; receive?: boolean } = {}
  ): THREE.InstancedMesh | null {
    this.geometries.add(geo);
    if (entries.length === 0) return null;

    const mesh = new THREE.InstancedMesh(geo, this.matFlat, entries.length);
    entries.forEach((e, i) => {
      mesh.setMatrixAt(i, e.matrix);
      mesh.setColorAt(i, e.color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = opts.cast ?? true;
    mesh.receiveShadow = opts.receive ?? true;
    mesh.name = name;
    mesh.computeBoundingSphere();
    return mesh;
  }

  /** Batu organik: dodecahedron + jitter berbasis posisi (mulus, tanpa crack) */
  private makeRockGeometry(detail: number): THREE.BufferGeometry {
    const geo = new THREE.DodecahedronGeometry(0.65, detail);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const n =
        Math.sin(v.x * 5.1 + v.y * 3.7) +
        Math.sin(v.y * 4.3 + v.z * 5.9) +
        Math.sin(v.z * 6.1 + v.x * 2.9);
      v.multiplyScalar(1 + n * 0.05);
      if (v.y < -0.15) v.y *= 0.6; // pipihkan dasar → batu "duduk" natural
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    return geo;
  }

  /* ------------------- Rocks: boulder cluster + pebble ------------------- */

  private initRocks() {
    const { WX, WZ, WATER_R, WATER_LEVEL } = SAVANNAH_CONSTANTS;
    const boulderGeo = this.makeRockGeometry(1);
    const pebbleGeo = this.makeRockGeometry(0);

    const dummy = new THREE.Object3D();
    const cT = new THREE.Color();
    const boulders: InstanceEntry[] = [];
    const pebbles: InstanceEntry[] = [];

    // 9 cluster; 3 cluster pertama menghiasi tepi kolam (seperti versi asli)
    for (let c = 0; c < 9; c++) {
      let cx = this.rand(-108, 108);
      let cz = this.rand(-108, 108);
      if (c < 3) {
        const a = this.rand(0, Math.PI * 2);
        const rr = WATER_R + 1.2 + this.rand(0, 2.5);
        cx = WX + Math.cos(a) * rr;
        cz = WZ + Math.sin(a) * rr;
      }
      const n = 2 + Math.floor(this.rng() * 3); // 2–4 batu per cluster
      for (let i = 0; i < n; i++) {
        const a = this.rand(0, Math.PI * 2);
        const d = this.rand(0, 1.6);
        const x = cx + Math.cos(a) * d;
        const z = cz + Math.sin(a) * d;
        let h = terrainH(x, z);
        if (h < WATER_LEVEL - 0.6) h = WATER_LEVEL - 0.6;

        dummy.position.set(x, h + 0.05, z);
        dummy.rotation.set(this.rand(0, 3), this.rand(0, 3), this.rand(0, 3));
        const s = this.rand(0.4, 1.5);
        dummy.scale.set(
          s * this.rand(0.8, 1.3),
          s * this.rand(0.6, 1.1),
          s * this.rand(0.8, 1.3)
        );
        dummy.updateMatrix();

        // 🎨 batu pasir hangat, ±25% berlumut
        cT.setHex(this.rng() < 0.25 ? 0xa9b583 : 0xc7b69b);
        this.hslJitter(cT, 0.06, 0.16, 0.2);
        boulders.push({ matrix: dummy.matrix.clone(), color: cT.clone() });
      }
    }

    // Kerikil kecil tersebar
    for (let i = 0; i < 70; i++) {
      const x = this.rand(-110, 110);
      const z = this.rand(-110, 110);
      const h = terrainH(x, z);
      if (h < WATER_LEVEL - 0.4) continue;

      dummy.position.set(x, h + 0.02, z);
      dummy.rotation.set(this.rand(0, 3), this.rand(0, 3), this.rand(0, 3));
      const s = this.rand(0.08, 0.26);
      dummy.scale.set(
        s * this.rand(0.8, 1.4),
        s * this.rand(0.6, 1.0),
        s * this.rand(0.8, 1.4)
      );
      dummy.updateMatrix();

      cT.setHex(0xbfae94);
      this.hslJitter(cT, 0.05, 0.12, 0.18);
      pebbles.push({ matrix: dummy.matrix.clone(), color: cT.clone() });
    }

    const boulderMesh = this.buildInstanced('SavannahBoulders', boulderGeo, boulders);
    const pebbleMesh = this.buildInstanced('SavannahPebbles', pebbleGeo, pebbles);
    if (boulderMesh) this.group.add(boulderMesh);
    if (pebbleMesh) this.group.add(pebbleMesh);
    this.rockMesh = boulderMesh; // API lama tetap valid
  }

  /* ------------------- Termite Mounds: cerobong utama + satelit ------------------- */

  private initTermiteMounds() {
    const mainGeo = new THREE.ConeGeometry(0.55, 1, 7);
    mainGeo.translate(0, 0.5, 0); // basis di y=0 → tinggal taruh di terrain
    const satGeo = new THREE.ConeGeometry(0.34, 1, 6);
    satGeo.translate(0, 0.5, 0);

    const dummy = new THREE.Object3D();
    const cT = new THREE.Color();
    const mains: InstanceEntry[] = [];
    const sats: InstanceEntry[] = [];

    let placed = 0;
    let tries = 0;
    while (placed < 8 && tries < 200) {
      tries++; // ⬅ polish: batasi retry, hindari infinite loop
      const x = this.rand(-95, 95);
      const z = this.rand(-95, 95);
      const h = validSpot(x, z, 6, 0.3);
      if (h === null) continue;

      const sx = this.rand(0.8, 1.35);
      const sy = this.rand(1.4, 2.3);
      dummy.position.set(x, h - 0.05, z);
      dummy.rotation.set(this.rand(-0.06, 0.06), this.rand(0, Math.PI * 2), this.rand(-0.06, 0.06));
      dummy.scale.set(sx, sy, sx);
      dummy.updateMatrix();
      cT.setHex(0xce8e5e); // 🎨 terakota cerah
      this.hslJitter(cT, 0.05, 0.14, 0.16);
      mains.push({ matrix: dummy.matrix.clone(), color: cT.clone() });

      // 2–4 cerobong satelit memeluk induknya
      const n = 2 + Math.floor(this.rng() * 3);
      for (let i = 0; i < n; i++) {
        const a = this.rand(0, Math.PI * 2);
        const d = sx * this.rand(0.45, 0.75);
        const ss = this.rand(0.35, 0.65);
        dummy.position.set(x + Math.cos(a) * d, h - 0.08, z + Math.sin(a) * d);
        dummy.rotation.set(this.rand(-0.18, 0.18), this.rand(0, 3), this.rand(-0.18, 0.18));
        dummy.scale.set(ss, sy * this.rand(0.35, 0.6), ss);
        dummy.updateMatrix();
        cT.setHex(0xd89b6b);
        this.hslJitter(cT, 0.05, 0.14, 0.16);
        sats.push({ matrix: dummy.matrix.clone(), color: cT.clone() });
      }
      placed++;
    }

    const mainMesh = this.buildInstanced('TermiteMoundMain', mainGeo, mains);
    const satMesh = this.buildInstanced('TermiteMoundSats', satGeo, sats);
    if (mainMesh) this.group.add(mainMesh);
    if (satMesh) this.group.add(satMesh);
  }

  /* ------------------- Fallen Logs: batang + tunggul + tutup serat ------------------- */

  private initFallenLogs() {
    const logGeo = new THREE.CylinderGeometry(0.2, 0.28, 1, 8); // unit sepanjang Y
    const stubGeo = new THREE.CylinderGeometry(0.045, 0.09, 1, 5);
    stubGeo.translate(0, 0.5, 0); // basis di origin → tumbuh keluar
    const capGeo = new THREE.CircleGeometry(1, 12);

    const logs: InstanceEntry[] = [];
    const stubs: InstanceEntry[] = [];
    const caps: InstanceEntry[] = [];
    const rings: InstanceEntry[] = [];

    const pos = new THREE.Vector3();
    const axis = new THREE.Vector3();
    const radial = new THREE.Vector3();
    const stubPos = new THREE.Vector3();
    const qZ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
    const qYaw = new THREE.Quaternion();
    const qStub = new THREE.Quaternion();
    const m = new THREE.Matrix4();
    const scl = new THREE.Vector3();
    const cT = new THREE.Color();

    let placed = 0;
    let tries = 0;
    while (placed < 6 && tries < 200) {
      tries++;
      const x = this.rand(-90, 90);
      const z = this.rand(-90, 90);
      const h = validSpot(x, z, 6, 0.3);
      if (h === null) continue;

      const len = this.rand(2.6, 4.0);
      const rad = this.rand(0.8, 1.25);
      pos.set(x, h + 0.24 * rad - 0.04, z); // rebah menyentuh tanah

      qYaw.setFromAxisAngle(UP, this.rand(0, Math.PI * 2));
      const quat = qYaw.clone().multiply(qZ); // rebahkan dulu, lalu putar yaw
      axis.copy(UP).applyQuaternion(quat);       // arah sumbu batang
      radial.copy(FORWARD).applyQuaternion(quat); // arah radial (atas-samping)

      m.compose(pos, quat, scl.set(rad, len, rad));
      cT.setHex(0x96683f); // 🎨 cokelat hangat (lebih cerah dari versi asli)
      this.hslJitter(cT, 0.04, 0.12, 0.14);
      logs.push({ matrix: m.clone(), color: cT.clone() });

      // Tutup serat kayu cerah di kedua ujung + lingkaran tahun
      this.pushLogEnd(caps, rings, pos, axis, +1, len / 2, 0.2 * rad);
      this.pushLogEnd(caps, rings, pos, axis, -1, len / 2, 0.28 * rad);

      // 1–2 tunggul cabang patah di punggung batang
      const nStubs = this.rng() < 0.7 ? 1 + Math.floor(this.rng() * 2) : 0;
      for (let i = 0; i < nStubs; i++) {
        const t = this.rand(-0.35, 0.35);
        stubPos
          .copy(pos)
          .addScaledVector(axis, t * len)
          .addScaledVector(radial, 0.2 * rad);
        qStub.setFromUnitVectors(UP, radial);
        m.compose(stubPos, qStub, scl.set(1, this.rand(0.22, 0.4), 1));
        cT.setHex(0x8a5f39);
        this.hslJitter(cT, 0.04, 0.1, 0.12);
        stubs.push({ matrix: m.clone(), color: cT.clone() });
      }
      placed++;
    }

    const logMesh = this.buildInstanced('FallenLogs', logGeo, logs);
    const stubMesh = this.buildInstanced('LogStubs', stubGeo, stubs);
    const capMesh = this.buildInstanced('LogCaps', capGeo, caps, { cast: false });
    const ringMesh = this.buildInstanced('LogRings', capGeo, rings, { cast: false });
    if (logMesh) this.group.add(logMesh);
    if (stubMesh) this.group.add(stubMesh);
    if (capMesh) this.group.add(capMesh);
    if (ringMesh) this.group.add(ringMesh);
  }

  /** Tutup ujung batang: cakram serat cerah + lingkaran tahun (anti z-fight) */
  private pushLogEnd(
    caps: InstanceEntry[],
    rings: InstanceEntry[],
    pos: THREE.Vector3,
    axis: THREE.Vector3,
    sign: 1 | -1,
    halfLen: number,
    radius: number
  ) {
    const normal = axis.clone().multiplyScalar(sign);
    const qCap = new THREE.Quaternion().setFromUnitVectors(FORWARD, normal);

    // Cakram serat kayu — sedikit keluar dari permukaan batang
    const capPos = pos.clone().addScaledVector(axis, sign * (halfLen + 0.006));
    const cCap = new THREE.Color(0xebcb94);
    this.hslJitter(cCap, 0.03, 0.08, 0.08);
    caps.push({
      matrix: new THREE.Matrix4().compose(capPos, qCap, new THREE.Vector3(radius, radius, 1)),
      color: cCap,
    });

    // Lingkaran tahun — lebih kecil, lebih gelap, sedikit lebih luar
    const ringPos = capPos.clone().addScaledVector(normal, 0.008);
    rings.push({
      matrix: new THREE.Matrix4().compose(
        ringPos,
        qCap.clone(),
        new THREE.Vector3(radius * 0.55, radius * 0.55, 1)
      ),
      color: new THREE.Color(0xb08752),
    });
  }

  /* ------------------- Grass: rumpun rumput savana ------------------- */

  private initGrassTufts() {
    const { WATER_LEVEL } = SAVANNAH_CONSTANTS;
    const bladeGeo = new THREE.ConeGeometry(0.045, 1, 4, 1, true); // tanpa tutup
    bladeGeo.translate(0, 0.5, 0);

    const entries: InstanceEntry[] = [];
    const dummy = new THREE.Object3D();
    const cT = new THREE.Color();
    const tiltAxis = new THREE.Vector3();
    const qTilt = new THREE.Quaternion();
    const GREEN = 0xa9c46c;
    const DRY = 0xcbc26e;

    let clumps = 0;
    let tries = 0;
    while (clumps < 140 && tries < 400) {
      tries++;
      const x = this.rand(-112, 112);
      const z = this.rand(-112, 112);
      const h = terrainH(x, z);
      if (h < WATER_LEVEL + 0.3) continue; // jangan tumbuh di dalam air

      const blades = 3 + Math.floor(this.rng() * 3);
      const dry = this.rng() < 0.35; // sebagian rumpun mengering keemasan
      for (let i = 0; i < blades; i++) {
        const a = this.rand(0, Math.PI * 2);
        const d = this.rand(0, 0.22);
        dummy.position.set(x + Math.cos(a) * d, h, z + Math.sin(a) * d);
        // helai condong keluar dari pusat rumpun
        qTilt.setFromAxisAngle(tiltAxis.set(Math.sin(a), 0, -Math.cos(a)), this.rand(0.1, 0.5));
        dummy.quaternion.copy(qTilt);
        dummy.scale.set(this.rand(0.7, 1.3), this.rand(0.28, 0.62), this.rand(0.7, 1.3));
        dummy.updateMatrix();

        cT.setHex(dry ? DRY : GREEN);
        this.hslJitter(cT, 0.06, 0.16, 0.18);
        entries.push({ matrix: dummy.matrix.clone(), color: cT.clone() });
      }
      clumps++;
    }

    // 🎨 rumput menerima bayangan tapi tidak melempar → hemat fill-rate
    const mesh = this.buildInstanced('SavannahGrass', bladeGeo, entries, {
      cast: false,
      receive: true,
    });
    if (mesh) this.group.add(mesh);
  }

  /* ------------------- Shrubs & Aloes ------------------- */

  private initShrubsAndAloes() {
    const dummy = new THREE.Object3D();
    const cT = new THREE.Color();

    // ---- Semak: blob hijau organik ----
    const shrubGeo = new THREE.IcosahedronGeometry(0.55, 1);
    const sPos = shrubGeo.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < sPos.count; i++) {
      v.fromBufferAttribute(sPos, i);
      const n =
        Math.sin(v.x * 7.3 + v.z * 5.1) * 0.5 +
        Math.sin(v.y * 8.1 + v.x * 4.7) * 0.5;
      v.multiplyScalar(1 + n * 0.18);
      v.y = Math.max(v.y * 0.7, -0.08); // gepengkan & rapatkan ke tanah
      sPos.setXYZ(i, v.x, v.y, v.z);
    }
    shrubGeo.computeVertexNormals();

    const shrubs: InstanceEntry[] = [];
    let placed = 0;
    let tries = 0;
    while (placed < 18 && tries < 200) {
      tries++;
      const x = this.rand(-100, 100);
      const z = this.rand(-100, 100);
      const h = validSpot(x, z, 6, 0.3);
      if (h === null) continue;

      dummy.position.set(x, h + 0.12, z);
      dummy.rotation.set(0, this.rand(0, Math.PI * 2), 0);
      const s = this.rand(0.6, 1.5);
      dummy.scale.set(s * this.rand(0.9, 1.4), s * this.rand(0.6, 0.9), s * this.rand(0.9, 1.4));
      dummy.updateMatrix();
      cT.setHex(0x9bbb68); // 🎨 hijau sage cerah
      this.hslJitter(cT, 0.07, 0.16, 0.16);
      shrubs.push({ matrix: dummy.matrix.clone(), color: cT.clone() });
      placed++;
    }
    const shrubMesh = this.buildInstanced('SavannahShrubs', shrubGeo, shrubs);
    if (shrubMesh) this.group.add(shrubMesh);

    // ---- Lidah buaya: roset daun + bunga oranye menyala ----
    const leafGeo = new THREE.ConeGeometry(0.055, 1, 5, 1, true);
    leafGeo.translate(0, 0.5, 0);
    const spikeGeo = new THREE.CylinderGeometry(0.035, 0.05, 1, 5);
    spikeGeo.translate(0, 0.5, 0);

    const leaves: InstanceEntry[] = [];
    const spikes: InstanceEntry[] = [];
    const dir = new THREE.Vector3();
    const q = new THREE.Quaternion();

    placed = 0;
    tries = 0;
    while (placed < 12 && tries < 200) {
      tries++;
      const x = this.rand(-95, 95);
      const z = this.rand(-95, 95);
      const h = validSpot(x, z, 6, 0.3);
      if (h === null) continue;

      const nLeaves = 6 + Math.floor(this.rng() * 3);
      const baseYaw = this.rand(0, Math.PI * 2);
      for (let i = 0; i < nLeaves; i++) {
        const yaw = baseYaw + (i / nLeaves) * Math.PI * 2 + this.rand(-0.2, 0.2);
        const tilt = this.rand(0.6, 1.15); // 35°–66° dari vertikal
        dir.set(Math.sin(tilt) * Math.cos(yaw), Math.cos(tilt), Math.sin(tilt) * Math.sin(yaw));
        q.setFromUnitVectors(UP, dir);
        dummy.position.set(x, h + 0.02, z);
        dummy.quaternion.copy(q);
        const w = this.rand(0.8, 1.2);
        dummy.scale.set(w, this.rand(0.35, 0.6), w);
        dummy.updateMatrix();
        cT.setHex(0x82a95f);
        this.hslJitter(cT, 0.05, 0.14, 0.14);
        leaves.push({ matrix: dummy.matrix.clone(), color: cT.clone() });
      }

      // 1–2 tangkai bunga oranye — aksen warna story book
      const nSpikes = 1 + Math.floor(this.rng() * 2);
      for (let i = 0; i < nSpikes; i++) {
        const yaw = this.rand(0, Math.PI * 2);
        const tilt = this.rand(0, 0.2);
        dir.set(Math.sin(tilt) * Math.cos(yaw), Math.cos(tilt), Math.sin(tilt) * Math.sin(yaw));
        q.setFromUnitVectors(UP, dir);
        dummy.position.set(x + this.rand(-0.1, 0.1), h + 0.05, z + this.rand(-0.1, 0.1));
        dummy.quaternion.copy(q);
        dummy.scale.set(1, this.rand(0.6, 0.95), 1);
        dummy.updateMatrix();
        cT.setHex(0xe8793c);
        this.hslJitter(cT, 0.04, 0.12, 0.1);
        spikes.push({ matrix: dummy.matrix.clone(), color: cT.clone() });
      }
      placed++;
    }

    const leafMesh = this.buildInstanced('SavannahAloeLeaves', leafGeo, leaves);
    const spikeMesh = this.buildInstanced('SavannahAloeBlooms', spikeGeo, spikes);
    if (leafMesh) this.group.add(leafMesh);
    if (spikeMesh) this.group.add(spikeMesh);
  }

  /* ------------------- Dispose ------------------- */

  public dispose() {
    // Semua geometry terregistrasi saat buildInstanced → pasti ter-dispose
    this.geometries.forEach((g) => g.dispose());
    this.matFlat.dispose();
  }
}