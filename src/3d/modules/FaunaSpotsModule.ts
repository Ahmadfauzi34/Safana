import * as THREE from 'three';
import { ANIMAL_SPOTS } from '../../data/animals';
import { AnimalSpot } from '../../types/savannah';
import { terrainH } from '../../utils/noise';
import { createAnimalLabelTexture } from '../../utils/textures';

export interface MarkerItem {
  spot: AnimalSpot;
  ring: THREE.Mesh;
  disc: THREE.Mesh;
  sprite: THREE.Sprite;
  hitBox: THREE.Mesh;
  phase: number;
  terrainY: number;
}

export class FaunaSpotsModule {
  public group: THREE.Group;
  public markers: MarkerItem[] = [];

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'FaunaSpotsGroup';
    this.initMarkers();
  }

  private initMarkers() {
    ANIMAL_SPOTS.forEach((s, i) => {
      const h = terrainH(s.pos.x, s.pos.z);

      // Pulsing outer ring
      const ringGeo = new THREE.RingGeometry(2.2, 2.8, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: s.color,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(s.pos.x, h + 0.25, s.pos.z);

      // Inner glow disc
      const discGeo = new THREE.CircleGeometry(2.2, 24);
      const discMat = new THREE.MeshBasicMaterial({
        color: s.color,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
      });
      const disc = new THREE.Mesh(discGeo, discMat);
      disc.rotation.x = -Math.PI / 2;
      disc.position.set(s.pos.x, h + 0.22, s.pos.z);

      // Label sprite
      const { texture } = createAnimalLabelTexture(s.name, s.species, s.color);
      const sprMat = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(sprMat);
      sprite.position.set(s.pos.x, h + 5.6, s.pos.z);
      sprite.scale.set(10, 3.75, 1);

      // Invisible hit box for click selection
      const hitGeo = new THREE.CylinderGeometry(3.5, 3.5, 6, 8);
      const hitMat = new THREE.MeshBasicMaterial({
        visible: false,
      });
      const hitBox = new THREE.Mesh(hitGeo, hitMat);
      hitBox.position.set(s.pos.x, h + 3, s.pos.z);
      hitBox.userData = { animalId: s.id, animalSpot: s };

      const markerGrp = new THREE.Group();
      markerGrp.name = `AnimalSpot_${s.id}`;
      markerGrp.add(ring, disc, sprite, hitBox);

      this.group.add(markerGrp);

      this.markers.push({
        spot: s,
        ring,
        disc,
        sprite,
        hitBox,
        phase: i * 1.3,
        terrainY: h,
      });
    });
  }

  public update(time: number, selectedAnimalId: string | null) {
    for (const m of this.markers) {
      const isSelected = m.spot.id === selectedAnimalId;
      const pulse = Math.sin(time * 2.5 + m.phase);

      const ringMat = m.ring.material as THREE.MeshBasicMaterial;
      ringMat.opacity = isSelected ? 0.85 + 0.15 * pulse : 0.35 + 0.2 * pulse;

      const sc = isSelected ? 1.25 + 0.1 * pulse : 1.0 + 0.06 * pulse;
      m.ring.scale.set(sc, sc, 1);

      // Highlight selected sprite position
      if (isSelected) {
        m.sprite.position.y = THREE.MathUtils.lerp(m.sprite.position.y, m.terrainY + 6.8 + Math.sin(time * 3) * 0.3, 0.1);
      } else {
        m.sprite.position.y = m.terrainY + 5.6;
      }
    }
  }

  public getHitBoxes(): THREE.Mesh[] {
    return this.markers.map((m) => m.hitBox);
  }

  public dispose() {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Sprite) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    });
  }
}
