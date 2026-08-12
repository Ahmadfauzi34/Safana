import * as THREE from 'three';

export function createWaterMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      uTime: { value: 0 },
      uRain: { value: 0 },
      uDay: { value: 1 },
      uTint: { value: new THREE.Color(0xf7e6bd) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime;
      uniform float uRain;
      uniform float uDay;
      uniform vec3 uTint;

      float hash(vec2 p) {
        p = fract(p * vec2(127.1, 311.7));
        p += dot(p, p + 34.23);
        return fract(p.x * p.y);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      void main() {
        vec2 c = vUv - 0.5;
        float d = length(c) * 2.0;
        vec3 deep = vec3(0.13, 0.36, 0.35);
        vec3 shal = vec3(0.42, 0.62, 0.53);
        vec3 col = mix(deep, shal, smoothstep(0.1, 0.95, d));

        float amp = 1.0 + uRain * 2.5;
        float rip = sin(d * 26.0 - uTime * 2.0 * amp) * 0.5 + 0.5;
        col += rip * 0.045 * (1.0 - d) * amp;
        col += (noise(vUv * 30.0 + uTime * 0.25) - 0.5) * 0.05;
        col += sin(d * 9.0 - uTime * 1.2) * 0.02 * (1.0 - d);

        col = mix(col, uTint, 0.25);
        col *= 0.32 + 0.78 * uDay;
        col = mix(col, vec3(0.92, 0.88, 0.75), smoothstep(0.9, 1.0, d) * 0.55);

        gl_FragColor = vec4(col, 0.95 - smoothstep(0.85, 1.0, d) * 0.15);
      }
    `,
  });
}
