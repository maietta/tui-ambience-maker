/**
 * Color strategies for theme generation
 */

import { ColorBucket, OKLCH, ANSI_TARGETS, nearestAnsiTarget, gamutMap, rotateHue, lighten, darken } from '../color/index.js';

export type StrategyType = 
  | 'dominant' 
  | 'vibrant' 
  | 'muted' 
  | 'pastel'
  | 'monochrome'
  | 'analogous'
  | 'triadic'
  | 'split-complementary'
  | 'complementary';

export interface StrategyResult {
  colors: OKLCH[];
  accent: OKLCH;
  dominantHue: number;
}

/**
 * Apply different weight functions to color buckets
 */
export function applyStrategyWeights(
  buckets: ColorBucket[],
  strategy: StrategyType
): ColorBucket[] {
  const weighted = buckets.map(bucket => {
    let weight = bucket.count;
    const { l, c } = bucket.oklch;

    switch (strategy) {
      case 'dominant':
        // Pure frequency
        weight = bucket.count;
        break;

      case 'vibrant':
        // Heavy chroma bias: count × (0.4 + 3.0·C)
        weight = bucket.count * (0.4 + 3.0 * c);
        break;

      case 'muted':
        // Anti-chroma bias: count × (1.3 − C)
        weight = bucket.count * Math.max(0.1, 1.3 - c);
        break;

      case 'pastel':
        // Bright and soft: count × max(0.3, L) × (1.2 − 0.5·C)
        weight = bucket.count * Math.max(0.3, l) * (1.2 - 0.5 * c);
        break;

      case 'monochrome':
        // Find single most saturated: count × (0.25 + 3.5·C)
        weight = bucket.count * (0.25 + 3.5 * c);
        break;

      case 'analogous':
      case 'triadic':
      case 'split-complementary':
      case 'complementary':
        // Moderate vivid bias for anchor: count × (0.5 + 1.8·C)
        weight = bucket.count * (0.5 + 1.8 * c);
        break;
    }

    return { ...bucket, weight };
  });

  return weighted.sort((a, b) => b.weight - a.weight);
}

/**
 * Generate ANSI color palette from buckets using image-based strategy
 */
export function generateAnsiFromImage(
  buckets: ColorBucket[],
  strategy: 'dominant' | 'vibrant' | 'muted' | 'pastel',
  mode: 'dark' | 'light'
): OKLCH[] {
  const weighted = applyStrategyWeights(buckets, strategy);
  const targetHues = Object.values(ANSI_TARGETS);
  const colors: OKLCH[] = [];

  // For each ANSI target, find the closest weighted color
  for (const targetHue of targetHues) {
    let bestColor: OKLCH | null = null;
    let bestScore = -Infinity;

    for (const bucket of weighted) {
      const { l, c, h } = bucket.oklch;
      
      // Calculate hue distance
      let hueDiff = Math.abs(h - targetHue);
      if (hueDiff > 180) hueDiff = 360 - hueDiff;

      // Score based on weight and hue proximity
      const hueScore = Math.max(0, 1 - hueDiff / 60); // Within 60° is best
      const score = (bucket.weight || bucket.count) * hueScore;

      if (score > bestScore) {
        bestScore = score;
        
        // Adjust based on strategy
        let adjustedL = l;
        let adjustedC = c;

        switch (strategy) {
          case 'vibrant':
            adjustedC = Math.min(0.25, c * 1.2);
            break;
          case 'muted':
            adjustedC = c * 0.5;
            break;
          case 'pastel':
            adjustedL = Math.min(0.85, l + 0.1);
            adjustedC = Math.min(0.08, c * 0.6);
            break;
        }

        bestColor = gamutMap({ l: adjustedL, c: adjustedC, h });
      }
    }

    if (bestColor) {
      colors.push(bestColor);
    }
  }

  // Fill any missing slots with derived colors
  while (colors.length < 6) {
    const last = colors[colors.length - 1] || weighted[0]?.oklch;
    if (last) {
      colors.push(rotateHue(last, 30));
    } else {
      colors.push({ l: mode === 'dark' ? 0.6 : 0.4, c: 0.1, h: 0 });
    }
  }

  return colors;
}

