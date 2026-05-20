import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useSphereSettings, useUpdateSphereSettings } from '@/hooks/useSphere';
import type { NeuraSphereSettings } from '@/types/common';
import { toast } from 'sonner';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { data: settings, isLoading } = useSphereSettings();
  const updateSettings = useUpdateSphereSettings();
  const [localSettings, setLocalSettings] = useState<Partial<NeuraSphereSettings>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize local settings when data loads
  useState(() => {
    if (settings && Object.keys(localSettings).length === 0) {
      setLocalSettings(settings);
    }
  });

  const updateLocalSetting = (key: keyof NeuraSphereSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync(localSettings);
      setHasChanges(false);
      toast.success('Settings updated successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  const addKeywordToBlocklist = () => {
    const keyword = prompt('Enter keyword to block:');
    if (keyword && keyword.trim()) {
      const currentBlocklist = localSettings.keyword_blocklist || [];
      if (!currentBlocklist.includes(keyword.trim())) {
        updateLocalSetting('keyword_blocklist', [...currentBlocklist, keyword.trim()]);
      }
    }
  };

  const removeKeywordFromBlocklist = (keyword: string) => {
    const currentBlocklist = localSettings.keyword_blocklist || [];
    updateLocalSetting('keyword_blocklist', currentBlocklist.filter(k => k !== keyword));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          {/* Settings Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-96 bg-background border-l shadow-xl z-50 overflow-y-auto"
          >
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Community Settings</h2>
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i}>
                      <CardHeader className="pb-3">
                        <Skeleton className="h-4 w-32" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-8 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Cross-School Posts */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Cross-School Posts</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="allow-cross-school" className="text-sm">
                          Allow students to see posts from other schools
                        </Label>
                        <Switch
                            checked={localSettings.allow_cross_school ?? true}
                          onCheckedChange={(checked) => updateLocalSetting('allow_cross_school', checked)}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Posting Limits */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Posting Limits</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="max-posts" className="text-sm">
                          Maximum posts per student per day
                        </Label>
                        <Input
                          id="max-posts"
                          type="number"
                          min="1"
                          max="20"
                          value={localSettings.max_posts_per_day ?? 5}
                          onChange={(e) => updateLocalSetting('max_posts_per_day', parseInt(e.target.value))}
                          className="mt-1"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="posting-start" className="text-sm">
                            Posting hours start
                          </Label>
                          <Input
                            id="posting-start"
                            type="time"
                            value={localSettings.posting_hours_start?.substring(0, 5) ?? '06:00'}
                            onChange={(e) => updateLocalSetting('posting_hours_start', `${e.target.value}:00`)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="posting-end" className="text-sm">
                            Posting hours end
                          </Label>
                          <Input
                            id="posting-end"
                            type="time"
                            value={localSettings.posting_hours_end?.substring(0, 5) ?? '22:00'}
                            onChange={(e) => updateLocalSetting('posting_hours_end', `${e.target.value}:00`)}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Feature Toggles */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Feature Controls</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="enable-achievements" className="text-sm">
                          Achievement posts
                        </Label>
                        <Switch
                          checked={localSettings.enable_achievements ?? true}
                          onCheckedChange={(checked) => updateLocalSetting('enable_achievements', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="enable-manual-posts" className="text-sm">
                          Manual posts by students
                        </Label>
                        <Switch
                          checked={localSettings.enable_manual_posts ?? true}
                          onCheckedChange={(checked) => updateLocalSetting('enable_manual_posts', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="enable-photo-posts" className="text-sm">
                          Photo attachments
                        </Label>
                        <Switch
                          checked={localSettings.enable_photo_posts ?? true}
                          onCheckedChange={(checked) => updateLocalSetting('enable_photo_posts', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="require-approval" className="text-sm">
                          Require manual approval for all posts
                        </Label>
                        <Switch
                          checked={localSettings.require_approval ?? false}
                          onCheckedChange={(checked) => updateLocalSetting('require_approval', checked)}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Keyword Blocklist */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Keyword Blocklist</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-2 min-h-[2rem]">
                        {(localSettings.keyword_blocklist || []).map((keyword) => (
                          <Badge
                            key={keyword}
                            variant="secondary"
                            className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => removeKeywordFromBlocklist(keyword)}
                          >
                            {keyword} ×
                          </Badge>
                        ))}
                        {(localSettings.keyword_blocklist || []).length === 0 && (
                          <p className="text-sm text-muted-foreground">No blocked keywords</p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addKeywordToBlocklist}
                        className="w-full"
                      >
                        Add Keyword
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Blocked Users */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Blocked Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 min-h-[2rem]">
                        {(localSettings.blocked_posters || []).length === 0 ? (
                          <p className="text-sm text-muted-foreground">No blocked users</p>
                        ) : (
                          <div className="space-y-2">
                            {localSettings.blocked_posters?.map((neuraId) => (
                              <div
                                key={neuraId}
                                className="flex items-center justify-between p-2 bg-muted rounded-md"
                              >
                                <span className="text-sm font-mono">{neuraId}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const currentBlocked = localSettings.blocked_posters || [];
                                    updateLocalSetting('blocked_posters', currentBlocked.filter(id => id !== neuraId));
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Warning Notice */}
                  {localSettings.require_approval && (
                    <div className="flex items-start gap-3 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-warning mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-warning-foreground">Manual Approval Enabled</p>
                        <p className="text-muted-foreground">
                          All student posts will require your approval before being published.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Save Button */}
                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      onClick={handleSave}
                      disabled={!hasChanges || updateSettings.isPending}
                      className="flex-1"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {updateSettings.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button variant="outline" onClick={onClose}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}