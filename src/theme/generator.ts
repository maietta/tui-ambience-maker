/**
 * Theme generation and export
 */

import { OKLCH, rgbToHex, hexToRgb, oklchToHex, oklchToRgb, RGB } from '../color/oklch.js';
import { ColorBucket } from '../color/quantization.js';
import { 
  StrategyType, 
  generateAnsiFromImage, 
  generateHarmonicColors,
  generateBrightVariants,
  selectAccent,
  calculateBackground,
  calculatePanelBackground,
  calculateForeground,
} from './strategies.js';

export interface ThemeColors {
  background: string;
  panel_background: string;
  foreground: string;
  accent: string;
  cursor: string;
  selection_background: string;
  selection_foreground: string;
  color0: string;
  color1: string;
  color2: string;
  color3: string;
  color4: string;
  color5: string;
  color6: string;
  color7: string;
  color8: string;
  color9: string;
  color10: string;
  color11: string;
  color12: string;
  color13: string;
  color14: string;
  color15: string;
}

export interface ThemeConfig {
  name: string;
  mode: 'dark' | 'light';
  strategy: StrategyType;
  colors: ThemeColors;
  rounded_corners: boolean;
  transparency: boolean;
  walker_size: 'small' | 'medium' | 'large';
  rotation_index: number;
}

export interface ThemeGenerationOptions {
  mode?: 'dark' | 'light' | 'auto';
  strategy?: StrategyType;
  rounded_corners?: boolean;
  transparency?: boolean;
  walker_size?: 'small' | 'medium' | 'large';
  pinnedAccent?: OKLCH;
  rotation_index?: number;
}

// Hue rotation schedule for Regenerate button
const ROTATIONS = [0, 25, -25, 50, -50, 12, -12, 75, -75];

/**
 * Generate a theme from color buckets
 */
