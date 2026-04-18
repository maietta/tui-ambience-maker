/**
 * OKLCH color space utilities
 * Perceptually uniform color space for accurate color manipulation
 */

export interface OKLCH {
  l: number;  // Lightness (0-1)
  c: number;  // Chroma (0-0.4 typically)
  h: number;  // Hue (0-360)
}

export interface RGB {
  r: number;  // 0-255
  g: number;  // 0-255
  b: number;  // 0-255
}

export interface Lab {
  l: number;
  a: number;
  b: number;
}

// D65 white point
const D65 = { x: 0.95047, y: 1.0, z: 1.08883 };

/**
 * Convert RGB to XYZ color space
 */
export function rgbToXyz(rgb: RGB): { x: number; y: number; z: number } {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  // Apply sRGB gamma correction
  const rLinear = r <= 0.04045 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const gLinear = g <= 0.04045 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const bLinear = b <= 0.04045 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  // sRGB to XYZ matrix
  return {
    x: rLinear * 0.4124564 + gLinear * 0.3575761 + bLinear * 0.1804375,
    y: rLinear * 0.2126729 + gLinear * 0.7151522 + bLinear * 0.0721750,
    z: rLinear * 0.0193339 + gLinear * 0.1191920 + bLinear * 0.9503041,
  };
}

/**
 * Convert XYZ to Lab color space
 */
export function xyzToLab(xyz: { x: number; y: number; z: number }): Lab {
  const { x, y, z } = xyz;
  
  const xRef = x / D65.x;
  const yRef = y / D65.y;
  const zRef = z / D65.z;

  const f = (t: number): number => {
    return t > 0.008856451679 ? Math.pow(t, 1 / 3) : (903.296296296 * t + 16) / 116;
  };

  const l = 116 * f(yRef) - 16;
  const a = 500 * (f(xRef) - f(yRef));
  const b = 200 * (f(yRef) - f(zRef));

  return { l, a, b };
}

/**
 * Convert Lab to OKLCH color space
 */
export function labToOklch(lab: Lab): OKLCH {
  // Convert Lab to OKLab using the proper transformation
  const lms = labToLms(lab);
  const lmsPrime = {
    l: Math.cbrt(lms.l),
    m: Math.cbrt(lms.m),
    s: Math.cbrt(lms.s),
  };

  // OKLab coordinates
  const oklabL = 0.8189330101 * lmsPrime.l + 0.3618667424 * lmsPrime.m - 0.1288597137 * lmsPrime.s;
  const oklabA = 0.0329845436 * lmsPrime.l + 0.9293118715 * lmsPrime.m + 0.0361456387 * lmsPrime.s;
  const oklabB = 0.0482003018 * lmsPrime.l + 0.2643662691 * lmsPrime.m + 0.6338517070 * lmsPrime.s;

  // Convert OKLab to OKLCH
  const c = Math.sqrt(oklabA * oklabA + oklabB * oklabB);
  const h = c > 0.0001 ? (Math.atan2(oklabB, oklabA) * 180 / Math.PI + 360) % 360 : 0;
  const l = oklabL;

  return { l, c, h };
}

/**
 * Convert Lab to LMS color space (intermediate step)
 */
function labToLms(lab: Lab): { l: number; m: number; s: number } {
  // Inverse of the matrix used in xyzToLab
  const y = (lab.l + 16) / 116;
  const x = y + lab.a / 500;
  const z = y - lab.b / 200;

  const fInv = (t: number): number => {
    const t3 = t * t * t;
    return t3 > 0.008856451679 ? t3 : (116 * t - 16) / 903.296296296;
  };

  const xRef = fInv(x);
  const yRef = fInv(y);
  const zRef = fInv(z);

  return {
    l: 0.8189330101 * xRef + 0.3618667424 * yRef - 0.1288597137 * zRef,
    m: 0.0329845436 * xRef + 0.9293118715 * yRef + 0.0361456387 * zRef,
    s: 0.0482003018 * xRef + 0.2643662691 * yRef + 0.6338517070 * zRef,
  };
}

/**
 * Convert RGB directly to OKLCH
 */
export function rgbToOklch(rgb: RGB): OKLCH {
  const xyz = rgbToXyz(rgb);
  const lab = xyzToLab(xyz);
  return labToOklch(lab);
}

/**
 * Convert OKLCH to OKLab
 */
export function oklchToOklab(oklch: OKLCH): { l: number; a: number; b: number } {
  const hRad = oklch.h * Math.PI / 180;
  return {
    l: oklch.l,
    a: oklch.c * Math.cos(hRad),
    b: oklch.c * Math.sin(hRad),
  };
}

/**
 * Convert OKLab to LMS
 */
function oklabToLms(oklab: { l: number; a: number; b: number }): { l: number; m: number; s: number } {
  return {
    l: oklab.l + 0.3963377774 * oklab.a + 0.2158037573 * oklab.b,
    m: oklab.l - 0.1055613458 * oklab.a - 0.0638541728 * oklab.b,
    s: oklab.l - 0.0894841775 * oklab.a - 1.2914855480 * oklab.b,
  };
}

/**
 * Convert LMS to XYZ
 */
