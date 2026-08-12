import * as THREE from 'three';

export const WaterColorShader = {
  uniforms: {
    tDiffuse: { value: null },
    uResolution: { value: new THREE.Vector2(1000, 1000) },
    uTime: { value: 0 },
    uIntensity: { value: 1.0 },
    uNight: { value: 0 },
    uFlash: { value: 0 },
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

    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform float uTime;
    uniform float uIntensity;
    uniform float uNight;
    uniform float uFlash;

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

    float lum(vec3 c) {
      return dot(c, vec3(0.299, 0.587, 0.114));
    }

    void main() {
      float I = clamp(uIntensity, 0.0, 1.6);
      vec2 uv = vUv;

      // Paper wobble sangat halus, tetap murah
      float paperWobble = noise(uv * 6.0 + uTime * 0.02);
      uv += (paperWobble - 0.5) * 0.0012 * I;

      vec3 col = texture2D(tDiffuse, uv).rgb;

      // 1. Brighten / angkat exposure lembut
      col *= 1.0 + 0.16 * I;

      // 2. Soft saturation, jangan sampai terlalu neon
      float l = lum(col);
      col = mix(vec3(l), col, 1.07 + 0.11 * I);

      // 3. Pastel tint
      vec3 dayTint = vec3(1.03, 1.00, 0.96);
      vec3 nightTint = vec3(0.90, 0.94, 1.05);
      col *= mix(dayTint, nightTint, uNight * 0.45);

      // 4. Soft posterization, efek cat air ringan
      vec3 q = floor(col * 9.0 + 0.5) / 9.0;
      col = mix(col, q, 0.14 * I);

      // 5. Paper grain halus
      float grain = (noise(gl_FragCoord.xy * 0.22) - 0.5) * 0.028 * I;
      col += grain;

      // 6. Vignette terang, bukan gelap berat
      float dd = distance(vUv, vec2(0.5));
      float vig = smoothstep(0.55, 0.95, dd);

      vec3 paper = mix(
        vec3(1.02, 0.99, 0.93),
        vec3(0.58, 0.63, 0.74),
        uNight * 0.35
      );

      col = mix(col, paper, vig * 0.12 * I);
      col *= 1.0 - vig * 0.05 * I;

      // 7. Night grading tetap lembut, tidak terlalu suram
      col = mix(col, col * vec3(0.90, 0.94, 1.04), uNight * 0.26);

      // 8. Lightning flash
      col += vec3(1.0, 0.99, 0.92) * uFlash;

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};
