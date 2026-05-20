import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertTriangle, ChevronDown, ChevronRight, Settings } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/feedback/EmptyState';
import { ModerationCard } from './ModerationCard';
import { SettingsPanel } from './SettingsPanel';
import { useModeration } from '@/hooks/useSphere';
import { slideUp, staggerChildren, listItem } from '@/lib/animations';

export function ModerationTab() {
  const { data: moderation, isLoading, isError, refetch } = useModeration();
  const [expandedSections, setExpandedSections] = useState({
    aiFlagged: true,
    reported: true,
    autoRemoved: false,
  });
  const [showSettings, setShowSettings] = useState(false);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, j) => (
                    <Skeleton key={j} className="h-24 w-full rounded-lg" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <EmptyState
        icon={<AlertTriangle className="h-8 w-8 text-danger" />}
        title="Could not load moderation data"
        description="Check your connection and try again."
        action={<Button onClick={() => refetch()}>Try again</Button>}
      />
    );
  }

  const totalFlagged =
    (moderation?.flagged_by_ai?.length || 0) +
    (moderation?.reported_by_community?.length || 0);

  const hasAutoRemovedPosts = (moderation?.recently_auto_removed?.length ?? 0) > 0;

  // Empty state - no flagged posts
  if (totalFlagged === 0 && !hasAutoRemovedPosts) {
    return (
      <motion.div variants={slideUp} initial="initial" animate="animate">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-success" />
            <div>
              <h3 className="text-lg font-semibold text-success">Community is healthy ✓</h3>
              <p className="text-sm text-muted-foreground">No posts need your attention. AI moderation is running.</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        </div>

        <Card className="border-success/20 bg-success/5">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
              <p className="text-lg font-medium">All posts are compliant</p>
              <p className="text-muted-foreground">
                The AI moderation system is protecting your school community.
              </p>
            </div>
          </CardContent>
        </Card>

        <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={slideUp}
      initial="initial"
      animate="animate"
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Content Moderation</h2>
          <p className="text-muted-foreground">Review and manage flagged posts</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </div>

      {/* Alert banner for auto-removed posts */}
      {hasAutoRemovedPosts && (
        <Alert className="border-danger bg-danger/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            ⚠️ {moderation?.recently_auto_removed?.length ?? 0} posts were auto-removed. Review to confirm or restore.
          </AlertDescription>
        </Alert>
      )}

      <motion.div
        variants={staggerChildren}
        initial="initial"
        animate="animate"
        className="space-y-6"
      >
        {/* AI Flagged Section */}
        <motion.div variants={listItem}>
          <Card className="border-l-4 border-l-warning">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSection('aiFlagged')}
                    className="p-0 h-auto"
                  >
                    {expandedSections.aiFlagged ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                  <CardTitle className="text-lg">AI Flagged</CardTitle>
                  {(moderation?.flagged_by_ai?.length ?? 0) > 0 && (
                    <Badge variant="secondary">
                      {moderation?.flagged_by_ai?.length ?? 0}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <AnimatePresence>
              {expandedSections.aiFlagged && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <CardContent className="pt-0">
                    {(moderation?.flagged_by_ai?.length ?? 0) === 0 ? (
                      <p className="text-muted-foreground">No posts flagged by AI</p>
                    ) : (
                      <div className="space-y-4">
                        {(moderation?.flagged_by_ai ?? []).map((post: any) => (
                          <ModerationCard key={post.id} post={post} />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>

        {/* Reported by Community Section */}
        <motion.div variants={listItem}>
          <Card className="border-l-4 border-l-danger">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSection('reported')}
                    className="p-0 h-auto"
                  >
                    {expandedSections.reported ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                  <CardTitle className="text-lg">Reported by Community</CardTitle>
                  {(moderation?.reported_by_community?.length ?? 0) > 0 && (
                    <Badge variant="destructive">
                      {moderation?.reported_by_community?.length ?? 0}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <AnimatePresence>
              {expandedSections.reported && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <CardContent className="pt-0">
                    {(moderation?.reported_by_community?.length ?? 0) === 0 ? (
                      <p className="text-muted-foreground">No posts reported by community</p>
                    ) : (
                      <div className="space-y-4">
                        {(moderation?.reported_by_community ?? []).map((post: any) => (
                          <ModerationCard key={post.id} post={post} />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>

        {/* Recently Auto-removed Section */}
        {hasAutoRemovedPosts && (
          <motion.div variants={listItem}>
            <Card className="border-l-4 border-l-muted">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSection('autoRemoved')}
                    className="p-0 h-auto"
                  >
                    {expandedSections.autoRemoved ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                  <CardTitle className="text-lg">Auto-removed posts (last 7 days)</CardTitle>
                  <Badge variant="outline">
                    {moderation?.recently_auto_removed?.length ?? 0}
                  </Badge>
                </div>
                <CardDescription>
                  Posts automatically removed by AI moderation
                </CardDescription>
              </CardHeader>
              <AnimatePresence>
                {expandedSections.autoRemoved && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        {(moderation?.recently_auto_removed ?? []).map((post: any) => (
                          <ModerationCard key={post.id} post={post} />
                        ))}
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        )}
      </motion.div>

      <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </motion.div>
  );
}