import * as THREE from 'three';
import {
  SAVANNAH_CONSTANTS,
  terrainH,
  fbm,
  pathDist,
  smoothstep,
  clamp,
  rnd2,
} from '../../utils/noise';
import { createSoilTexture } from '../../utils/textures';

const GOLDEN = new THREE.Color(0xc39b4a);
const GREEN = new THREE.Color(0x8c9a4d);
const DRY = new THREE.Color(0xd0a852);
const DIRT = new THREE.Color(0x96713f);
const MUD = new THREE.Color(0x7a5f3e);
const MUD_DEEP = new THREE.Color(0x5f4a30);

export class TerrainModule {
  public mesh: THREE.Mesh;
  public material: THREE.MeshLambertMaterial;

  constructor(renderer: THREE.WebGLRenderer) {
    const { MAP_SIZE, SEGMENTS, WX, WZ, WATER_R, WATER_LEVEL } = SAVANNAH_CONSTANTS;
    const geo = new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE, SEGMENTS, SEGMENTS);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const cols = new Float32Array(pos.count * 3);
    const cT = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = terrainH(x, z);
      pos.setY(i, h);

      const moist = fbm(x * 0.045 + 11.3, z * 0.045 + 5.9, 4);
      const mottle = fbm(x * 0.16 + 2.2, z * 0.16 + 8.8, 3);

      cT.copy(GOLDEN).lerp(GREEN, smoothstep(0.38, 0.68, moist));
      cT.lerp(DRY, smoothstep(0.34, 0.12, moist));

      const s = 0.88 + 0.24 * mottle;
      cT.r *= s;
      cT.g *= s;
      cT.b *= s;

      const pd = pathDist(x, z);
      if (pd < 3.4) {
        cT.lerp(DIRT, (1 - smoothstep(1.2, 3.4, pd)) * 0.85);
      }

      const dw = Math.hypot(x - WX, z - WZ);
      if (h < WATER_LEVEL + 0.45 && dw < WATER_R * 2.4) {
        cT.lerp(MUD, clamp((WATER_LEVEL + 0.45 - h) * 0.8, 0, 0.9));
      }
      if (h < WATER_LEVEL) {
        cT.lerp(MUD_DEEP, 0.8);
      }

      const g = (rnd2(x * 3.71, z * 3.71) - 0.5) * 0.06;
      cols[i * 3] = clamp(cT.r + g, 0, 1);
      cols[i * 3 + 1] = clamp(cT.g + g, 0, 1);
      cols[i * 3 + 2] = clamp(cT.b + g, 0, 1);
    }

    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    geo.computeVertexNormals();

    this.material = new THREE.MeshLambertMaterial({
      vertexColors: true,
      map: createSoilTexture(renderer),
      flatShading: true,
    });

    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.receiveShadow = true;
    this.mesh.name = 'SavannahTerrain';
  }

  public setWetness(wetAmount: number) {
    const cT = new THREE.Color(1, 1, 1);
    const WETC = new THREE.Color(0x8a939b);
    cT.lerp(WETC, wetAmount * 0.45);
    this.material.color.copy(cT);
  }

  public dispose() {
    this.mesh.geometry.dispose();
    this.material.map?.dispose();
    this.material.dispose();
  }
}
