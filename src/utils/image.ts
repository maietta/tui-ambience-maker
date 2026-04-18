/**
 * Image processing utilities using sharp
 */

import sharp from 'sharp';
import { RGB } from '../color/index.js';

export interface ProcessedImage {
  path: string;
  pixels: RGB[];
  width: number;
  height: number;
}

/**
 * Process an image file and extract RGB pixels
 * Scales to 256px on longest side for quantization
 */
export async function processImage(imagePath: string): Promise<ProcessedImage> {
  const image = sharp(imagePath);
  const metadata = await image.metadata();
  
  // Calculate dimensions to fit within 256px
  const maxSize = 256;
  let width = metadata.width || 256;
  let height = metadata.height || 256;
  
  if (width > height) {
    if (width > maxSize) {
      height = Math.round((height * maxSize) / width);
      width = maxSize;
    }
  } else {
    if (height > maxSize) {
      width = Math.round((width * maxSize) / height);
      height = maxSize;
    }
  }

  // Resize and extract raw pixels
  const buffer = await image
    .resize(width, height, { fit: 'inside', withoutEnlargement: true })
    .raw()
    .ensureAlpha()
    .toBuffer();

  // Extract RGB pixels (skip alpha channel)
  const pixels: RGB[] = [];
  for (let i = 0; i < buffer.length; i += 4) {
    pixels.push({
      r: buffer[i],
      g: buffer[i + 1],
      b: buffer[i + 2],
    });
  }

  return {
    path: imagePath,
    pixels,
    width,
    height,
  };
}

/**
 * Process multiple images
 */
export async function processImages(imagePaths: string[]): Promise<ProcessedImage[]> {
  const results: ProcessedImage[] = [];
  
  for (const path of imagePaths) {
    try {
      const processed = await processImage(path);
      results.push(processed);
    } catch (error) {
      console.warn(`Failed to process image: ${path}`, error);
    }
  }
  
  return results;
}

/**
 * Load an image for preview/display
 */
export async function loadImageData(imagePath: string): Promise<Buffer> {
  return sharp(imagePath).resize(800, 600, { fit: 'inside' }).toBuffer();
}
