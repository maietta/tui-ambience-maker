/**
 * Image processing utilities using jimp (pure JavaScript - no native dependencies)
 */

import { Jimp } from 'jimp';
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
  // Read image with jimp
  const image = await Jimp.read(imagePath);
  
  // Calculate dimensions to fit within 256px
  const maxSize = 256;
  let width = image.width;
  let height = image.height;
  
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

  // Resize image
  image.resize({ w: width, h: height });

  // Extract RGB pixels
  const pixels: RGB[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const color = image.getPixelColor(x, y);
      // Jimp returns 0xRRGGBBAA format
      const r = (color >> 24) & 0xFF;
      const g = (color >> 16) & 0xFF;
      const b = (color >> 8) & 0xFF;
      pixels.push({ r, g, b });
    }
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
  
  for (const imagePath of imagePaths) {
    try {
      const processed = await processImage(imagePath);
      results.push(processed);
    } catch (error) {
      console.warn(`Failed to process image: ${imagePath}`, error);
    }
  }
  
  return results;
}

/**
 * Load an image for preview/display
 */
export async function loadImageData(imagePath: string): Promise<Buffer> {
  const image = await Jimp.read(imagePath);
  image.resize({ w: 800, h: 600 });
  return await image.getBuffer('image/jpeg');
}
