import * as THREE from 'three';

/**
 * Creates soil texture with organic watercolor speckles and dirt grains
 */
export function createSoilTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 512;
  const g = cv.getContext('2d');
  if (!g) return new THREE.CanvasTexture(cv);

  g.fillStyle = '#fdfdfa';
  g.fillRect(0, 0, 512, 512);

  // Soft watercolor spots
  for (let i = 0; i < 26; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 30 + Math.random() * 70;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    const tone = Math.random() < 0.5 ? '120,90,50' : '110,120,60';
    gr.addColorStop(0, `rgba(${tone},${0.05 + Math.random() * 0.05})`);
    gr.addColorStop(1, `rgba(${tone},0)`);
    g.fillStyle = gr;
    g.beginPath();
    g.arc(x, y, r, 0, 7);
    g.fill();
  }

  // Dirt stipples
  for (let i = 0; i < 5200; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const s = 0.6 + Math.random() * 1.8;
    const p = Math.random();
    g.fillStyle =
      p < 0.55
        ? `rgba(100,72,40,${0.05 + Math.random() * 0.12})`
        : p < 0.85
        ? `rgba(120,120,60,${0.05 + Math.random() * 0.1})`
        : `rgba(60,50,35,${0.06 + Math.random() * 0.12})`;
    g.fillRect(x, y, s, s * 0.7);
  }

  // Fine strokes
  g.strokeStyle = 'rgba(140,120,70,0.10)';
  g.lineWidth = 1;
  for (let i = 0; i < 700; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const a = Math.random() * Math.PI;
    const l = 2 + Math.random() * 5;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }

  const texture = new THREE.CanvasTexture(cv);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(15, 15);
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates cloud puff canvas texture
 */
export function createCloudTexture(): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const g = cv.getContext('2d');
  if (g) {
    for (let i = 0; i < 7; i++) {
      const x = 60 + Math.random() * 136;
      const y = 90 + Math.random() * 76;
      const r = 36 + Math.random() * 46;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(255,255,255,0.85)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.arc(x, y, r, 0, 7);
      g.fill();
    }
  }
  return new THREE.CanvasTexture(cv);
}

/**
 * Utility to draw rounded rect on canvas
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Creates animal spot badge canvas label
 */
export function createAnimalLabelTexture(
  text: string,
  species: string,
  colorHex = '#8a6a42'
): { canvas: HTMLCanvasElement; texture: THREE.CanvasTexture } {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const texture = new THREE.CanvasTexture(canvas);

  const draw = () => {
    const g = canvas.getContext('2d');
    if (!g) return;

    g.clearRect(0, 0, 256, 96);
    
    // Shadow
    g.fillStyle = 'rgba(70,45,20,0.15)';
    roundRect(g, 26, 18, 204, 64, 32);
    g.fill();

    // Background
    g.fillStyle = 'rgba(255,251,240,0.95)';
    roundRect(g, 24, 14, 204, 64, 32);
    g.fill();

    // Border
    g.lineWidth = 3;
    g.strokeStyle = colorHex;
    roundRect(g, 24, 14, 204, 64, 32);
    g.stroke();

    // Main Text
    g.font = '700 38px Caveat, cursive, sans-serif';
    g.fillStyle = '#4a3421';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, 126, 38);

    // Species badge
    g.font = '800 12px Nunito, sans-serif';
    g.fillStyle = colorHex;
    g.fillText(species, 126, 62);

    texture.needsUpdate = true;
  };

  draw();
  return { canvas, texture };
}

/**
 * Menghasilkan pola prosedural pastel untuk Hero Animals
 * Dibuat di kanvas 256x256 agar sangat ringan di VRAM.
 */
export function createAnimalPatternTexture(speciesId: string): THREE.Texture {
  if (typeof document === 'undefined') {
    return new THREE.Texture(); // Fallback untuk Node / Vitest
  }

  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 256;
  const ctx = cv.getContext('2d')!;

  const palettes: Record<string, { base: string; pattern: string }> = {
    zebra: { base: '#FDFBF7', pattern: '#6B6661' },      // Creamy white & soft charcoal
    jerapah: { base: '#E9C58F', pattern: '#B87D4B' },    // Peach & caramel (from MCMT)
    'g ajah': { base: '#B8BCC4', pattern: '#9298A3' },   // Lavender grey & soft shadow
    singa: { base: '#E8C382', pattern: '#C47F52' },      // Sandy gold & copper
    cheetah: { base: '#F2E2A5', pattern: '#5A5550' },    // Pale yellow & dark grey
    antelop: { base: '#D4B895', pattern: '#FDFBF7' },    // Tan & cream belly
    kerbau: { base: '#7A746B', pattern: '#4A463D' },     // Slate brown & mud
    flaminggo: { base: '#F7B5CD', pattern: '#E8878F' },  // Pastel pink & coral
  };

  const p = palettes[speciesId] || palettes.antelop;

  // Base fill
  ctx.fillStyle = p.base;
  ctx.fillRect(0, 0, 256, 256);

  if (speciesId === 'zebra') {
    ctx.fillStyle = p.pattern;
    for (let i = 0; i < 14; i++) {
      ctx.beginPath();
      const x = (i / 14) * 256;
      const w = 6 + Math.random() * 4;
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + 15, 85, x - 15, 170, x + 5, 256);
      ctx.lineTo(x + w, 256);
      ctx.bezierCurveTo(x - 15 + w, 170, x + 15 + w, 85, x + w, 0);
      ctx.fill();
    }
  } else if (speciesId === 'jerapah') {
    ctx.fillStyle = p.pattern;
    for (let i = 0; i < 35; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const r = 12 + Math.random() * 14;
      ctx.beginPath();
      ctx.moveTo(x, y - r);
      for (let j = 0; j < 6; j++) {
        const angle = (j / 6) * Math.PI * 2;
        const rr = r * (0.7 + Math.random() * 0.5);
        ctx.lineTo(x + Math.cos(angle) * rr, y + Math.sin(angle) * rr);
      }
      ctx.closePath();
      ctx.fill();
    }
  } else if (speciesId === 'cheetah') {
    ctx.fillStyle = p.pattern;
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const r = 2 + Math.random() * 2.5;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (speciesId === 'g ajah') {
    ctx.strokeStyle = p.pattern;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.35;
    for (let i = 0; i < 40; i++) {
      ctx.beginPath();
      const y = Math.random() * 256;
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(85, y + (Math.random()-0.5)*30, 170, y + (Math.random()-0.5)*30, 256, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (speciesId === 'singa') {
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = `rgba(196, 127, 82, ${Math.random() * 0.25})`;
      ctx.fillRect(Math.random()*256, Math.random()*256, 3 + Math.random()*4, 3 + Math.random()*4);
    }
  } else if (speciesId === 'antelop') {
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, p.base);
    grad.addColorStop(0.55, p.base);
    grad.addColorStop(1, p.pattern);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  } else if (speciesId === 'kerbau') {
    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = `rgba(50, 45, 40, ${Math.random() * 0.3})`;
      const s = 2 + Math.random() * 5;
      ctx.fillRect(Math.random()*256, Math.random()*256, s, s);
    }
  } else if (speciesId === 'flaminggo') {
    const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 140);
    grad.addColorStop(0, '#FCE1E9');
    grad.addColorStop(1, p.base);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = p.pattern;
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.3;
    for(let i=0; i<40; i++) {
      ctx.beginPath();
      ctx.arc(Math.random()*256, Math.random()*256, 8+Math.random()*16, 0, Math.PI);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  const texture = new THREE.CanvasTexture(cv);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
