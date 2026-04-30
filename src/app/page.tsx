'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import {
  Clapperboard,
  Settings,
  Moon,
  Sun,
  Home,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Tooltip as TooltipRadix,
  TooltipContent as TooltipContentRadix,
  TooltipTrigger as TooltipTriggerRadix,
  TooltipProvider as TooltipProviderRadix,
} from '@/components/ui/tooltip';
import DramaListView from '@/components/drama-list';
import DramaDetailView from '@/components/drama-detail';
import EpisodeStudioView from '@/components/episode-studio';
import SettingsView from '@/components/settings-view';

// ==================== View Types ====================
type View =
  | { type: 'list' }
  | { type: 'drama'; id: string }
  | { type: 'studio'; dramaId: string; episodeId: string; episodeNumber: number }
  | { type: 'settings' };

// ==================== Page Component ====================
export default function HomePage() {
  const [view, setView] = useState<View>({ type: 'list' });
  const [refreshKey, setRefreshKey] = useState(0);
  const { theme, setTheme } = useTheme();

  const navigateToList = useCallback(() => {
    setRefreshKey((k) => k + 1);
    setView({ type: 'list' });
  }, []);

  const navigateToDrama = useCallback((dramaId: string) => {
    setRefreshKey((k) => k + 1);
    setView({ type: 'drama', id: dramaId });
  }, []);

  const navigateToStudio = useCallback(
    (dramaId: string, episodeId: string, episodeNumber: number) => {
      setView({ type: 'studio', dramaId, episodeId, episodeNumber });
    },
    []
  );

  const navigateToSettings = useCallback(() => {
    setView({ type: 'settings' });
  }, []);

  // Determine if current view is full-screen (studio)
  const isStudio = view.type === 'studio';

  return (
    <TooltipProviderRadix>
      <div className="min-h-screen flex flex-col bg-background">
        {/* Header / Navbar */}
        {!isStudio ? (
          <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center px-4 md:px-6 gap-4">
              {/* Logo */}
              <button
                onClick={navigateToList}
                className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
              >
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <Clapperboard className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="font-bold text-lg hidden sm:block">短剧Agent</span>
              </button>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Nav items */}
              <nav className="flex items-center gap-1">
                <Button
                  variant={view.type === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={navigateToList}
                  className="gap-1.5"
                >
                  <Home className="h-4 w-4" />
                  <span className="hidden sm:inline">项目</span>
                </Button>
                <Button
                  variant={view.type === 'settings' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={navigateToSettings}
                  className="gap-1.5"
                >
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">设置</span>
                </Button>
              </nav>

              {/* Theme toggle */}
              <TooltipRadix>
                <TooltipTriggerRadix asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="shrink-0"
                  >
                    <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">切换主题</span>
                  </Button>
                </TooltipTriggerRadix>
                <TooltipContentRadix>
                  {theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
                </TooltipContentRadix>
              </TooltipRadix>
            </div>
          </header>
        ) : null}

        {/* Main Content */}
        <main className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={refreshKey + '-' + view.type + (view.type === 'drama' ? view.id : '') + (view.type === 'studio' ? view.episodeId : '')}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {view.type === 'list' && (
                <div className="container mx-auto px-4 md:px-6 py-6">
                  <DramaListView
                    onSelectDrama={navigateToDrama}
                    refreshKey={refreshKey}
                  />
                </div>
              )}

              {view.type === 'drama' && (
                <div className="container mx-auto px-4 md:px-6 py-6">
                  <DramaDetailView
                    dramaId={view.id}
                    onBack={navigateToList}
                    onEnterStudio={navigateToStudio}
                    refreshKey={refreshKey}
                  />
                </div>
              )}

              {view.type === 'studio' && (
                <EpisodeStudioView
                  dramaId={view.dramaId}
                  episodeId={view.episodeId}
                  episodeNumber={view.episodeNumber}
                  onBack={() => navigateToDrama(view.dramaId)}
                />
              )}

              {view.type === 'settings' && (
                <div className="container mx-auto px-4 md:px-6 py-6">
                  <SettingsView />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </TooltipProviderRadix>
  );
}
