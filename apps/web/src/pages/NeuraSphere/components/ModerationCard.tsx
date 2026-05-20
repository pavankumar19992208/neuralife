import { useState } from 'react';
import {
  CheckCircle,
  X,
  AlertTriangle,
  RotateCcw,
  Eye,
  ThumbsUp,
  MessageCircle,
  Flag,
  Image as ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { useSphereAction } from '@/hooks/useSphere';
import type { NeuraSpherePost } from '@/types/common';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface ModerationCardProps {
  post: NeuraSpherePost;
}

export function ModerationCard({ post }: ModerationCardProps) {
  const [actionDialog, setActionDialog] = useState<{
    isOpen: boolean;
    action: 'REMOVE' | 'RESTORE' | 'WARN' | null;
    title: string;
    description: string;
  }>({ isOpen: false, action: null, title: '', description: '' });

  const sphereAction = useSphereAction();

  const handleAction = (action: 'REMOVE' | 'RESTORE' | 'PIN' | 'UNPIN' | 'WARN' | 'BLOCK') => {
    if (action === 'REMOVE' || action === 'RESTORE' || action === 'WARN') {
      // Show confirmation dialog for destructive actions
      const dialogs = {
        REMOVE: {
          title: 'Remove Post',
          description: 'Are you sure you want to remove this post? This action cannot be undone.',
        },
        RESTORE: {
          title: 'Restore Post',
          description: 'Are you sure you want to restore this post and make it visible to students?',
        },
        WARN: {
          title: 'Warn Student',
          description: 'This will send a warning message to the student and their parents via SMS.',
        },
      };

      setActionDialog({
        isOpen: true,
        action,
        ...dialogs[action],
      });
    } else {
      // Execute non-destructive actions immediately
      executeAction(action);
    }
  };

  const executeAction = async (action: 'REMOVE' | 'RESTORE' | 'PIN' | 'UNPIN' | 'WARN' | 'BLOCK') => {
    try {
      await sphereAction.mutateAsync({ postId: post.id, action });

      const actionMessages = {
        REMOVE: 'Post removed successfully',
        RESTORE: 'Post restored successfully',
        PIN: 'Post pinned successfully',
        UNPIN: 'Post unpinned successfully',
        WARN: 'Warning sent to student and parents',
        BLOCK: 'Student blocked from posting for 7 days',
      };

      toast.success(actionMessages[action]);
    } catch (error) {
      toast.error('Failed to perform action. Please try again.');
    } finally {
      setActionDialog({ isOpen: false, action: null, title: '', description: '' });
    }
  };

  const confirmAction = () => {
    if (actionDialog.action) {
      executeAction(actionDialog.action);
    }
  };

  // Determine card border color based on AI score
  const getBorderClass = () => {
    if (post.ai_score === 'REMOVE') return 'border-l-danger bg-danger/5';
    if (post.ai_score === 'REVIEW') return 'border-l-warning bg-warning/5';
    return 'border-l-muted bg-muted/5';
  };

  // Get AI score badge
  const getAIScoreBadge = () => {
    if (post.ai_score === 'REMOVE') {
      return <Badge variant="destructive" className="text-xs">🔴 REMOVE</Badge>;
    }
    if (post.ai_score === 'REVIEW') {
      return <Badge variant="secondary" className="bg-warning text-warning-foreground text-xs">🟡 REVIEW</Badge>;
    }
    return null;
  };

  // Truncate content for preview
  const truncatedContent = post.content_text.length > 150
    ? `${post.content_text.substring(0, 150)}...`
    : post.content_text;

  // Get action buttons based on post status and AI score
  const getActionButtons = () => {
    if (post.status === 'REMOVED_BY_AI' || post.status === 'REMOVED_BY_PRINCIPAL') {
      return (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAction('RESTORE')}
            disabled={sphereAction.isPending}
            className="text-xs"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Restore
          </Button>
        </div>
      );
    }

    if (post.ai_score === 'REVIEW') {
      return (
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAction('PIN')}
            disabled={sphereAction.isPending}
            className="text-xs bg-success/10 border-success hover:bg-success/20"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Keep Live
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAction('REMOVE')}
            disabled={sphereAction.isPending}
            className="text-xs bg-danger/10 border-danger hover:bg-danger/20"
          >
            <X className="h-3 w-3 mr-1" />
            Remove
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAction('WARN')}
            disabled={sphereAction.isPending}
            className="text-xs bg-warning/10 border-warning hover:bg-warning/20"
          >
            <AlertTriangle className="h-3 w-3 mr-1" />
            Warn Student
          </Button>
        </div>
      );
    }

    if (post.ai_score === 'REMOVE') {
      return (
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAction('RESTORE')}
            disabled={sphereAction.isPending}
            className="text-xs"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Restore
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleAction('REMOVE')}
            disabled={sphereAction.isPending}
            className="text-xs"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Confirm Removal
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAction('WARN')}
            disabled={sphereAction.isPending}
            className="text-xs bg-warning/10 border-warning hover:bg-warning/20"
          >
            <AlertTriangle className="h-3 w-3 mr-1" />
            Warn Student
          </Button>
        </div>
      );
    }

    // For community-reported posts
    return (
      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAction('PIN')}
          disabled={sphereAction.isPending}
          className="text-xs"
        >
          Dismiss All Reports
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => handleAction('REMOVE')}
          disabled={sphereAction.isPending}
          className="text-xs"
        >
          Remove Post
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAction('WARN')}
          disabled={sphereAction.isPending}
          className="text-xs bg-warning/10 border-warning hover:bg-warning/20"
        >
          Remove + Warn
        </Button>
      </div>
    );
  };

  return (
    <>
      <Card className={`border-l-4 ${getBorderClass()}`}>
        <CardContent className="pt-4">
          {/* Header row with author info and AI score */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {post.author_type === 'PRINCIPAL' ? 'P' :
                   post.author_name?.charAt(0) || 'S'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">
                    {post.author_name || 'Principal'}
                  </span>
                  {post.author_class && post.author_section && (
                    <span className="text-xs text-muted-foreground">
                      · {post.author_class}-{post.author_section}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </span>
                </div>
                {post.ai_reason && (
                  <p className="text-xs text-muted-foreground italic mt-1">
                    {post.ai_reason}
                  </p>
                )}
              </div>
            </div>
            {getAIScoreBadge()}
          </div>

          {/* Post content */}
          <div className="mb-4">
            <p className="text-sm leading-relaxed">{truncatedContent}</p>
            {post.image_url && (
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <ImageIcon className="h-3 w-3" />
                <span>Image attached</span>
              </div>
            )}
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <ThumbsUp className="h-3 w-3" />
              <span>{post.reaction_count || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              <span>{post.comment_count || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <Flag className="h-3 w-3" />
              <span>{post.report_count || 0}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {getActionButtons()}
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <Eye className="h-3 w-3 mr-1" />
              View Full Post
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={actionDialog.isOpen} onOpenChange={(open: boolean) => !open && setActionDialog({ isOpen: false, action: null, title: '', description: '' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{actionDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {actionDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              disabled={sphereAction.isPending}
              className={
                actionDialog.action === 'REMOVE'
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : ''
              }
            >
              {sphereAction.isPending ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}