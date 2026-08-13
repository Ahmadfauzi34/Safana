import * as THREE from 'three';

/**
 * Creates soil texture with organic watercolor speckles and dirt grains
 * 🎨 Story book mode: cream hangat + honey gold + meadow green
 */
export function createSoilTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 512;
  const g = cv.getContext('2d');
  if (!g) return new THREE.CanvasTexture(cv);

  // Base cream kertas cerita yang hangat & terang
  g.fillStyle = '#FFFEF7';
  g.fillRect(0, 0, 512, 512);

  // Soft watercolor spots — honey, padang rumput, peach
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 30 + Math.random() * 70;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    const roll = Math.random();
    const tone =
      roll < 0.45
        ? '222,168,86'   // honey gold
        : roll < 0.78
          ? '158,190,96' // meadow green
          : '240,178,124'; // soft peach
    gr.addColorStop(0, `rgba(${tone},${0.08 + Math.random() * 0.08})`);
    gr.addColorStop(1, `rgba(${tone},0)`);
    g.fillStyle = gr;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }

  // Dirt stipples — karamel, lumas, kakao hangat
  for (let i = 0; i < 5200; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const s = 0.6 + Math.random() * 1.8;
    const p = Math.random();
    g.fillStyle =
      p < 0.5
        ? `rgba(186,134,72,${0.10 + Math.random() * 0.16})`
        : p < 0.82
          ? `rgba(164,180,92,${0.10 + Math.random() * 0.14})`
          : `rgba(148,106,68,${0.10 + Math.random() * 0.15})`;
    g.fillRect(x, y, s, s * 0.7);
  }

  // Fine strokes — goresan jerami keemasan
  g.strokeStyle = 'rgba(214,180,100,0.18)';
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
 * ☁️ Awan story book: putih cerah + highlight matahari + shadow biru lembut
 */
export function createCloudTexture(): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const g = cv.getContext('2d');
  if (g) {
    // Shadow biru lembut di bawah untuk volume
    for (let i = 0; i < 5; i++) {
      const x = 70 + Math.random() * 120;
      const y = 135 + Math.random() * 46;
      const r = 30 + Math.random() * 40;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(185,212,245,0.35)');
      gr.addColorStop(1, 'rgba(185,212,245,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    // Puff utama putih cerah dengan inti hangat
    for (let i = 0; i < 7; i++) {
      const x = 60 + Math.random() * 136;
      const y = 90 + Math.random() * 76;
      const r = 36 + Math.random() * 46;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(255,255,255,0.95)');
      gr.addColorStop(0.7, 'rgba(255,252,242,0.55)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
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
 * 🏷️ Badge lebih cerah: kertas hangat + teks cokelat hangat
 */
export function createAnimalLabelTexture(
  text: string,
  species: string,
  colorHex = '#C98A3E' // honey cerah (sebelumnya #8a6a42)
): { canvas: HTMLCanvasElement; texture: THREE.CanvasTexture } {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const texture = new THREE.CanvasTexture(canvas);

  const draw = () => {
    const g = canvas.getContext('2d');
    if (!g) return;
    g.clearRect(0, 0, 256, 96);

    // Shadow — lebih hangat & ringan
    g.fillStyle = 'rgba(140,90,40,0.16)';
    roundRect(g, 26, 18, 204, 64, 32);
    g.fill();

    // Background — kertas cerita cerah
    g.fillStyle = '#FFFEF8';
    roundRect(g, 24, 14, 204, 64, 32);
    g.fill();

    // Border
    g.lineWidth = 3;
    g.strokeStyle = colorHex;
    roundRect(g, 24, 14, 204, 64, 32);
    g.stroke();

    // Main Text — cokelat hangat
    g.font = '700 38px Caveat, cursive, sans-serif';
    g.fillStyle = '#5C3D24';
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
 * Menghasilkan pola prosedural pastel CERAH untuk Hero Animals
 * 📖 Palet story book: sunny apricot, candy pink, buttercup, periwinkle
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
    zebra:     { base: '#FFFDF6', pattern: '#5E6E7E' },  // Cream terang & slate blue
    jerapah:   { base: '#FFD99E', pattern: '#E8863F' },  // Sunny apricot & tangerine
    'g ajah':  { base: '#C7D6EC', pattern: '#9FB4D8' },  // Periwinkle pastel
    singa:     { base: '#FFD98A', pattern: '#E8944A' },  // Sunflower & amber
    cheetah:   { base: '#FFE9A6', pattern: '#6E6259' },  // Buttercup & soft charcoal
    antelop:   { base: '#EFCB9C', pattern: '#FFFDF6' },  // Honey tan & vanilla
    kerbau:    { base: '#9A9187', pattern: '#6E655A' },  // Warm stone terang
    flaminggo: { base: '#FFB8CE', pattern: '#FF8FA3' },  // Candy pink & coral
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
    ctx.globalAlpha = 0.5; // ⬆ lebih terlihat (sebelumnya 0.35)
    for (let i = 0; i < 40; i++) {
      ctx.beginPath();
      const y = Math.random() * 256;
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(85, y + (Math.random() - 0.5) * 30, 170, y + (Math.random() - 0.5) * 30, 256, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (speciesId === 'singa') {
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = `rgba(232, 148, 74, ${Math.random() * 0.35})`; // ⬆ amber lebih vivid
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 3 + Math.random() * 4, 3 + Math.random() * 4);
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
      ctx.fillStyle = `rgba(90, 80, 68, ${Math.random() * 0.4})`; // ⬆ lebih jelas
      const s = 2 + Math.random() * 5;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, s, s);
    }
  } else if (speciesId === 'flaminggo') {
    const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 140);
    grad.addColorStop(0, '#FFDCE7'); // glow tengah lebih cerah
    grad.addColorStop(1, p.base);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = p.pattern;
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.45; // ⬆ bulu lebih terbaca (sebelumnya 0.3)
    for (let i = 0; i < 40; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * 256, Math.random() * 256, 8 + Math.random() * 16, 0, Math.PI);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  const texture = new THREE.CanvasTexture(cv);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
