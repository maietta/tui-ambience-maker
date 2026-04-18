#!/usr/bin/env node

/**
 * Example: Generate a theme from an image programmatically
 */

import { processImages } from '../src/utils/image.js';
import { extractDominantColors, normalizeMultiImageBuckets, detectMode } from '../src/color/index.js';
import { generateTheme, generateColorsToml } from '../src/theme/index.js';
import { exportThemeToZip } from '../src/utils/export.js';
import path from 'path';

async function example() {
  // Example image path (replace with actual path)
  const imagePath = './example.jpg';
  
  try {
    // 1. Process the image
    console.log('Processing image...');
    const processed = await processImages([imagePath]);
    
    if (processed.length === 0) {
      console.error('Failed to process image');
      return;
    }
    
    // 2. Extract dominant colors
    console.log('Extracting colors...');
    const buckets = extractDominantColors(processed[0].pixels, { maxColors: 16 });
    console.log(`Found ${buckets.length} dominant colors`);
    
    // 3. Detect mode (dark/light)
    const mode = detectMode(buckets);
    console.log(`Detected mode: ${mode}`);
    
    // 4. Generate theme with various strategies
    const strategies = ['dominant', 'vibrant', 'muted', 'analogous', 'triadic'] as const;
    
    for (const strategy of strategies) {
      console.log(`\nGenerating ${strategy} theme...`);
      
      const theme = generateTheme(buckets, `example-${strategy}`, {
        mode,
        strategy,
        rounded_corners: true,
        transparency: true,
      });
      
      // 5. Print the colors.toml
      console.log('\ncolors.toml:');
      console.log(generateColorsToml(theme));
      
      // 6. Export to zip
      const outputPath = path.join(process.cwd(), `${theme.name}.zip`);
      await exportThemeToZip(theme, [imagePath], outputPath);
      console.log(`Exported to: ${outputPath}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

example();
