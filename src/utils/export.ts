import JSZip from 'jszip';
import { ThemeConfig, generateColorsToml, generateHyprlandConf } from '../theme/index.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Export theme to a zip file
 */
export async function exportThemeToZip(
  theme: ThemeConfig,
  backgroundPaths: string[],
  outputPath: string
): Promise<void> {
  const zip = new JSZip();
  
  // Add colors.toml
  zip.file('colors.toml', generateColorsToml(theme));
  
  // Add hyprland.conf if there are overrides
  const hyprlandConf = generateHyprlandConf(theme);
  if (hyprlandConf.trim()) {
    zip.file('hyprland.conf', hyprlandConf);
  }
  
  // Add backgrounds
  const backgroundsFolder = zip.folder('backgrounds');
  if (backgroundsFolder) {
    for (let i = 0; i < backgroundPaths.length; i++) {
      const bgPath = backgroundPaths[i];
      const data = await fs.readFile(bgPath);
      const ext = path.extname(bgPath);
      backgroundsFolder.file(`background-${i + 1}${ext}`, data);
    }
  }
  
  // Generate zip
  const content = await zip.generateAsync({ type: 'nodebuffer' });
  await fs.writeFile(outputPath, content);
}

/**
 * Export theme directly to Omarchy themes directory
 */
export async function exportThemeToOmarchy(
  theme: ThemeConfig,
  backgroundPaths: string[]
): Promise<string> {
  const homeDir = process.env.HOME || '/home/user';
  const themeDir = path.join(homeDir, '.config', 'omarchy', 'themes', theme.name);
  
  // Create directory
  await fs.mkdir(themeDir, { recursive: true });
  
  // Write colors.toml
  await fs.writeFile(
    path.join(themeDir, 'colors.toml'),
    generateColorsToml(theme)
  );
  
  // Write hyprland.conf if needed
  const hyprlandConf = generateHyprlandConf(theme);
  if (hyprlandConf.trim()) {
    await fs.writeFile(
      path.join(themeDir, 'hyprland.conf'),
      hyprlandConf
    );
  }
  
  // Copy backgrounds
  const backgroundsDir = path.join(themeDir, 'backgrounds');
  await fs.mkdir(backgroundsDir, { recursive: true });
  
  for (let i = 0; i < backgroundPaths.length; i++) {
    const bgPath = backgroundPaths[i];
    const ext = path.extname(bgPath);
    await fs.copyFile(bgPath, path.join(backgroundsDir, `background-${i + 1}${ext}`));
  }
  
  return themeDir;
}
