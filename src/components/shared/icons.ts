// --- Icon Exports ---

/**
 * Centralized icon exports using Lucide React icons and custom SVGs.
 *
 * Provides a mapping of icon names to Lucide React components and custom SVGs for consistent icon usage across the app.
 */

import {ArrowRight, Check, ChevronsUpDown, Circle, Copy, Edit, ExternalLink, File, HelpCircle, Home, Loader2, Mail, MessageSquare, Moon, Plus, PlusCircle, Search, Server, Settings, Share2, Shield, Sun, Trash, User, X, Workflow} from 'lucide-react';
import React from 'react';
import { YoutubeIcon, SpotifyIcon, AppleMusicIcon } from "@/components/shared/CustomIcons";

const Icons = {
  arrowRight: ArrowRight,
  check: Check,
  chevronDown: ChevronsUpDown,
  circle: Circle,
  workflow: Workflow,
  close: X,
  copy: Copy,
  dark: Moon,
  edit: Edit,
  externalLink: ExternalLink,
  file: File,
  help: HelpCircle,
  home: Home,
  light: Sun,
  loader: Loader2,
  mail: Mail,
  messageSquare: MessageSquare,
  plus: Plus,
  plusCircle: PlusCircle,
  search: Search,
  server: Server,
  settings: Settings,
  share: Share2,
  shield: Shield,
  spinner: Loader2,
  trash: Trash,
  user: User,
  youtube: YoutubeIcon,
  spotify: SpotifyIcon,
  appleMusic: AppleMusicIcon,
};

export { Icons };
