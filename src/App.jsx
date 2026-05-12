import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { updateProfile } from 'firebase/auth';
import {
  Accessibility,
  Activity,
  CalendarDays,
  Bell,
  CheckCircle2,
  ChevronDown,
  Command,
  Gauge,
  Grid,
  Home,
  Loader2,
  LogOut,
  Palette,
  Pencil,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  SunMedium,
  Users,
  X,
} from 'lucide-react';
import { APPS } from './config/apps';
import { useAuth } from './hooks/useAuth';
import { useAppData } from './hooks/useAppData';
import ErrorBoundary from './components/ErrorBoundary';
import LoginScreen from './apps/LoginScreen';
import HomeApp from './apps/HomeApp';
import CommunityApp from './apps/CommunityApp';
import ServicesApp from './apps/ServicesApp';
import MusicApp from './apps/MusicApp';
import PeopleApp from './apps/PeopleApp';
import GivingApp from './apps/GivingApp';
import CalendarApp from './apps/CalendarApp';
import TeamsApp from './apps/TeamsApp';
import WorkflowsApp from './apps/WorkflowsApp';
import SecurityApp from './apps/SecurityApp';
import ReportingApp from './apps/ReportingApp';
import DirectoryIntakeApp from './apps/DirectoryIntakeApp';
import { configureGeminiPolicy } from './lib/gemini';

const THEME_PRESETS = {
  stoneTeal: {
    name: 'Stone & Teal',
    appBg: '#f3f4f6',
    blobA: 'rgba(13, 148, 136, 0.16)',
    blobB: 'rgba(37, 99, 235, 0.10)',
    glassBg: 'rgba(255, 255, 255, 0.68)',
    border: 'rgba(255, 255, 255, 0.45)',
  },
  ivoryBrass: {
    name: 'Ivory & Brass',
    appBg: '#f8f5ed',
    blobA: 'rgba(180, 120, 30, 0.14)',
    blobB: 'rgba(120, 85, 45, 0.10)',
    glassBg: 'rgba(255, 250, 240, 0.70)',
    border: 'rgba(255, 255, 255, 0.42)',
  },
  sandEmber: {
    name: 'Sand & Ember',
    appBg: '#fff7ed',
    blobA: 'rgba(249, 115, 22, 0.15)',
    blobB: 'rgba(190, 24, 93, 0.10)',
    glassBg: 'rgba(255, 250, 245, 0.68)',
    border: 'rgba(255, 255, 255, 0.40)',
  },
  midnightCyan: {
    name: 'Midnight & Cyan',
    appBg: '#e6f1f5',
    blobA: 'rgba(8, 145, 178, 0.16)',
    blobB: 'rgba(15, 23, 42, 0.10)',
    glassBg: 'rgba(245, 252, 255, 0.70)',
    border: 'rgba(255, 255, 255, 0.46)',
  },
  roseClay: {
    name: 'Rose & Clay',
    appBg: '#fff1f2',
    blobA: 'rgba(244, 114, 182, 0.15)',
    blobB: 'rgba(234, 88, 12, 0.10)',
    glassBg: 'rgba(255, 246, 247, 0.72)',
    border: 'rgba(255, 255, 255, 0.44)',
  },
  forestMist: {
    name: 'Forest & Mist',
    appBg: '#ecfdf5',
    blobA: 'rgba(22, 163, 74, 0.14)',
    blobB: 'rgba(6, 95, 70, 0.10)',
    glassBg: 'rgba(244, 255, 250, 0.72)',
    border: 'rgba(255, 255, 255, 0.44)',
  },
  oceanSlate: {
    name: 'Ocean & Slate',
    appBg: '#eff6ff',
    blobA: 'rgba(59, 130, 246, 0.14)',
    blobB: 'rgba(71, 85, 105, 0.10)',
    glassBg: 'rgba(248, 251, 255, 0.72)',
    border: 'rgba(255, 255, 255, 0.44)',
  },
  noirGlow: {
    name: 'Noir Glow',
    appBg: '#0b1020',
    blobA: 'rgba(16, 185, 129, 0.20)',
    blobB: 'rgba(59, 130, 246, 0.18)',
    glassBg: 'rgba(15, 23, 42, 0.72)',
    border: 'rgba(148, 163, 184, 0.28)',
    appText: '#e2e8f0',
    scrollbarThumb: '#334155',
    scrollbarThumbHover: '#475569',
  },
};

const THEME_STORAGE_KEY = 'lifegate.themePreset';
const TEXT_SCALE_STORAGE_KEY = 'lifegate.textScale';
const HIGH_CONTRAST_STORAGE_KEY = 'lifegate.highContrast';
const REDUCED_MOTION_STORAGE_KEY = 'lifegate.reducedMotion';
const THEME_KEYS = Object.keys(THEME_PRESETS);