function lmsToXyz(lms: { l: number; m: number; s: number }): { x: number; y: number; z: number } {
  const l = lms.l * lms.l * lms.l;
  const m = lms.m * lms.m * lms.m;
  const s = lms.s * lms.s * lms.s;

  return {
    x: 1.2270138511035211 * l - 0.5577992887910691 * m + 0.2812561489664677 * s,
    y: -0.0405801784237345 * l + 1.1122568696168821 * m - 0.0716766786656241 * s,
    z: -0.0763812845057069 * l - 0.4214819786410127 * m + 1.5861632204405947 * s,
  };
}

/**
 * Convert XYZ to RGB
 */
export function xyzToRgb(xyz: { x: number; y: number; z: number }): RGB {
  const { x, y, z } = xyz;

  const rLinear = 3.2404542 * x - 1.5371385 * y - 0.4985314 * z;
  const gLinear = -0.9692660 * x + 1.8760108 * y + 0.0415560 * z;
  const bLinear = 0.0556434 * x - 0.2040259 * y + 1.0572252 * z;

  const gamma = (c: number): number => {
    if (c <= 0.0031308) {
      return 12.92 * c;
    }
    return 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  };

  return {
    r: Math.round(Math.max(0, Math.min(1, gamma(rLinear))) * 255),
    g: Math.round(Math.max(0, Math.min(1, gamma(gLinear))) * 255),
    b: Math.round(Math.max(0, Math.min(1, gamma(bLinear))) * 255),
  };
}

/**
 * Convert OKLCH to RGB
 */
export function oklchToRgb(oklch: OKLCH): RGB {
  const oklab = oklchToOklab(oklch);
  const lms = oklabToLms(oklab);
  const xyz = lmsToXyz(lms);
  return xyzToRgb(xyz);
}

/**
 * Check if an OKLCH color is within sRGB gamut
 */
export function isInGamut(oklch: OKLCH): boolean {
  const rgb = oklchToRgb(oklch);
  return rgb.r > 0 && rgb.r < 255 && rgb.g > 0 && rgb.g < 255 && rgb.b > 0 && rgb.b < 255;
}

/**
 * Gamut map an OKLCH color to fit within sRGB
 * Preserves hue and lightness, reduces chroma if needed
 */
export function gamutMap(oklch: OKLCH): OKLCH {
  if (isInGamut(oklch)) {
    return oklch;
  }

  // Binary search for maximum chroma that fits in gamut
  let minC = 0;
  let maxC = oklch.c;
  let bestC = 0;

  for (let i = 0; i < 12; i++) {
    const midC = (minC + maxC) / 2;
    const testColor: OKLCH = { ...oklch, c: midC };
    
    if (isInGamut(testColor)) {
      bestC = midC;
      minC = midC;
    } else {
      maxC = midC;
    }
  }

  return { ...oklch, c: bestC };
}

/**
 * Convert RGB to hex string
 */
export function rgbToHex(rgb: RGB): string {
  const toHex = (n: number): string => n.toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/**
 * Convert hex string to RGB
 */
export function hexToRgb(hex: string): RGB | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Convert OKLCH to hex
 */
export function oklchToHex(oklch: OKLCH): string {
  const mapped = gamutMap(oklch);
  const rgb = oklchToRgb(mapped);
  return rgbToHex(rgb);
}

/**
 * Calculate perceptual distance between two OKLCH colors
 */
export function deltaE(oklch1: OKLCH, oklch2: OKLCH): number {
  // Simple Euclidean distance in OKLCH space
  const dl = oklch1.l - oklch2.l;
  const dc = oklch1.c - oklch2.c;
  // Handle hue wraparound
  let dh = Math.abs(oklch1.h - oklch2.h);
  if (dh > 180) dh = 360 - dh;
  
  // Weighted distance
  return Math.sqrt(dl * dl * 2 + dc * dc + (dh / 180) * (dh / 180));
}

/**
 * Lighten an OKLCH color by a fixed amount
 */
export function lighten(oklch: OKLCH, amount: number): OKLCH {
  return gamutMap({ ...oklch, l: Math.min(1, oklch.l + amount) });
}

/**
 * Darken an OKLCH color by a fixed amount
 */
export function darken(oklch: OKLCH, amount: number): OKLCH {
  return gamutMap({ ...oklch, l: Math.max(0, oklch.l - amount) });
}

/**
 * Rotate hue by degrees
 */
export function rotateHue(oklch: OKLCH, degrees: number): OKLCH {
  return { ...oklch, h: (oklch.h + degrees + 360) % 360 };
}

/**
 * ANSI target hues in OKLCH space
 */
export const ANSI_TARGETS = {
  red: 29,
  yellow: 85,
  green: 150,
  cyan: 200,
  blue: 255,
  magenta: 325,
};

/**
 * Find the nearest ANSI target hue for a given hue
 */
export function nearestAnsiTarget(hue: number): { name: string; angle: number } {
  const targets = Object.entries(ANSI_TARGETS);
  let nearest = targets[0];
  let minDiff = Math.abs(hue - targets[0][1]);
  
  for (const [name, angle] of targets) {
    let diff = Math.abs(hue - angle);
    if (diff > 180) diff = 360 - diff;
    if (diff < minDiff) {
      minDiff = diff;
      nearest = [name, angle];
    }
  }
  
  return { name: nearest[0], angle: nearest[1] };
}
