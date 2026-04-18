/**
 * Color quantization and palette extraction
 */

import { rgbToOklch, OKLCH, deltaE, RGB } from './oklch.js';

export interface ColorBucket {
  oklch: OKLCH;
  count: number;
  rgb: RGB;
  weight?: number; // Optional weight for strategy calculations
}

export interface QuantizationOptions {
  maxColors?: number;
  minDistance?: number;
  bitDepth?: number;
}

/**
 * Quantize a list of RGB pixels into color buckets
 * Uses 5-bit per channel quantization (32 levels per channel)
 */
export function quantizePixels(
  pixels: RGB[],
  options: QuantizationOptions = {}
): ColorBucket[] {
  const { bitDepth = 5 } = options;
  const levels = 1 << bitDepth; // 2^bitDepth levels
  const mask = 0xFF << (8 - bitDepth); // Mask to quantize to bitDepth

  const bucketMap = new Map<string, { rgb: RGB; count: number }>();

  // Quantize each pixel
  for (const pixel of pixels) {
    const quantized: RGB = {
      r: pixel.r & mask,
      g: pixel.g & mask,
      b: pixel.b & mask,
    };

    const key = `${quantized.r},${quantized.g},${quantized.b}`;
    const existing = bucketMap.get(key);
    
    if (existing) {
      existing.count++;
    } else {
      bucketMap.set(key, { rgb: quantized, count: 1 });
    }
  }

  // Convert to buckets with OKLCH
  const buckets: ColorBucket[] = [];
  for (const { rgb, count } of bucketMap.values()) {
    const oklch = rgbToOklch(rgb);
    buckets.push({ oklch, count, rgb });
  }

  // Sort by count (descending)
  return buckets.sort((a, b) => b.count - a.count);
}

/**
 * Merge perceptually similar colors
 */
export function mergeSimilarColors(
  buckets: ColorBucket[],
  minDistance: number = 15
): ColorBucket[] {
  const merged: ColorBucket[] = [];

  for (const bucket of buckets) {
    let mergedWith: ColorBucket | null = null;

    for (const existing of merged) {
      if (deltaE(bucket.oklch, existing.oklch) < minDistance) {
        mergedWith = existing;
        break;
      }
    }

    if (mergedWith) {
      // Weighted average
      const totalCount = mergedWith.count + bucket.count;
      mergedWith.oklch.l = (mergedWith.oklch.l * mergedWith.count + bucket.oklch.l * bucket.count) / totalCount;
      mergedWith.oklch.c = (mergedWith.oklch.c * mergedWith.count + bucket.oklch.c * bucket.count) / totalCount;
      
      // Weighted hue average (handle wraparound)
      const h1 = mergedWith.oklch.h;
      const h2 = bucket.oklch.h;
      let diff = h2 - h1;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      mergedWith.oklch.h = (h1 + (diff * bucket.count / totalCount) + 360) % 360;
      
      mergedWith.count = totalCount;
    } else {
      merged.push({ ...bucket });
    }
  }

  return merged.sort((a, b) => b.count - a.count);
}

/**
 * Extract dominant colors from image pixels
 */
export function extractDominantColors(
  pixels: RGB[],
  options: QuantizationOptions = {}
): ColorBucket[] {
  const { maxColors = 16, minDistance = 15 } = options;

  // Quantize
  let buckets = quantizePixels(pixels, options);
  
  // Merge similar colors
  buckets = mergeSimilarColors(buckets, minDistance);
  
  // Take top colors
  return buckets.slice(0, maxColors);
}

/**
 * Normalize buckets from multiple images
 * Each image contributes equally regardless of size
 */
export function normalizeMultiImageBuckets(
  allBuckets: ColorBucket[][]
): ColorBucket[] {
  if (allBuckets.length === 0) return [];
  if (allBuckets.length === 1) return allBuckets[0];

  // Calculate normalization factor per image
  const imageTotals = allBuckets.map(buckets => 
    buckets.reduce((sum, b) => sum + b.count, 0)
  );

  const normalizedBuckets: ColorBucket[] = [];
  
  for (let i = 0; i < allBuckets.length; i++) {
    const buckets = allBuckets[i];
    const total = imageTotals[i];
    const factor = 1000 / total; // Normalize to ~1000 per image

    for (const bucket of buckets) {
      normalizedBuckets.push({
        ...bucket,
        count: Math.round(bucket.count * factor),
      });
    }
  }

  // Merge across all images
  return mergeSimilarColors(normalizedBuckets, 20).sort((a, b) => b.count - a.count);
}

/**
 * Detect if colors suggest dark or light mode
 * Based on average perceived brightness
 */
export function detectMode(buckets: ColorBucket[]): 'dark' | 'light' {
  if (buckets.length === 0) return 'dark';

  const totalCount = buckets.reduce((sum, b) => sum + b.count, 0);
  const weightedLightness = buckets.reduce(
    (sum, b) => sum + b.oklch.l * b.count,
    0
  ) / totalCount;

  return weightedLightness < 0.55 ? 'dark' : 'light';
}

/**
 * Get the dominant hue from buckets
 */
export function getDominantHue(buckets: ColorBucket[]): number | null {
  if (buckets.length === 0) return null;

  // Weighted average of hues
  const totalChroma = buckets.reduce((sum, b) => sum + b.oklch.c * b.count, 0);
  
  if (totalChroma === 0) return null;

  let weightedSin = 0;
  let weightedCos = 0;

  for (const bucket of buckets) {
    const rad = bucket.oklch.h * Math.PI / 180;
    const weight = bucket.oklch.c * bucket.count;
    weightedSin += Math.sin(rad) * weight;
    weightedCos += Math.cos(rad) * weight;
  }

  const avgHue = (Math.atan2(weightedSin, weightedCos) * 180 / Math.PI + 360) % 360;
  return avgHue;
}
