#!/usr/bin/env node

import { program } from 'commander';
import { processImages } from './utils/image.js';
import { extractDominantColors, normalizeMultiImageBuckets, detectMode } from './color/index.js';
import { generateTheme, StrategyType, generateColorsToml, generateHyprlandConf } from './theme/index.js';
import { exportThemeToZip, exportThemeToOmarchy } from './utils/export.js';
import fs from 'fs/promises';
import path from 'path';

program
  .name('omarchy-theme')
  .description('Generate Omarchy themes from images')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate a theme from one or more images')
  .argument('<images...>', 'Path(s) to image file(s)')
  .option('-n, --name <name>', 'Theme name', 'generated-theme')
  .option('-s, --strategy <strategy>', 'Color strategy (dominant|vibrant|muted|pastel|monochrome|analogous|triadic|split-complementary|complementary)', 'dominant')
  .option('-m, --mode <mode>', 'Theme mode (auto|dark|light)', 'auto')
  .option('-r, --rounded', 'Enable rounded corners', false)
  .option('-t, --transparency', 'Enable transparency effects', false)
  .option('-w, --walker-size <size>', 'Walker size (small|medium|large)', 'medium')
  .option('-o, --output <path>', 'Output path for zip file')
  .option('--install', 'Install directly to Omarchy themes directory', false)
  .action(async (images: string[], options) => {
    try {
      console.log(`Processing ${images.length} image(s)...`);
      
      // Process images
      const processed = await processImages(images);
      
      if (processed.length === 0) {
        console.error('No images could be processed');
        process.exit(1);
      }
      
      // Extract colors
      const bucketsPerImage = processed.map(p => 
        extractDominantColors(p.pixels, { maxColors: 16 })
      );
      
      const normalizedBuckets = normalizeMultiImageBuckets(bucketsPerImage);
      
      // Detect mode
      const mode = options.mode === 'auto' 
        ? detectMode(normalizedBuckets) 
        : options.mode;
      
      // Generate theme
      const theme = generateTheme(normalizedBuckets, options.name, {
        mode,
        strategy: options.strategy as StrategyType,
        rounded_corners: options.rounded,
        transparency: options.transparency,
        walker_size: options.walkerSize,
      });
      
      console.log('\nGenerated theme:', theme.name);
      console.log('Mode:', theme.mode);
      console.log('Strategy:', theme.strategy);
      console.log('\nSemantic Colors:');
      console.log('  Background:', theme.colors.background);
      console.log('  Panel:', theme.colors.panel_background);
      console.log('  Foreground:', theme.colors.foreground);
      console.log('  Accent:', theme.colors.accent);
      console.log('\nANSI Palette:');
      for (let i = 0; i < 16; i++) {
        console.log(`  Color${i}:`, theme.colors[`color${i}` as keyof typeof theme.colors]);
      }
      
      // Export
      if (options.install) {
        const themeDir = await exportThemeToOmarchy(theme, images);
        console.log(`\nTheme installed to: ${themeDir}`);
        console.log(`Run: omarchy-theme-set "${theme.name}"`);
      } else {
        const outputPath = options.output || path.join(
          process.env.HOME || '/home/user',
          'Downloads',
          `${theme.name}.zip`
        );
        await exportThemeToZip(theme, images, outputPath);
        console.log(`\nTheme exported to: ${outputPath}`);
        console.log(`\nTo install, run:`);
        console.log(`  unzip -o ${outputPath} -d ~/.config/omarchy/themes/ && omarchy-theme-set "${theme.name}"`);
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('preview')
  .description('Preview a theme without exporting')
  .argument('<image>', 'Path to image file')
  .option('-s, --strategy <strategy>', 'Color strategy', 'dominant')
  .option('-m, --mode <mode>', 'Theme mode (auto|dark|light)', 'auto')
  .action(async (image: string, options) => {
    try {
      const processed = await processImages([image]);
      
      if (processed.length === 0) {
        console.error('Could not process image');
        process.exit(1);
      }
      
      const buckets = extractDominantColors(processed[0].pixels, { maxColors: 16 });
      const mode = options.mode === 'auto' ? detectMode(buckets) : options.mode;
      
      const theme = generateTheme(buckets, 'preview', {
        mode,
        strategy: options.strategy as StrategyType,
      });
      
      console.log('\nTheme Preview:', theme.name);
      console.log('Mode:', theme.mode);
      console.log('Strategy:', theme.strategy);
      console.log('\ncolors.toml:');
      console.log(generateColorsToml(theme));
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

export function runCli() {
  program.parse();
}

// Run CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runCli();
}