/**
 * Generate colors using harmonic strategy
 */
export function generateHarmonicColors(
  buckets: ColorBucket[],
  strategy: 'monochrome' | 'analogous' | 'triadic' | 'split-complementary' | 'complementary',
  mode: 'dark' | 'light'
): OKLCH[] {
  const weighted = applyStrategyWeights(buckets, strategy);
  
  // Get dominant hue
  let dominantHue = 200; // Default teal
  let dominantChroma = 0.14;
  
  if (weighted.length > 0) {
    const top = weighted[0].oklch;
    dominantHue = top.h;
    dominantChroma = top.c;
  }

  const colors: OKLCH[] = [];

  switch (strategy) {
    case 'monochrome':
      // All slots derived from one dominant hue
      colors.push({ l: mode === 'dark' ? 0.76 : 0.44, c: dominantChroma, h: dominantHue });
      colors.push({ l: mode === 'dark' ? 0.76 : 0.44, c: dominantChroma, h: (dominantHue + 20) % 360 });
      colors.push({ l: mode === 'dark' ? 0.76 : 0.44, c: dominantChroma, h: (dominantHue - 15) % 360 });
      colors.push({ l: mode === 'dark' ? 0.76 : 0.44, c: dominantChroma, h: (dominantHue + 35) % 360 });
      colors.push({ l: mode === 'dark' ? 0.76 : 0.44, c: dominantChroma, h: (dominantHue - 30) % 360 });
      colors.push({ l: mode === 'dark' ? 0.76 : 0.44, c: dominantChroma, h: (dominantHue + 10) % 360 });
      break;

    case 'analogous':
      // All within ~90° of dominant
      colors.push({ l: mode === 'dark' ? 0.76 : 0.44, c: dominantChroma, h: (dominantHue - 45 + 360) % 360 });
      colors.push({ l: mode === 'dark' ? 0.76 : 0.44, c: dominantChroma, h: (dominantHue - 20 + 360) % 360 });
      colors.push({ l: mode === 'dark' ? 0.76 : 0.44, c: dominantChroma, h: (dominantHue - 5 + 360) % 360 });
      colors.push({ l: mode === 'dark' ? 0.76 : 0.44, c: dominantChroma, h: (dominantHue + 10) % 360 });
      colors.push({ l: mode === 'dark' ? 0.76 : 0.44, c: dominantChroma, h: (dominantHue + 25) % 360 });
      colors.push({ l: mode === 'dark' ? 0.76 : 0.44, c: dominantChroma, h: (dominantHue + 45) % 360 });
      break;

    case 'triadic':
      // Three hues 120° apart
      const h2 = (dominantHue + 120) % 360;
      const h3 = (dominantHue + 240) % 360;
      colors.push({ l: mode === 'dark' ? 0.76 : 0.44, c: dominantChroma, h: (dominantHue - 5 + 360) % 360 });
      colors.push({ l: mode === 'dark' ? 0.76 : 0.44, c: dominantChroma, h: (dominantHue + 20) % 360 });
      colors.push({ l: mode === 'dark' ? 0.76 : 0.44, c: dominantChroma, h: (h2 - 10 + 360) % 360 });
      colors.push({ l: mode === 'dark' ? 0.76 : 0.44, c: dominantChroma, h: (h2 + 10) % 360 });
      colors.push({ l: mode === 'dark' ? 0.76 : 0.44, c: dominantChroma, h: (h3 - 20 + 360) % 360 });
      colors.push({ l: mode === 'dark' ? 0.76 : 0.44, c: dominantChroma, h: (h3 + 5) % 360 });
      break;

    case 'split-complementary':
      // Dominant + two hues adjacent to its complement
      const complement = (dominantHue + 180) % 360;
      colors.push({ l: mode === 'dark' ? 0.76 : 0.44, c: dominantChroma, h: dominantHue });
      colors.push({ l: mode === 'dark' ? 0.76 : 0.44, c: dominantChroma, h: (dominantHue + 20) % 360 });
      colors.push({ l: mode === 'dark' ? 0.76 : 0.44, c: dominantChroma, h: (complement - 30 + 360) % 360 });
      colors.push({ l: mode === 'dark' ? 0.76 : 0.44, c: dominantChroma, h: (complement - 10 + 360) % 360 });
      colors.push({ l: mode === 'dark' ? 0.76 : 0.44, c: dominantChroma, h: (complement + 50) % 360 });
      colors.push({ l: mode === 'dark' ? 0.76 : 0.44, c: dominantChroma, h: (complement + 65) % 360 });
      break;

    case 'complementary':
      // Dominant + opposite
      const comp = (dominantHue + 180) % 360;
      colors.push({ l: mode === 'dark' ? 0.76 : 0.44, c: dominantChroma, h: dominantHue });
      colors.push({ l: mode === 'dark' ? 0.76 : 0.44, c: dominantChroma, h: (dominantHue - 18 + 360) % 360 });
      colors.push({ l: mode === 'dark' ? 0.76 : 0.44, c: dominantChroma, h: (dominantHue + 18) % 360 });
      colors.push({ l: mode === 'dark' ? 0.76 : 0.44, c: dominantChroma, h: (comp - 20 + 360) % 360 });
      colors.push({ l: mode === 'dark' ? 0.76 : 0.44, c: dominantChroma, h: (comp - 2 + 360) % 360 });
      colors.push({ l: mode === 'dark' ? 0.76 : 0.44, c: dominantChroma, h: (comp + 20) % 360 });
      break;
  }

  return colors.map(gamutMap);
}

