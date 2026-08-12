import * as THREE from 'three';
import { createWaterMaterial } from '../../shaders/waterShader';
import { SAVANNAH_CONSTANTS } from '../../utils/noise';

export class WaterModule {
  public mesh: THREE.Mesh;
  public material: THREE.ShaderMaterial;

  constructor() {
    const { WX, WZ, WATER_R, WATER_LEVEL } = SAVANNAH_CONSTANTS;
    this.material = createWaterMaterial();
    const geo = new THREE.CircleGeometry(WATER_R * 1.12, 48);
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.set(WX, WATER_LEVEL, WZ);
    this.mesh.name = 'WaterPond';
  }

  public update(time: number, rainAmount: number, dayFactor: number, skyColor: THREE.Color) {
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uRain.value = rainAmount;
    this.material.uniforms.uDay.value = dayFactor;
    (this.material.uniforms.uTint.value as THREE.Color).copy(skyColor);
  }

  public dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
