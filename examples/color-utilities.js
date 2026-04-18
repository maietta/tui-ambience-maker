/**
 * Example: Using the color utilities directly
 */

import { rgbToOklch, oklchToHex, hexToRgb, gamutMap, ANSI_TARGETS } from '../src/color/oklch.js';

// Example 1: Convert RGB to OKLCH
const rgb = { r: 122, g: 162, b: 247 }; // A nice blue
const oklch = rgbToOklch(rgb);
console.log('RGB to OKLCH:');
console.log('  RGB:', rgb);
console.log('  OKLCH:', oklch);

// Example 2: Convert OKLCH back to hex
const hex = oklchToHex(oklch);
console.log('\nOKLCH to Hex:', hex);

// Example 3: Gamut mapping (ensure color is displayable)
const outOfGamut = { l: 0.9, c: 0.4, h: 255 }; // Very saturated light blue
const inGamut = gamutMap(outOfGamut);
console.log('\nGamut mapping:');
console.log('  Before:', outOfGamut);
console.log('  After:', inGamut);
console.log('  Hex:', oklchToHex(inGamut));

// Example 4: ANSI target hues
console.log('\nANSI target hues:');
Object.entries(ANSI_TARGETS).forEach(([name, angle]) => {
  const targetColor = gamutMap({ l: 0.7, c: 0.16, h: angle });
  console.log(`  ${name}: ${angle}° - ${oklchToHex(targetColor)}`);
});

// Example 5: Hex to RGB
const parsedRgb = hexToRgb('#7aa2f7');
console.log('\nHex to RGB:', parsedRgb);
