/**
 * Premium Multi-Theme System
 * Industry-grade color palettes with dynamic switching
 */

export const themes = {
  identity: {
    name: 'Identity Classic',
    bg0: '#fafaf8',
    bg1: '#f5f3f0',
    bg2: '#f0e9e0',
    surface0: 'rgba(255, 255, 255, 0.98)',
    surface1: 'rgba(255, 255, 255, 0.94)',
    surface2: 'rgba(253, 251, 248, 0.96)',
    line: 'rgba(38, 36, 34, 0.1)',
    text0: '#1a1a1a',
    text1: '#3a3a3a',
    text2: '#6b7280',
    brandA: '#0d9488',
    brandB: '#f59e0b',
    brandC: '#ec4899',
    brandD: '#9ca3af',
    brandE: '#64748b',
    ok: '#16a34a',
    warn: '#d97706',
    danger: '#dc2626',
  },
  evangelism: {
    name: 'Evangelism Warm',
    bg0: '#faf8f5',
    bg1: '#f5f1eb',
    bg2: '#f0e9de',
    surface0: 'rgba(255, 255, 255, 0.98)',
    surface1: 'rgba(255, 255, 255, 0.94)',
    surface2: 'rgba(253, 250, 245, 0.96)',
    line: 'rgba(38, 36, 34, 0.1)',
    text0: '#1a1a1a',
    text1: '#3a3a3a',
    text2: '#6b7280',
    brandA: '#f59e0b',
    brandB: '#d97706',
    brandC: '#ec4899',
    brandD: '#9ca3af',
    brandE: '#64748b',
    ok: '#16a34a',
    warn: '#d97706',
    danger: '#dc2626',
  },
  compassion: {
    name: 'Compassion Rose',
    bg0: '#faf7f6',
    bg1: '#f5f0ee',
    bg2: '#f0e9e5',
    surface0: 'rgba(255, 255, 255, 0.98)',
    surface1: 'rgba(255, 255, 255, 0.94)',
    surface2: 'rgba(253, 250, 248, 0.96)',
    line: 'rgba(38, 36, 34, 0.1)',
    text0: '#1a1a1a',
    text1: '#3a3a3a',
    text2: '#6b7280',
    brandA: '#ec4899',
    brandB: '#f472b6',
    brandC: '#0d9488',
    brandD: '#f59e0b',
    brandE: '#9ca3af',
    ok: '#16a34a',
    warn: '#d97706',
    danger: '#dc2626',
  },
  discipleship: {
    name: 'Discipleship Stone',
    bg0: '#faf9f7',
    bg1: '#f5f3f0',
    bg2: '#f0e9e0',
    surface0: 'rgba(255, 255, 255, 0.98)',
    surface1: 'rgba(255, 255, 255, 0.94)',
    surface2: 'rgba(253, 251, 248, 0.96)',
    line: 'rgba(38, 36, 34, 0.1)',
    text0: '#1a1a1a',
    text1: '#3a3a3a',
    text2: '#6b7280',
    brandA: '#0d9488',
    brandB: '#9ca3af',
    brandC: '#f59e0b',
    brandD: '#ec4899',
    brandE: '#64748b',
    ok: '#16a34a',
    warn: '#d97706',
    danger: '#dc2626',
  },
};

export const defaultTheme = 'identity';

export function applyTheme(themeName) {
  const theme = themes[themeName] || themes[defaultTheme];
  const root = document.documentElement;

  root.style.setProperty('--bg-0', theme.bg0);
  root.style.setProperty('--bg-1', theme.bg1);
  root.style.setProperty('--bg-2', theme.bg2);
  root.style.setProperty('--surface-0', theme.surface0);
  root.style.setProperty('--surface-1', theme.surface1);
  root.style.setProperty('--surface-2', theme.surface2);
  root.style.setProperty('--line', theme.line);
  root.style.setProperty('--text-0', theme.text0);
  root.style.setProperty('--text-1', theme.text1);
  root.style.setProperty('--text-2', theme.text2);
  root.style.setProperty('--brand-a', theme.brandA);
  root.style.setProperty('--brand-b', theme.brandB);
  root.style.setProperty('--brand-c', theme.brandC);
  root.style.setProperty('--brand-d', theme.brandD);
  root.style.setProperty('--brand-e', theme.brandE);
  root.style.setProperty('--ok', theme.ok);
  root.style.setProperty('--warn', theme.warn);
  root.style.setProperty('--danger', theme.danger);

  localStorage.setItem('lifegate-theme', themeName);
}

export function getStoredTheme() {
  const stored = localStorage.getItem('lifegate-theme');
  return stored && themes[stored] ? stored : defaultTheme;
}