export default function App() {
  // Custom hooks handle auth state and firestore subscriptions
  const { user, loading: authLoading, isAuthenticated, roleAccess, logout } = useAuth();

  // Destructure role access
  const { isSeniorPastor, isAdmin } = roleAccess;
  const appData = useAppData(isAuthenticated, isAdmin || isSeniorPastor);

  // Local UI state
  const navigate = useNavigate();
  const location = useLocation();
  const isPublicDirectoryIntakeRoute = location.pathname === '/directory-intake';
  const activeApp = location.pathname.replace('/', '') || 'home';
  const setActiveApp = (appId) => navigate(appId === 'home' ? '/' : `/${appId}`);
  const [isAppSwitcherOpen, setIsAppSwitcherOpen] = useState(false);
  const [globalSearchInput, setGlobalSearchInput] = useState('');
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [themePresetKey, setThemePresetKey] = useState(() => {
    if (typeof window === 'undefined') return 'stoneTeal';
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    return saved && THEME_PRESETS[saved] ? saved : 'stoneTeal';
  });
  const [textScale, setTextScale] = useState(() => {
    if (typeof window === 'undefined') return 100;
    const saved = Number(window.localStorage.getItem(TEXT_SCALE_STORAGE_KEY));
    return [100, 110, 120].includes(saved) ? saved : 100;
  });
  const [isHighContrast, setIsHighContrast] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(HIGH_CONTRAST_STORAGE_KEY) === 'true';
  });
  const [isReducedMotion, setIsReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(REDUCED_MOTION_STORAGE_KEY) === 'true';
  });
  const [toastMsg, setToastMsg] = useState(null);
  const toastTimeoutRef = useRef(null);
  const contrastObserverRef = useRef(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [showUsernameOnboarding, setShowUsernameOnboarding] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [usernameSaving, setUsernameSaving] = useState(false);
  const profilePopoverRef = useRef(null);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef(null);

  const themePreset = THEME_PRESETS[themePresetKey] ?? THEME_PRESETS.stoneTeal;
  const isDarkTheme = themePresetKey === 'noirGlow';

  const parseRgbaColor = (colorValue) => {
    if (!colorValue) return null;
    const match = colorValue.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i);
    if (!match) return null;
    return {
      r: Number(match[1]),
      g: Number(match[2]),
      b: Number(match[3]),
      a: match[4] !== undefined ? Number(match[4]) : 1,
    };
  };

  const getRelativeLuminance = ({ r, g, b }) => {
    const normalize = (channel) => {
      const value = channel / 255;
      return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * normalize(r) + 0.7152 * normalize(g) + 0.0722 * normalize(b);
  };

  const getEffectiveBackgroundColor = (element) => {
    let current = element;
    while (current && current !== document.documentElement) {
      const background = parseRgbaColor(window.getComputedStyle(current).backgroundColor);
      if (background && background.a > 0) {
        return background;
      }
      current = current.parentElement;
    }
    return parseRgbaColor(window.getComputedStyle(document.body).backgroundColor) || { r: 11, g: 16, b: 32, a: 1 };
  };

  const applyIntelligentTextContrast = () => {
    const targets = document.querySelectorAll([
      '.theme-dark .text-black',
      '.theme-dark [class*="text-stone-"]',
      '.theme-dark [class*="text-gray-"]',
      '.theme-dark [class*="text-slate-"]',
    ].join(','));

    targets.forEach((node) => {
      const background = getEffectiveBackgroundColor(node);
      const luminance = getRelativeLuminance(background);
      const targetColor = luminance < 0.26 ? '#e2e8f0' : '#0f172a';
      node.style.setProperty('color', targetColor, 'important');
      node.setAttribute('data-auto-contrast', 'true');
    });
  };

  const clearIntelligentTextContrast = () => {
    const targets = document.querySelectorAll('[data-auto-contrast="true"]');
    targets.forEach((node) => {
      node.style.removeProperty('color');
      node.removeAttribute('data-auto-contrast');
    });
  };

  const cycleThemePreset = () => {
    setThemePresetKey((current) => {
      const currentIndex = THEME_KEYS.indexOf(current);
      const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % THEME_KEYS.length : 0;
      return THEME_KEYS[nextIndex];
    });
  };

  const cycleTextScale = () => {
    setTextScale((current) => (current === 100 ? 110 : current === 110 ? 120 : 100));
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastMsg(null), 3000);
  };

  const handleOpenProfile = () => {
    setProfileNameInput(user?.displayName || '');
    setIsProfileOpen(true);
  };

  const handleSaveProfileName = async () => {
    const name = profileNameInput.trim();
    if (!name || !user) return;
    setProfileSaving(true);
    try {
      await updateProfile(user, { displayName: name });
      setIsProfileOpen(false);
      showToast('Display name updated — changes take effect on next page load.');
    } catch (err) {
      showToast(err?.message || 'Failed to update name.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleCompleteUsername = async () => {
    const username = usernameInput.trim();
    const validUsername = /^[a-zA-Z0-9._-]{3,32}$/.test(username);
    if (!validUsername || !user) return;

    setUsernameSaving(true);
    try {
      await updateProfile(user, { displayName: username });
      setShowUsernameOnboarding(false);
      setUsernameInput('');
      showToast('Username saved. Welcome to Lifegate Workspace.');
    } catch (err) {
      showToast(err?.message || 'Failed to save username.');
    } finally {
      setUsernameSaving(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setShowUsernameOnboarding(false);
      return;
    }

    const displayName = String(user.displayName || '').trim();
    if (!displayName) {
      setShowUsernameOnboarding(true);
    } else {
      setShowUsernameOnboarding(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    configureGeminiPolicy(appData.securitySettings);
  }, [appData.securitySettings]);

  // Close notifications panel on outside click
  useEffect(() => {
    if (!isNotifOpen) return;
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isNotifOpen]);

  /**
   * Inactivity auto-logout: 15 minutes
   */
  useEffect(() => {
    let timeoutId;
    const inactivityLimit = 15 * 60 * 1000;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (user) logout().catch(err => console.error('Auto-logout failed:', err));
      }, inactivityLimit);
    };

    if (!isAuthenticated) return undefined;

    resetTimer();
    const eventNames = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    eventNames.forEach((eventName) => window.addEventListener(eventName, resetTimer));

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      eventNames.forEach((eventName) => window.removeEventListener(eventName, resetTimer));
    };
  }, [isAuthenticated, user, logout]);

  /**
   * Global styles: fonts, scrollbar, selection
   */
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      :root {
        --app-bg: ${themePreset.appBg};
        --blob-a: ${themePreset.blobA};
        --blob-b: ${themePreset.blobB};
        --glass-bg: ${themePreset.glassBg};
        --glass-border: ${themePreset.border};
        --app-text: ${themePreset.appText || '#1f2937'};
        --scrollbar-thumb: ${themePreset.scrollbarThumb || '#e7e5e4'};
        --scrollbar-thumb-hover: ${themePreset.scrollbarThumbHover || '#d6d3d1'};
        --text-scale: ${textScale}%;
      }
      html { font-size: var(--text-scale); }
      body {
        background-color: var(--app-bg) !important;
        color: var(--app-text) !important;
        font-family: 'Sora', sans-serif !important;
        ${isHighContrast ? 'filter: contrast(1.16) saturate(1.08);' : ''}
      }
      ::selection { background-color: #7dd3c7 !important; }
      .font-sans { font-family: 'Sora', sans-serif !important; }
      .font-serif { font-family: 'Instrument Serif', serif !important; }
      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 4px; }
      ::-webkit-scrollbar-thumb:hover { background: var(--scrollbar-thumb-hover); }
      .glass-surface {
        background: var(--glass-bg);
        backdrop-filter: blur(10px);
        border: 1px solid var(--glass-border);
      }
      .theme-dark .text-black,
      .theme-dark .text-stone-900,
      .theme-dark .text-stone-800,
      .theme-dark .text-stone-700 {
        color: #f1f5f9 !important;
      }
      .theme-dark .text-stone-600,
      .theme-dark .text-stone-500,
      .theme-dark .text-stone-400 {
        color: #cbd5e1 !important;
      }
      .theme-dark .text-stone-300,
      .theme-dark .text-stone-200 {
        color: #94a3b8 !important;
      }
      .theme-dark .bg-white,
      .theme-dark .bg-white\/70,
      .theme-dark .bg-white\/80,
      .theme-dark .bg-white\/90,
      .theme-dark .bg-gradient-to-r,
      .theme-dark .bg-gradient-to-br,
      .theme-dark .bg-gradient-to-b,
      .theme-dark .bg-gradient-to-l,
      .theme-dark .from-white,
      .theme-dark .to-stone-50,
      .theme-dark .to-stone-100 {
        background-color: #111a2d !important;
        background-image: none !important;
      }
      .theme-dark .from-white,
      .theme-dark .to-stone-50,
      .theme-dark .to-stone-100 {
        --tw-gradient-from: #111a2d !important;
        --tw-gradient-to: #111a2d !important;
        --tw-gradient-stops: #111a2d, #111a2d !important;
      }
      .theme-dark .bg-stone-50,
      .theme-dark .bg-stone-100,
      .theme-dark .bg-stone-200,
      .theme-dark .bg-stone-50\/50 {
        background-color: #0f172a !important;
      }
      .theme-dark .border-stone-200,
      .theme-dark .border-stone-100,
      .theme-dark .border-white\/70,
      .theme-dark .border-white\/80,
      .theme-dark .border-white\/60,
      .theme-dark .border-white\/40 {
        border-color: #24324a !important;
      }
      .theme-dark .hover\:bg-stone-50:hover,
      .theme-dark .hover\:bg-stone-100:hover,
      .theme-dark .hover\:bg-white:hover,
      .theme-dark .hover\:bg-stone-200:hover {
        background-color: #1b2940 !important;
      }
      .theme-dark input,
      .theme-dark textarea,
      .theme-dark select {
        background-color: #0f172a !important;
        color: #e2e8f0 !important;
        border-color: #334155 !important;
      }
      .theme-dark input::placeholder,
      .theme-dark textarea::placeholder {
        color: #94a3b8 !important;
        opacity: 1;
      }
      .theme-dark .bg-stone-900 {
        background-color: #020617 !important;
      }
      .theme-dark .bg-sky-50,
      .theme-dark .bg-sky-100 { background-color: #0c4a6e !important; }
      .theme-dark .bg-teal-50,
      .theme-dark .bg-teal-100 { background-color: #134e4a !important; }
      .theme-dark .bg-emerald-50,
      .theme-dark .bg-emerald-100 { background-color: #14532d !important; }
      .theme-dark .bg-amber-50,
      .theme-dark .bg-amber-100 { background-color: #78350f !important; }
      .theme-dark .bg-orange-50,
      .theme-dark .bg-orange-100 { background-color: #7c2d12 !important; }
      .theme-dark .bg-rose-50,
      .theme-dark .bg-rose-100 { background-color: #881337 !important; }
      .theme-dark .bg-fuchsia-50,
      .theme-dark .bg-fuchsia-100 { background-color: #701a75 !important; }
      .theme-dark .bg-violet-50,
      .theme-dark .bg-violet-100 { background-color: #4c1d95 !important; }
      .theme-dark .bg-indigo-50,
      .theme-dark .bg-indigo-100 { background-color: #312e81 !important; }
      .theme-dark .bg-purple-50,
      .theme-dark .bg-purple-100 { background-color: #581c87 !important; }

      .theme-dark .border-sky-200 { border-color: #38bdf8 !important; }
      .theme-dark .border-teal-200 { border-color: #2dd4bf !important; }
      .theme-dark .border-emerald-200 { border-color: #34d399 !important; }
      .theme-dark .border-amber-200 { border-color: #fbbf24 !important; }
      .theme-dark .border-orange-200 { border-color: #fb923c !important; }
      .theme-dark .border-rose-200 { border-color: #fb7185 !important; }
      .theme-dark .border-fuchsia-200 { border-color: #e879f9 !important; }
      .theme-dark .border-violet-200 { border-color: #a78bfa !important; }
      .theme-dark .border-indigo-200 { border-color: #818cf8 !important; }
      .theme-dark .border-purple-200 { border-color: #c084fc !important; }

      .theme-dark .text-sky-500,
      .theme-dark .text-sky-600,
      .theme-dark .text-sky-700 { color: #38bdf8 !important; }
      .theme-dark .text-teal-500,
      .theme-dark .text-teal-600,
      .theme-dark .text-teal-700 { color: #2dd4bf !important; }
      .theme-dark .text-emerald-500,
      .theme-dark .text-emerald-600,
      .theme-dark .text-emerald-700 { color: #34d399 !important; }
      .theme-dark .text-amber-500,
      .theme-dark .text-amber-600,
      .theme-dark .text-amber-700 { color: #f59e0b !important; }
      .theme-dark .text-orange-500,
      .theme-dark .text-orange-600,
      .theme-dark .text-orange-700 { color: #fb923c !important; }
      .theme-dark .text-rose-500,
      .theme-dark .text-rose-600,
      .theme-dark .text-rose-700 { color: #fb7185 !important; }
      .theme-dark .text-fuchsia-500,
      .theme-dark .text-fuchsia-600,
      .theme-dark .text-fuchsia-700 { color: #e879f9 !important; }
      .theme-dark .text-violet-500,
      .theme-dark .text-violet-600,
      .theme-dark .text-violet-700 { color: #a78bfa !important; }
      .theme-dark .text-indigo-500,
      .theme-dark .text-indigo-600,
      .theme-dark .text-indigo-700 { color: #818cf8 !important; }
      .theme-dark .text-purple-500,
      .theme-dark .text-purple-600,
      .theme-dark .text-purple-700 { color: #c084fc !important; }

      .theme-dark .hover\:bg-sky-100:hover { background-color: #075985 !important; }
      .theme-dark .hover\:bg-teal-100:hover { background-color: #115e59 !important; }
      .theme-dark .hover\:bg-emerald-100:hover { background-color: #166534 !important; }
      .theme-dark .hover\:bg-amber-100:hover { background-color: #92400e !important; }
      .theme-dark .hover\:bg-orange-100:hover { background-color: #9a3412 !important; }
      .theme-dark .hover\:bg-rose-100:hover { background-color: #9f1239 !important; }
      .theme-dark .hover\:bg-violet-100:hover { background-color: #5b21b6 !important; }
      .theme-dark .hover\:bg-indigo-100:hover { background-color: #3730a3 !important; }
      .theme-dark .hover\:bg-purple-100:hover { background-color: #6b21a8 !important; }

      .theme-dark .ring-stone-200,
      .theme-dark .ring-stone-300,
      .theme-dark .ring-offset-2 {
        --tw-ring-color: rgba(51, 65, 85, 0.7) !important;
        --tw-ring-offset-width: 0px !important;
      }
      .theme-dark .text-white {
        color: #f8fafc !important;
      }
      .theme-dark .shadow-sm,
      .theme-dark .shadow-xl,
      .theme-dark .shadow-2xl {
        box-shadow: 0 10px 30px rgba(2, 6, 23, 0.45) !important;
      }
      @keyframes floaty {
        0%, 100% { transform: translateY(0px) translateX(0px); }
        50% { transform: translateY(-8px) translateX(5px); }
      }
      .ambient-blob {
        animation: ${isReducedMotion ? 'none' : 'floaty 9s ease-in-out infinite'};
      }
      .app-scene-enter {
        animation: ${isReducedMotion ? 'none' : 'scene-enter 260ms ease-out'};
      }
      @keyframes scene-enter {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0px); }
      }
      .skip-link {
        position: absolute;
        left: 8px;
        top: -40px;
        z-index: 999;
        background: #111827;
        color: #fff;
        padding: 8px 12px;
        border-radius: 8px;
      }
      .skip-link:focus {
        top: 8px;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, [themePreset, textScale, isHighContrast, isReducedMotion]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(THEME_STORAGE_KEY, themePresetKey);
  }, [themePresetKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(TEXT_SCALE_STORAGE_KEY, String(textScale));
  }, [textScale]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(HIGH_CONTRAST_STORAGE_KEY, String(isHighContrast));
  }, [isHighContrast]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(REDUCED_MOTION_STORAGE_KEY, String(isReducedMotion));
  }, [isReducedMotion]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    document.documentElement.classList.toggle('theme-dark', isDarkTheme);
    return () => document.documentElement.classList.remove('theme-dark');
  }, [isDarkTheme]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const runContrastPass = () => {
      window.requestAnimationFrame(() => {
        if (isDarkTheme) {
          applyIntelligentTextContrast();
        } else {
          clearIntelligentTextContrast();
        }
      });
    };

    runContrastPass();

    if (!isDarkTheme) {
      if (contrastObserverRef.current) {
        contrastObserverRef.current.disconnect();
        contrastObserverRef.current = null;
      }
      return undefined;
    }

    const observer = new MutationObserver(runContrastPass);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
    contrastObserverRef.current = observer;

    window.addEventListener('resize', runContrastPass);

    return () => {
      observer.disconnect();
      if (contrastObserverRef.current === observer) {
        contrastObserverRef.current = null;
      }
      window.removeEventListener('resize', runContrastPass);
      clearIntelligentTextContrast();
    };
  }, [isDarkTheme, activeApp, isCommandOpen]);

  useEffect(() => {
    const handleKeys = (event) => {
      const isOpenShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      if (isOpenShortcut) {
        event.preventDefault();
        setIsCommandOpen(true);
      }
      if (event.key === 'Escape') {
        setIsCommandOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, []);

  const handleGlobalSearch = (event) => {
    event.preventDefault();
    setGlobalSearchQuery(globalSearchInput);
  };

  const theme = APPS[activeApp] ?? APPS.home;

  if (isPublicDirectoryIntakeRoute) {
    return <DirectoryIntakeApp />;
  }

  // Show loading spinner while auth check is in progress
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <Loader2 className="animate-spin text-stone-400" size={32} />
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Filter visible apps based on user role.
  // Admins see everything. Scoped users see apps explicitly in their appAccess claims.
  // Non-admin, non-scoped users never see privileged apps.
  const PRIVILEGED_APP_IDS = new Set(['security', 'reporting', 'giving', 'workflows']);
  const visibleApps = Object.values(APPS).filter((app) => {
    if (isAdmin) return true;
    if (PRIVILEGED_APP_IDS.has(app.id)) {
      return Array.isArray(roleAccess.appAccess) && roleAccess.appAccess.includes(app.id);
    }
    return true;
  });

  const mobileDockApps = visibleApps.filter((app) => ['home', 'calendar', 'people', 'community', 'services'].includes(app.id));

  const commandActions = [
    ...visibleApps.map((app) => ({ id: `go-${app.id}`, label: `Go to ${app.name}`, run: () => setActiveApp(app.id) })),
    { id: 'theme-next', label: 'Toggle Theme', run: cycleThemePreset },
    { id: 'text-scale', label: `Text Size ${textScale}%`, run: cycleTextScale },
    { id: 'contrast', label: `${isHighContrast ? 'Disable' : 'Enable'} High Contrast`, run: () => setIsHighContrast((s) => !s) },
    { id: 'motion', label: `${isReducedMotion ? 'Disable' : 'Enable'} Reduced Motion`, run: () => setIsReducedMotion((s) => !s) },
  ];

  const filteredCommandActions = commandActions.filter((item) => item.label.toLowerCase().includes(commandQuery.toLowerCase()));

  const activityTimeline = [
    { id: 'a1', label: `${appData.people.length} people profiles synced`, time: 'Now' },
    { id: 'a2', label: `${appData.events.length} events in calendar`, time: 'Today' },
    { id: 'a3', label: `Theme: ${themePreset.name}`, time: 'Session' },
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans relative overflow-hidden">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full blur-3xl ambient-blob" style={{ backgroundColor: 'var(--blob-a)' }} />
      <div className="absolute top-24 -right-20 w-72 h-72 rounded-full blur-3xl ambient-blob" style={{ backgroundColor: 'var(--blob-b)', animationDelay: '1.2s' }} />
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-4 fade-in">
          <CheckCircle2 size={18} className="text-emerald-400" />
          <span className="text-sm font-medium">{toastMsg}</span>
        </div>
      )}

      {showUsernameOnboarding && (
        <div className="fixed inset-0 bg-stone-900/65 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-stone-200 shadow-2xl p-6">
            <h2 className="text-xl font-bold text-stone-900">Finish Account Setup</h2>
            <p className="text-sm text-stone-600 mt-2">Set your username to complete first-time access. Use 3-32 characters: letters, numbers, dot, underscore, or dash.</p>
            <p className="text-xs text-stone-500 mt-3">Signed in as {user?.email}</p>

            <input
              type="text"
              autoFocus
              value={usernameInput}
              onChange={(event) => setUsernameInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleCompleteUsername();
                }
              }}
              placeholder="Choose username"
              className="w-full mt-3 border border-stone-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-teal-500"
            />

            <div className="mt-4 flex gap-2">
              <button
                onClick={logout}
                className="flex-1 border border-stone-300 text-stone-700 text-sm font-semibold py-2.5 rounded-lg hover:bg-stone-50 transition-colors"
              >
                Sign Out
              </button>
              <button
                onClick={handleCompleteUsername}
                disabled={usernameSaving || !/^[a-zA-Z0-9._-]{3,32}$/.test(usernameInput.trim())}
                className="flex-1 bg-stone-900 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-stone-800 disabled:opacity-60 transition-colors"
              >
                {usernameSaving ? 'Saving...' : 'Save Username'}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="glass-surface fixed top-0 left-0 right-0 z-50 shadow-sm">
        <div className="flex items-center justify-between h-14 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <div className="relative">
              <button
                onClick={() => setIsAppSwitcherOpen(!isAppSwitcherOpen)}
                className={`flex items-center gap-2 font-semibold text-lg tracking-tight hover:opacity-80 transition-opacity ${theme.color}`}
              >
                <Grid size={20} className="text-stone-400" />
                <div className="flex flex-col items-start leading-none mt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-stone-900 font-serif font-bold text-lg leading-none">Lifegate AG</span>
                    <div className={`hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded-full border ml-1 ${isSeniorPastor ? 'bg-indigo-50 border-indigo-200' : isAdmin ? 'bg-emerald-50 border-emerald-200' : 'bg-stone-100 border-stone-200'}`}>
                      {isSeniorPastor ? <Sparkles size={10} className="text-indigo-500" /> : isAdmin ? <ShieldCheck size={10} className="text-emerald-500" /> : <Users size={10} className="text-stone-500" />}
                      <span className={`text-[8px] font-bold uppercase tracking-wider ${isSeniorPastor ? 'text-indigo-700' : isAdmin ? 'text-emerald-700' : 'text-stone-600'}`}>
                        {isSeniorPastor ? 'Lead Pastor' : isAdmin ? 'Admin' : 'Volunteer'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-stone-400 mt-0.5">{theme.name}</span>
                </div>
                <ChevronDown size={16} className="text-stone-400 ml-1" />
              </button>

              {isAppSwitcherOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsAppSwitcherOpen(false)}></div>
                  <div className="absolute top-full left-0 mt-3 w-72 bg-white rounded-xl shadow-xl border border-stone-200 p-3 grid grid-cols-3 gap-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {visibleApps.map((app) => {
                      const Icon = app.icon;
                      return (
                        <button
                          key={app.id}
                          onClick={() => {
                            setActiveApp(app.id);
                            setIsAppSwitcherOpen(false);
                          }}
                          className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg hover:bg-stone-50 transition-colors ${activeApp === app.id ? 'bg-stone-50 ring-1 ring-stone-200' : ''}`}
                        >
                          <Icon size={24} className={app.color} />
                          <span className="text-[10px] font-bold text-stone-600 uppercase tracking-wider">{app.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="hidden md:flex flex-1 max-w-lg mx-8">
            <form onSubmit={handleGlobalSearch} className="relative w-full group flex">
              <input
                type="text"
                placeholder="Search across apps..."
                value={globalSearchInput}
                onChange={(event) => {
                  setGlobalSearchInput(event.target.value);
                  if (event.target.value === '') setGlobalSearchQuery('');
                }}
                className="w-full pl-4 pr-10 py-1.5 bg-stone-100 border border-transparent rounded-l-md text-sm focus:bg-white focus:border-teal-300 focus:ring-2 focus:ring-teal-100 transition-all outline-none"
              />
              <button type="submit" className="bg-stone-200 hover:bg-stone-300 text-stone-600 px-3 rounded-r-md transition-colors flex items-center justify-center">
                <Search size={16} />
              </button>
              {globalSearchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setGlobalSearchInput('');
                    setGlobalSearchQuery('');
                  }}
                  className="absolute right-12 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X size={14} />
                </button>
              )}
            </form>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={cycleThemePreset}
              className="hidden lg:flex items-center gap-2 rounded-full bg-white/70 border border-white/60 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-white transition-colors"
              title="Toggle theme"
            >
              <Palette className="h-3.5 w-3.5 text-stone-500" />
              <span>{themePreset.name}</span>
            </button>
            <button
              onClick={() => setIsCommandOpen(true)}
              className="hidden lg:flex items-center gap-2 rounded-full bg-white/70 border border-white/60 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-white transition-colors"
              title="Command Palette"
            >
              <Command className="h-3.5 w-3.5 text-stone-500" />
              <span>Command</span>
            </button>
            <button
              onClick={() => setIsHighContrast((s) => !s)}
              className="hidden lg:flex items-center gap-2 rounded-full bg-white/70 border border-white/60 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-white transition-colors"
              title="Toggle high contrast"
            >
              <Accessibility className="h-3.5 w-3.5 text-stone-500" />
              <span>{isHighContrast ? 'Contrast On' : 'Contrast Off'}</span>
            </button>
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setIsNotifOpen(o => !o)}
                className="relative text-stone-400 hover:text-stone-600 transition-colors"
                title="Notifications"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-0 right-0 h-2 w-2 bg-amber-500 border border-white rounded-full"></span>
              </button>
              {isNotifOpen && (
                <div className="absolute right-0 top-9 w-80 bg-white border border-stone-200 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-stone-100 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-stone-900">Notifications</h3>
                    <button onClick={() => setIsNotifOpen(false)} className="text-stone-400 hover:text-stone-600"><X size={14}/></button>
                  </div>
                  <ul className="divide-y divide-stone-50 max-h-96 overflow-y-auto">
                    {[
                      { icon: '📅', title: 'Upcoming Event', body: `${appData.events?.[0]?.title ?? 'Sunday Service'} is coming up soon.`, time: 'Today' },
                      { icon: '👥', title: 'Pending Team Assignment', body: 'Some team members have not confirmed availability.', time: '1h ago' },
                      { icon: '💰', title: 'New Donation Recorded', body: `${appData.donations?.length ?? 0} donations this month. Review in Giving.`, time: '2h ago' },
                      { icon: '🎵', title: 'Service Plan Updated', body: 'The worship order has been updated for this week.', time: 'Yesterday' },
                      { icon: '🔔', title: 'Workflow Triggered', body: 'Post-Service Guest Text workflow ran successfully.', time: 'Yesterday' },
                    ].map((n, i) => (
                      <li key={i} className="px-4 py-3 hover:bg-stone-50 cursor-pointer">
                        <div className="flex gap-3">
                          <span className="text-lg shrink-0">{n.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-stone-800">{n.title}</p>
                            <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{n.body}</p>
                          </div>
                          <span className="text-[10px] text-stone-400 shrink-0 pt-0.5">{n.time}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="px-4 py-2.5 border-t border-stone-100 text-center">
                    <button onClick={() => setIsNotifOpen(false)} className="text-xs text-stone-500 hover:text-stone-800 font-medium">Mark all as read</button>
                  </div>
                </div>
              )}
            </div>
            {isAdmin && (
              <button
                className={`text-stone-400 hover:text-stone-600 transition-colors ${activeApp === 'security' ? 'text-stone-800' : ''}`}
                onClick={() => setActiveApp('security')}
              >
                <Settings className="h-5 w-5" />
              </button>
            )}
            <div className="relative" ref={profilePopoverRef}>
              <button
                onClick={handleOpenProfile}
                title="Edit profile name"
                className={`h-8 w-8 rounded-full text-white flex items-center justify-center text-xs font-bold shadow-sm hover:ring-2 ring-stone-300 ring-offset-2 transition-all ${isSeniorPastor ? 'bg-indigo-600' : 'bg-stone-900'}`}
              >
                {user?.displayName ? user.displayName.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() : isSeniorPastor ? 'SP' : isAdmin ? 'AD' : 'VU'}
              </button>
              {isProfileOpen && (
                <div className="absolute right-0 top-10 w-64 bg-white border border-stone-200 rounded-xl shadow-xl z-50 p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5"><Pencil size={13}/> Edit Display Name</h3>
                    <button onClick={() => setIsProfileOpen(false)} className="text-stone-400 hover:text-stone-600"><X size={15}/></button>
                  </div>
                  <p className="text-xs text-stone-500 mb-2">{user?.email}</p>
                  <input
                    type="text"
                    value={profileNameInput}
                    onChange={e => setProfileNameInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveProfileName(); if (e.key === 'Escape') setIsProfileOpen(false); }}
                    placeholder="Your full name"
                    autoFocus
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500 mb-3"
                  />
                  <button
                    onClick={handleSaveProfileName}
                    disabled={profileSaving || !profileNameInput.trim()}
                    className="w-full bg-stone-900 text-white text-xs font-semibold py-2 rounded-lg hover:bg-stone-800 disabled:opacity-50 transition-colors"
                  >
                    {profileSaving ? 'Saving…' : 'Save Name'}
                  </button>
                </div>
              )}
            </div>
            <button onClick={logout} className="text-stone-400 hover:text-rose-600 transition-colors ml-2" title="Logout">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="lg:hidden px-4 pb-3 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={cycleThemePreset}
            className="inline-flex items-center gap-2 rounded-full bg-white/70 border border-white/60 px-3 py-1.5 min-w-max text-xs font-semibold text-stone-700"
          >
            <SunMedium className="h-3.5 w-3.5 text-stone-500" />
            <span>{themePreset.name}</span>
          </button>
          <button
            onClick={() => setIsCommandOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-white/70 border border-white/60 px-3 py-1.5 min-w-max text-xs font-semibold text-stone-700"
          >
            <Command className="h-3.5 w-3.5 text-stone-500" />
            <span>Command</span>
          </button>
          <button
            onClick={cycleTextScale}
            className="inline-flex items-center gap-2 rounded-full bg-white/70 border border-white/60 px-3 py-1.5 min-w-max text-xs font-semibold text-stone-700"
          >
            <Accessibility className="h-3.5 w-3.5 text-stone-500" />
            <span>{textScale}%</span>
          </button>
        </div>
      </header>

      <main id="main-content" className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-6 flex-1 relative z-10 pt-20 lg:pt-20" role="main">
        <div className="grid grid-cols-1 xl:grid-cols-[72px_minmax(0,1fr)_290px] gap-5">
          <aside className="hidden xl:flex flex-col glass-surface rounded-2xl p-2 h-[calc(100vh-7.5rem)] sticky top-20">
            {visibleApps.slice(0, 8).map((app) => {
              const Icon = app.icon;
              return (
                <button
                  key={`rail-${app.id}`}
                  onClick={() => setActiveApp(app.id)}
                  className={`h-12 w-12 mx-auto mt-2 rounded-xl flex items-center justify-center transition-colors ${activeApp === app.id ? 'bg-stone-900 text-white shadow-lg' : 'text-stone-500 hover:bg-white/70'}`}
                  title={app.name}
                >
                  <Icon size={18} />
                </button>
              );
            })}
          </aside>

          <section className="glass-surface rounded-3xl p-4 sm:p-6 min-h-[75vh] min-w-0 shadow-xl app-scene-enter overflow-hidden">
            <div key={activeApp} className="app-scene-enter">
              <ErrorBoundary>
                {activeApp === 'home' && <HomeApp events={appData.events} people={appData.people} isAdmin={isAdmin} isSeniorPastor={isSeniorPastor} setActiveApp={setActiveApp} loadingPeople={appData.loadingPeople} loadingEvents={appData.loadingEvents} user={user} />}
                {activeApp === 'community' && <CommunityApp theme={theme} people={appData.people} posts={appData.communityPosts} setPosts={appData.setCommunityPosts} showToast={showToast} user={user} roleAccess={roleAccess} />}
                {activeApp === 'services' && <ServicesApp theme={theme} planItems={appData.planItems} setPlanItems={appData.setPlanItems} servicePlan={appData.servicePlan} setServicePlan={appData.setServicePlan} isAdmin={isAdmin} showToast={showToast} />}
                {activeApp === 'music' && <MusicApp theme={theme} isAdmin={isAdmin} songs={appData.songs} setSongs={appData.setSongs} globalSearch={globalSearchQuery} showToast={showToast} />}
                {activeApp === 'teams' && <TeamsApp theme={theme} teamsList={appData.teamsList} setTeamsList={appData.setTeamsList} people={appData.people} setActiveApp={setActiveApp} isAdmin={isAdmin} showToast={showToast} globalSearch={globalSearchQuery} />}
                {activeApp === 'people' && <PeopleApp theme={theme} people={appData.people} setPeople={appData.setPeople} isAdmin={isAdmin} globalSearch={globalSearchQuery} showToast={showToast} loadingPeople={appData.loadingPeople} intakeSubmissions={appData.intakeSubmissions} loadingIntakeSubmissions={appData.loadingIntakeSubmissions} />}
                {activeApp === 'giving' && (isAdmin || roleAccess.appAccess?.includes('giving')) && <GivingApp theme={theme} donations={appData.donations} setDonations={appData.setDonations} showToast={showToast} />}
                {activeApp === 'calendar' && <CalendarApp theme={theme} events={appData.events} setEvents={appData.setEvents} isAdmin={isAdmin} showToast={showToast} />}
                {activeApp === 'workflows' && (isAdmin || roleAccess.appAccess?.includes('workflows')) && <WorkflowsApp theme={theme} workflows={appData.workflows} setWorkflows={appData.setWorkflows} showToast={showToast} />}
                {activeApp === 'security' && isAdmin && <SecurityApp theme={theme} isSeniorPastor={isSeniorPastor} securitySettings={appData.securitySettings} setSecuritySettings={appData.setSecuritySettings} showToast={showToast} />}
                {activeApp === 'reporting' && (isAdmin || roleAccess.appAccess?.includes('reporting')) && <ReportingApp theme={theme} people={appData.people} donations={appData.donations} events={appData.events} teamsList={appData.teamsList} />}
              </ErrorBoundary>
            </div>
          </section>

          <aside className="hidden xl:flex flex-col glass-surface rounded-3xl p-4 h-[calc(100vh-7.5rem)] sticky top-20">
            <div className="flex items-center gap-2 text-stone-700 mb-4">
              <Gauge size={16} />
              <h3 className="text-sm font-semibold">Live Pulse</h3>
            </div>
            <div className="space-y-3">
              <div className="rounded-xl bg-white/70 border border-white/70 p-3">
                <p className="text-xs text-stone-500">People</p>
                <p className="text-2xl font-bold text-stone-900">{appData.people.length}</p>
              </div>
              <div className="rounded-xl bg-white/70 border border-white/70 p-3">
                <p className="text-xs text-stone-500">Events</p>
                <p className="text-2xl font-bold text-stone-900">{appData.events.length}</p>
              </div>
              <div className="rounded-xl bg-white/70 border border-white/70 p-3">
                <p className="text-xs text-stone-500">Teams</p>
                <p className="text-2xl font-bold text-stone-900">{appData.teamsList.length}</p>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-2 text-stone-700 mb-3">
              <CalendarDays size={15} />
              <h4 className="text-sm font-semibold">Next Event</h4>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-white to-stone-100 border border-white/80 p-3">
              <p className="text-sm font-semibold text-stone-800">{appData.events[0]?.title || 'No events scheduled'}</p>
              <p className="text-xs text-stone-500 mt-1">{appData.events[0]?.date || 'Add an event in Calendar'}</p>
            </div>
            <div className="mt-auto rounded-xl bg-stone-900 text-white p-3">
              <div className="flex items-center gap-2 text-stone-200 mb-2">
                <Activity size={14} />
                <span className="text-xs uppercase tracking-wider">Current Theme</span>
              </div>
              <p className="font-semibold">{themePreset.name}</p>
              <p className="text-xs text-stone-300 mt-1">Premium UI mode active</p>
            </div>
            <div className="mt-3 rounded-xl bg-white/70 border border-white/70 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Activity Timeline</p>
              <div className="mt-2 space-y-2">
                {activityTimeline.map((item) => (
                  <div key={item.id} className="text-xs">
                    <p className="font-medium text-stone-800">{item.label}</p>
                    <p className="text-stone-500">{item.time}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>

      {isCommandOpen && (
        <div className="fixed inset-0 z-[80] bg-stone-900/45 backdrop-blur-sm p-4 sm:p-6" onClick={() => setIsCommandOpen(false)}>
          <div className="max-w-xl mx-auto mt-12 bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden" onClick={(event) => event.stopPropagation()}>
            <div className="px-4 py-3 border-b border-stone-100 flex items-center gap-2">
              <Command size={16} className="text-stone-500" />
              <input
                autoFocus
                value={commandQuery}
                onChange={(event) => setCommandQuery(event.target.value)}
                placeholder="Type a command or search apps..."
                className="w-full outline-none text-sm text-stone-800 placeholder:text-stone-400"
              />
              <button onClick={() => setIsCommandOpen(false)} className="text-stone-400 hover:text-stone-700"><X size={16} /></button>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {filteredCommandActions.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    item.run();
                    setIsCommandOpen(false);
                    setCommandQuery('');
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-stone-100 text-stone-700"
                >
                  {item.label}
                </button>
              ))}
              {filteredCommandActions.length === 0 && (
                <p className="px-3 py-3 text-sm text-stone-500">No commands found.</p>
              )}
            </div>
          </div>
        </div>
      )}

      <nav className="lg:hidden fixed bottom-3 left-1/2 -translate-x-1/2 z-50 glass-surface rounded-2xl px-2 py-2 shadow-xl w-[calc(100%-1rem)] max-w-md">
        <div className="grid grid-cols-5 gap-1">
          {mobileDockApps.map((app) => {
            const Icon = app.id === 'home' ? Home : app.icon;
            return (
              <button
                key={`dock-${app.id}`}
                onClick={() => setActiveApp(app.id)}
                className={`h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 ${activeApp === app.id ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-white/70'}`}
              >
                <Icon size={15} />
                <span className="text-[9px] font-semibold uppercase tracking-wider">{app.name.slice(0, 6)}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