/**
 * Generate bright variants of colors
 * Boost L by 0.08 perceptually
 */
export function generateBrightVariants(colors: OKLCH[]): OKLCH[] {
  return colors.map(c => gamutMap({ ...c, l: Math.min(1, c.l + 0.08) }));
}

/**
 * Select accent color from buckets
 */
export function selectAccent(
  buckets: ColorBucket[],
  mode: 'dark' | 'light',
  pinnedColor?: OKLCH
): OKLCH {
  if (pinnedColor) {
    return pinnedColor;
  }

  // Prefer high chroma colors in mid-lightness range
  const candidates = buckets.filter(b => {
    const l = b.oklch.l;
    return mode === 'dark' ? l > 0.5 : l < 0.7;
  });

  if (candidates.length === 0) {
    return { l: mode === 'dark' ? 0.7 : 0.4, c: 0.16, h: 255 };
  }

  // Sort by chroma * lightness visibility
  candidates.sort((a, b) => {
    const scoreA = a.oklch.c * (mode === 'dark' ? a.oklch.l : (1 - a.oklch.l));
    const scoreB = b.oklch.c * (mode === 'dark' ? b.oklch.l : (1 - b.oklch.l));
    return scoreB - scoreA;
  });

  return candidates[0].oklch;
}

/**
 * Calculate background color based on mode and dominant hue
 */
export function calculateBackground(
  dominantHue: number,
  mode: 'dark' | 'light'
): OKLCH {
  if (mode === 'dark') {
    // Near-black with slight tint
    return gamutMap({ l: 0.16, c: 0.02, h: dominantHue });
  } else {
    // Near-white with slight tint
    return gamutMap({ l: 0.97, c: 0.005, h: dominantHue });
  }
}

/**
 * Calculate panel elevation color
 */
export function calculatePanelBackground(
  background: OKLCH,
  mode: 'dark' | 'light'
): OKLCH {
  if (mode === 'dark') {
    // ~6 points brighter
    return gamutMap({ ...background, l: Math.min(1, background.l + 0.06), c: Math.min(0.1, background.c * 1.2) });
  } else {
    // ~5 points darker
    return gamutMap({ ...background, l: Math.max(0, background.l - 0.05), c: Math.min(0.1, background.c * 1.2) });
  }
}

/**
 * Calculate foreground color
 */
export function calculateForeground(
  background: OKLCH,
  mode: 'dark' | 'light'
): OKLCH {
  if (mode === 'dark') {
    return gamutMap({ l: 0.92, c: 0.01, h: background.h });
  } else {
    return gamutMap({ l: 0.28, c: 0.02, h: background.h });
  }
}
