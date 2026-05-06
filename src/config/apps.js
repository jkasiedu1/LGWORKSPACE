import {
  LayoutDashboard, Globe, BookOpen, Music, FolderLock, Users,
  DollarSign, Calendar as CalendarIcon, Workflow, ShieldCheck, PieChart
} from 'lucide-react';

export const APPS = {
  home:      { id: 'home',      name: 'Home',         color: 'text-stone-700',   bg: 'bg-stone-800',   light: 'bg-stone-100',   border: 'border-stone-200',   icon: LayoutDashboard },
  community: { id: 'community', name: 'Community',    color: 'text-blue-600',    bg: 'bg-blue-600',    light: 'bg-blue-50',     border: 'border-blue-200',    icon: Globe },
  services:  { id: 'services',  name: 'Services',     color: 'text-amber-600',   bg: 'bg-amber-600',   light: 'bg-amber-50',    border: 'border-amber-200',   icon: BookOpen },
  music:     { id: 'music',     name: 'Music',        color: 'text-rose-600',    bg: 'bg-rose-600',    light: 'bg-rose-50',     border: 'border-rose-200',    icon: Music },
  teams:     { id: 'teams',     name: 'Team Portals', color: 'text-indigo-600',  bg: 'bg-indigo-600',  light: 'bg-indigo-50',   border: 'border-indigo-200',  icon: FolderLock },
  people:    { id: 'people',    name: 'People',       color: 'text-sky-600',     bg: 'bg-sky-600',     light: 'bg-sky-50',      border: 'border-sky-200',     icon: Users },
  giving:    { id: 'giving',    name: 'Giving',       color: 'text-teal-600',    bg: 'bg-teal-600',    light: 'bg-teal-50',     border: 'border-teal-200',    icon: DollarSign },
  calendar:  { id: 'calendar',  name: 'Calendar',     color: 'text-orange-500',  bg: 'bg-orange-500',  light: 'bg-orange-50',   border: 'border-orange-200',  icon: CalendarIcon },
  workflows: { id: 'workflows', name: 'Workflows',    color: 'text-violet-600',  bg: 'bg-violet-600',  light: 'bg-violet-50',   border: 'border-violet-200',  icon: Workflow },
  security:  { id: 'security',  name: 'Security',     color: 'text-stone-600',   bg: 'bg-stone-800',   light: 'bg-stone-100',   border: 'border-stone-300',   icon: ShieldCheck },
  reporting: { id: 'reporting', name: 'Insights',     color: 'text-fuchsia-600', bg: 'bg-fuchsia-600', light: 'bg-fuchsia-50',  border: 'border-fuchsia-200', icon: PieChart },
};
