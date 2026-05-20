import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Calendar, Image, Globe, School } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useCreatePost } from '@/hooks/useSphere';
import type { CreatePostInput } from '@/types/common';
import { slideUp } from '@/lib/animations';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';

const POST_CATEGORIES = [
  { value: 'ANNOUNCEMENT', label: '📢 Announcement', color: 'bg-primary text-primary-foreground' },
  { value: 'GENERAL', label: '💬 General', color: 'bg-secondary text-secondary-foreground' },
  { value: 'ACHIEVEMENT', label: '🏆 Achievement', color: 'bg-success text-success-foreground' },
  { value: 'STUDY_TIP', label: '💡 Study Tip', color: 'bg-warning text-warning-foreground' },
  { value: 'PROJECT', label: '🔬 Project', color: 'bg-info text-info-foreground' },
  { value: 'QUESTION', label: '❓ Question', color: 'bg-muted text-muted-foreground' },
] as const;

const QUICK_TEMPLATES = [
  {
    title: 'Exam Results Announcement',
    content: 'Congratulations to all students on excellent performance in the recent examinations. Detailed results will be shared with parents shortly. Keep up the great work! 🎓',
    category: 'ANNOUNCEMENT' as const,
  },
  {
    title: 'Study Motivation',
    content: 'Remember: Success is not just about grades, but about the effort you put in every day. Stay focused, ask questions, and support each other. Your hard work will pay off! 💪',
    category: 'GENERAL' as const,
  },
  {
    title: 'Holiday Notice',
    content: 'The school will remain closed tomorrow due to public holiday. Regular classes will resume the day after. Use this time for productive revision and family time. 📚',
    category: 'ANNOUNCEMENT' as const,
  },
];

export function CreatePostTab() {
  const [formData, setFormData] = useState<CreatePostInput>({
    content: '',
    post_category: 'ANNOUNCEMENT',
    is_cross_school: false,
  });
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('09:00');

  const createPost = useCreatePost();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.content.trim()) {
      toast.error('Please enter post content');
      return;
    }

    try {
      const postData = {
        ...formData,
        content: formData.content.trim(),
        scheduled_at: isScheduled && scheduledDate
          ? `${scheduledDate}T${scheduledTime}:00`
          : undefined,
      };

      await createPost.mutateAsync(postData);

      // Reset form
      setFormData({
        content: '',
        post_category: 'ANNOUNCEMENT',
        is_cross_school: false,
      });
      setIsScheduled(false);
      setScheduledDate('');
      setScheduledTime('09:00');

      toast.success(
        isScheduled ? 'Post scheduled successfully' : 'Post published successfully'
      );
    } catch (error) {
      toast.error('Failed to create post');
    }
  };

  const applyTemplate = (template: any) => {
    setFormData(prev => ({
      ...prev,
      content: template.content,
      post_category: template.category,
    }));
  };

  const selectedCategory = POST_CATEGORIES.find(cat => cat.value === formData.post_category);
  const characterCount = formData.content.length;
  const isOverLimit = characterCount > 300;

  return (
    <motion.div
      variants={slideUp}
      initial="initial"
      animate="animate"
      className="grid lg:grid-cols-3 gap-8"
    >
      {/* Left Column - Form */}
      <div className="lg:col-span-2 space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Create Post</h2>
          <p className="text-muted-foreground">Share announcements and updates with your school community</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Post Visibility */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Post To</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={formData.is_cross_school ? 'community' : 'school'}
                onValueChange={(value: string) =>
                  setFormData(prev => ({ ...prev, is_cross_school: value === 'community' }))
                }
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="school" id="school-only" />
                  <Label htmlFor="school-only" className="flex items-center gap-2 cursor-pointer">
                    <School className="h-4 w-4" />
                    Our School Only
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="community" id="community" />
                  <Label htmlFor="community" className="flex items-center gap-2 cursor-pointer">
                    <Globe className="h-4 w-4" />
                    NeuraLife Community
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Category Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {POST_CATEGORIES.map((category) => (
                  <button
                    key={category.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, post_category: category.value }))}
                    className={`p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                      formData.post_category === category.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-muted hover:border-muted-foreground/30 hover:bg-muted/50'
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Content */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Textarea
                  placeholder="What would you like to share with your school community?"
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  className="min-h-[120px] resize-none"
                  maxLength={300}
                />
                <div className="flex justify-between items-center text-xs">
                  <span className={`${isOverLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {characterCount}/300 characters
                  </span>
                  {isOverLimit && (
                    <span className="text-destructive">Content exceeds maximum length</span>
                  )}
                </div>
              </div>

              {/* Quick Templates */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Quick Templates</Label>
                <div className="flex flex-wrap gap-2">
                  {QUICK_TEMPLATES.map((template, index) => (
                    <Button
                      key={index}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyTemplate(template)}
                      className="text-xs"
                    >
                      {template.title}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Image Upload (Placeholder) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Image className="h-4 w-4" />
                Images
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                <Image className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Drag and drop images here, or click to browse
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum 3 images, 5MB each
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="schedule-toggle">Schedule for later</Label>
                <Switch
                  checked={isScheduled}
                  onCheckedChange={setIsScheduled}
                />
              </div>

              {isScheduled && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="schedule-date" className="text-sm">Date</Label>
                    <Input
                      id="schedule-date"
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      min={format(new Date(), 'yyyy-MM-dd')}
                      max={format(addDays(new Date(), 30), 'yyyy-MM-dd')}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="schedule-time" className="text-sm">Time</Label>
                    <Input
                      id="schedule-time"
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit */}
          <Button
            type="submit"
            disabled={createPost.isPending || !formData.content.trim() || isOverLimit || (isScheduled && !scheduledDate)}
            className="w-full"
            size="lg"
          >
            <Send className="h-4 w-4 mr-2" />
            {createPost.isPending
              ? 'Publishing...'
              : isScheduled
              ? 'Schedule Post'
              : 'Publish Now'
            }
          </Button>
        </form>
      </div>

      {/* Right Column - Preview */}
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Live Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              {/* Post Header */}
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>P</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">Vikas High School</span>
                    <span className="text-xs text-muted-foreground">• Just now</span>
                  </div>
                  {selectedCategory && (
                    <Badge variant="secondary" className="text-xs mt-1">
                      {selectedCategory.label}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Post Content */}
              <div className="pl-11">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {formData.content || 'Your post content will appear here...'}
                </p>

                {/* Post Footer */}
                <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                  <button className="flex items-center gap-1 hover:text-foreground">
                    👍 Like
                  </button>
                  <button className="flex items-center gap-1 hover:text-foreground">
                    💬 Comment
                  </button>
                  {formData.is_cross_school && (
                    <Badge variant="outline" className="text-xs">
                      <Globe className="h-3 w-3 mr-1" />
                      Cross-school
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scheduled Posts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Scheduled Posts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-3" />
              <p className="text-sm">No scheduled posts</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}