export function generateTheme(
  buckets: ColorBucket[],
  name: string,
  options: ThemeGenerationOptions = {}
): ThemeConfig {
  const {
    mode: modeOption = 'auto',
    strategy = 'dominant',
    rounded_corners = false,
    transparency = false,
    walker_size = 'medium',
    pinnedAccent,
    rotation_index = 0,
  } = options;

  // Detect mode
  const mode = modeOption === 'auto' 
    ? (buckets.some(b => b.oklch.l > 0.5 && b.count > 100) ? 'light' : 'dark')
    : modeOption;

  // Get dominant hue
  const dominantHue = buckets.length > 0 ? buckets[0].oklch.h : 200;

  // Apply rotation
  const rotation = ROTATIONS[rotation_index % ROTATIONS.length];
  const rotatedBuckets = buckets.map(b => ({
    ...b,
    oklch: { ...b.oklch, h: (b.oklch.h + rotation + 360) % 360 },
  }));

  // Generate colors based on strategy
  let ansiColors: OKLCH[];
  
  if (['dominant', 'vibrant', 'muted', 'pastel'].includes(strategy)) {
    ansiColors = generateAnsiFromImage(
      rotatedBuckets, 
      strategy as 'dominant' | 'vibrant' | 'muted' | 'pastel',
      mode
    );
  } else {
    ansiColors = generateHarmonicColors(
      rotatedBuckets,
      strategy as 'monochrome' | 'analogous' | 'triadic' | 'split-complementary' | 'complementary',
      mode
    );
  }

  // Generate bright variants
  const brightColors = generateBrightVariants(ansiColors);

  // Select accent
  const accent = pinnedAccent || selectAccent(rotatedBuckets, mode);
  
  // Calculate semantic colors
  const backgroundOk = calculateBackground(dominantHue, mode);
  const panelOk = calculatePanelBackground(backgroundOk, mode);
  const foregroundOk = calculateForeground(backgroundOk, mode);
  
  // Cursor: slightly brighter than foreground
  const cursorOk: OKLCH = { ...foregroundOk, l: Math.min(1, foregroundOk.l + 0.05) };
  
  // Selection colors
  const selectionBgOk: OKLCH = { ...accent, l: mode === 'dark' ? 0.3 : 0.7, c: accent.c * 0.5 };
  const selectionFgOk: OKLCH = foregroundOk;

  // Build theme colors
  const colors: ThemeColors = {
    background: oklchToHex(backgroundOk),
    panel_background: oklchToHex(panelOk),
    foreground: oklchToHex(foregroundOk),
    accent: oklchToHex(accent),
    cursor: oklchToHex(cursorOk),
    selection_background: oklchToHex(selectionBgOk),
    selection_foreground: oklchToHex(selectionFgOk),
    color0: oklchToHex(ansiColors[0] || { l: mode === 'dark' ? 0.2 : 0.9, c: 0, h: 0 }),
    color1: oklchToHex(ansiColors[1] || { l: mode === 'dark' ? 0.76 : 0.44, c: 0.16, h: 29 }),
    color2: oklchToHex(ansiColors[2] || { l: mode === 'dark' ? 0.76 : 0.44, c: 0.16, h: 150 }),
    color3: oklchToHex(ansiColors[3] || { l: mode === 'dark' ? 0.76 : 0.44, c: 0.16, h: 85 }),
    color4: oklchToHex(ansiColors[4] || { l: mode === 'dark' ? 0.76 : 0.44, c: 0.16, h: 255 }),
    color5: oklchToHex(ansiColors[5] || { l: mode === 'dark' ? 0.76 : 0.44, c: 0.16, h: 325 }),
    color6: oklchToHex(ansiColors[0] || { l: mode === 'dark' ? 0.76 : 0.44, c: 0.16, h: 200 }),
    color7: oklchToHex(ansiColors[1] || { l: mode === 'dark' ? 0.5 : 0.6, c: 0, h: 0 }),
    color8: oklchToHex(brightColors[0] || { l: mode === 'dark' ? 0.3 : 0.7, c: 0, h: 0 }),
    color9: oklchToHex(brightColors[1] || { l: mode === 'dark' ? 0.84 : 0.52, c: 0.16, h: 29 }),
    color10: oklchToHex(brightColors[2] || { l: mode === 'dark' ? 0.84 : 0.52, c: 0.16, h: 150 }),
    color11: oklchToHex(brightColors[3] || { l: mode === 'dark' ? 0.84 : 0.52, c: 0.16, h: 85 }),
    color12: oklchToHex(brightColors[4] || { l: mode === 'dark' ? 0.84 : 0.52, c: 0.16, h: 255 }),
    color13: oklchToHex(brightColors[5] || { l: mode === 'dark' ? 0.84 : 0.52, c: 0.16, h: 325 }),
    color14: oklchToHex(brightColors[0] || { l: mode === 'dark' ? 0.84 : 0.52, c: 0.16, h: 200 }),
    color15: oklchToHex(brightColors[1] || { l: mode === 'dark' ? 0.6 : 0.4, c: 0, h: 0 }),
  };

  return {
    name,
    mode,
    strategy,
    colors,
    rounded_corners,
    transparency,
    walker_size,
    rotation_index,
  };
}

/**
 * Generate colors.toml content
 */
export function generateColorsToml(theme: ThemeConfig): string {
  const c = theme.colors;
  
  return `[colors]
background = "${c.background}"
panel_background = "${c.panel_background}"
foreground = "${c.foreground}"
accent = "${c.accent}"
cursor = "${c.cursor}"
selection_background = "${c.selection_background}"
selection_foreground = "${c.selection_foreground}"
color0 = "${c.color0}"
color1 = "${c.color1}"
color2 = "${c.color2}"
color3 = "${c.color3}"
color4 = "${c.color4}"
color5 = "${c.color5}"
color6 = "${c.color6}"
color7 = "${c.color7}"
color8 = "${c.color8}"
color9 = "${c.color9}"
color10 = "${c.color10}"
color11 = "${c.color11}"
color12 = "${c.color12}"
color13 = "${c.color13}"
color14 = "${c.color14}"
color15 = "${c.color15}"
`;
}

/**
 * Generate hyprland.conf overrides
 */
export function generateHyprlandConf(theme: ThemeConfig): string {
  const lines: string[] = [];

  // Rounded corners
  if (theme.rounded_corners) {
    lines.push('decoration { rounding = 4 }');
  }

  // Transparency
  if (theme.transparency) {
    lines.push(`
# Transparency and blur
layerrule = blur, waybar
layerrule = blur, walker
layerrule = blur, gtk-layer-shell
windowrulev2 = opacity 0.95,class:.*
`);
  }

  return lines.join('\n');
}

/**
 * Generate installation instructions
 */
export function generateInstallCommand(themeName: string): string {
  return `unzip -o ~/Downloads/${themeName}.zip -d ~/.config/omarchy/themes/ && omarchy-theme-set "${themeName}"`;
}
