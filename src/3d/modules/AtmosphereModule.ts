import * as THREE from 'three';
import { createCloudTexture } from '../../utils/textures';

export interface CloudItem {
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
  speed: number;
  baseOpacity: number;
}

export class AtmosphereModule {
  public group: THREE.Group;
  public clouds: CloudItem[] = [];
  public starMesh: THREE.Points;
  public starMat: THREE.PointsMaterial;
  public ffMesh: THREE.Points;
  public ffMat: THREE.PointsMaterial;
  public rainMesh: THREE.Points;
  public rainMat: THREE.PointsMaterial;

  private ffBase: Float32Array;
  private ffPhase: Float32Array;
  private rainPosArray: Float32Array;
  private rainSpeeds: Float32Array;

  private RAIN_COUNT = 1600;
  private FF_COUNT = 90;

  constructor(treeSpots: { x: number; z: number; h: number }[]) {
    this.group = new THREE.Group();
    this.group.name = 'AtmosphereGroup';

    // 1. Clouds
    const cloudTex = createCloudTexture();
    const cloudsGroup = new THREE.Group();
    cloudsGroup.name = 'CloudsGroup';

    for (let i = 0; i < 16; i++) {
      const mat = new THREE.SpriteMaterial({
        map: cloudTex,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        fog: false,
      });
      const sp = new THREE.Sprite(mat);
      sp.position.set(
        (Math.random() * 2 - 1) * 200,
        42 + Math.random() * 22,
        (Math.random() * 2 - 1) * 200
      );
      const sc = 28 + Math.random() * 26;
      sp.scale.set(sc, sc * 0.6, 1);
      cloudsGroup.add(sp);
      this.clouds.push({
        sprite: sp,
        material: mat,
        speed: 0.6 + Math.random() * 1.1,
        baseOpacity: 0.28 + Math.random() * 0.22,
      });
    }
    this.group.add(cloudsGroup);

    // 2. Stars
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(420 * 3);
    for (let i = 0; i < 420; i++) {
      const a = Math.random() * 6.28;
      const e = Math.random() * Math.PI * 0.46 + 0.08;
      const r = 320;
      starPositions[i * 3] = Math.cos(a) * Math.cos(e) * r;
      starPositions[i * 3 + 1] = Math.sin(e) * r;
      starPositions[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.computeBoundingSphere();
    this.starMat = new THREE.PointsMaterial({
      color: 0xfff6d8,
      size: 1.6,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: false,
    });
    this.starMesh = new THREE.Points(starGeo, this.starMat);
    this.starMesh.name = 'StarsGroup';
    this.group.add(this.starMesh);

    // 3. Fireflies
    this.ffBase = new Float32Array(this.FF_COUNT * 3);
    this.ffPhase = new Float32Array(this.FF_COUNT);
    for (let i = 0; i < this.FF_COUNT; i++) {
      const t = treeSpots.length
        ? treeSpots[Math.floor(Math.random() * treeSpots.length)]
        : { x: 0, z: 0, h: 0 };
      this.ffBase[i * 3] = t.x + (Math.random() - 0.5) * 7;
      this.ffBase[i * 3 + 1] = t.h + 1 + Math.random() * 2.4;
      this.ffBase[i * 3 + 2] = t.z + (Math.random() - 0.5) * 7;
      this.ffPhase[i] = Math.random() * 6.28;
    }
    const ffGeo = new THREE.BufferGeometry();
    ffGeo.setAttribute('position', new THREE.BufferAttribute(this.ffBase.slice(), 3));
    ffGeo.computeBoundingSphere();
    this.ffMat = new THREE.PointsMaterial({
      color: 0xd8e76a,
      size: 0.55,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.ffMesh = new THREE.Points(ffGeo, this.ffMat);
    this.ffMesh.name = 'FirefliesGroup';
    this.group.add(this.ffMesh);

    // 4. Rain
    const rainGeo = new THREE.BufferGeometry();
    this.rainPosArray = new Float32Array(this.RAIN_COUNT * 3);
    this.rainSpeeds = new Float32Array(this.RAIN_COUNT);
    for (let i = 0; i < this.RAIN_COUNT; i++) {
      this.rainPosArray[i * 3] = (Math.random() * 2 - 1) * 110;
      this.rainPosArray[i * 3 + 1] = Math.random() * 48;
      this.rainPosArray[i * 3 + 2] = (Math.random() * 2 - 1) * 110;
      this.rainSpeeds[i] = 22 + Math.random() * 10;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(this.rainPosArray, 3));
    rainGeo.computeBoundingSphere();
    this.rainMat = new THREE.PointsMaterial({
      color: 0x9fb4c4,
      size: 0.35,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.rainMesh = new THREE.Points(rainGeo, this.rainMat);
    this.rainMesh.name = 'RainGroup';
    this.rainMesh.visible = false;
    this.group.add(this.rainMesh);
  }

  public update(
    dt: number,
    time: number,
    nightFactor: number,
    rainAmount: number,
    grayAmount: number,
    cloudCount: number,
    cloudColor: THREE.Color,
    windMultiplier: number
  ) {
    // Update Clouds
    for (let i = 0; i < this.clouds.length; i++) {
      const c = this.clouds[i];
      c.sprite.position.x += c.speed * dt * (1 + rainAmount);
      if (c.sprite.position.x > 240) c.sprite.position.x = -240;

      const targetOp = i < cloudCount ? c.baseOpacity * (0.7 + grayAmount * 0.9) : 0;
      c.material.opacity += (targetOp - c.material.opacity) * Math.min(1, dt * 1.5);
      c.material.color.lerp(cloudColor, Math.min(1, dt * 1.5));
    }

    // Update Stars & Fireflies
    this.starMat.opacity = nightFactor * 0.85 * (1 - rainAmount);
    this.ffMat.opacity = nightFactor * 0.9 * (1 - rainAmount * 0.8);

    if (this.ffMat.opacity > 0.01) {
      const posAttr = this.ffMesh.geometry.attributes.position as THREE.BufferAttribute;
      const p = posAttr.array as Float32Array;
      for (let i = 0; i < this.FF_COUNT; i++) {
        p[i * 3] = this.ffBase[i * 3] + Math.sin(time * 0.7 + this.ffPhase[i]) * 1.4;
        p[i * 3 + 1] = this.ffBase[i * 3 + 1] + Math.sin(time * 1.1 + this.ffPhase[i] * 2) * 0.5;
        p[i * 3 + 2] = this.ffBase[i * 3 + 2] + Math.cos(time * 0.6 + this.ffPhase[i]) * 1.4;
      }
      posAttr.needsUpdate = true;
    }

    // Update Rain
    this.rainMesh.visible = rainAmount > 0.02;
    this.rainMat.opacity = rainAmount * 0.55;

    if (this.rainMesh.visible) {
      const posAttr = this.rainMesh.geometry.attributes.position as THREE.BufferAttribute;
      const p = posAttr.array as Float32Array;
      for (let i = 0; i < this.RAIN_COUNT; i++) {
        p[i * 3 + 1] -= this.rainSpeeds[i] * dt;
        p[i * 3] += windMultiplier * dt * 2.5;
        if (p[i * 3 + 1] < -1) {
          p[i * 3 + 1] = 40 + Math.random() * 10;
          p[i * 3] = (Math.random() * 2 - 1) * 110;
          p[i * 3 + 2] = (Math.random() * 2 - 1) * 110;
        }
        if (p[i * 3] > 112) p[i * 3] -= 224;
      }
      posAttr.needsUpdate = true;
    }
  }

  public dispose() {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Points || obj instanceof THREE.Sprite) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    });
  }
}
