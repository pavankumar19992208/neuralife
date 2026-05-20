import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Pin, MoreHorizontal, Users, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/feedback/EmptyState';
import { useSpherePosts, useSphereAction } from '@/hooks/useSphere';
import type { NeuraSpherePost } from '@/types/common';
import { slideUp, staggerChildren, listItem } from '@/lib/animations';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/useDebounce';

const AUTHOR_TYPES = [
  { value: '', label: 'All Authors' },
  { value: 'STUDENT', label: 'Students' },
  { value: 'PRINCIPAL', label: 'Principal' },
  { value: 'TEACHER', label: 'Teachers' },
];

const POST_STATUS = [
  { value: '', label: 'All Posts' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'REMOVED_BY_PRINCIPAL', label: 'Removed' },
];

const DATE_RANGES = [
  { value: '', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
];

interface PostCardProps {
  post: NeuraSpherePost;
  onAction: (postId: string, action: 'PIN' | 'UNPIN' | 'REMOVE') => void;
}

function PostCard({ post, onAction }: PostCardProps) {
  const isRemoved = post.status === 'REMOVED_BY_PRINCIPAL' || post.status === 'REMOVED_BY_AI';

  const getCategoryColor = (category: string) => {
    const colors = {
      ANNOUNCEMENT: 'bg-primary text-primary-foreground',
      ACHIEVEMENT: 'bg-success text-success-foreground',
      STUDY_TIP: 'bg-warning text-warning-foreground',
      GENERAL: 'bg-secondary text-secondary-foreground',
      PROJECT: 'bg-info text-info-foreground',
      QUESTION: 'bg-muted text-muted-foreground',
    };
    return colors[category as keyof typeof colors] || colors.GENERAL;
  };

  return (
    <motion.div variants={listItem}>
      <Card className={`${isRemoved ? 'opacity-50' : ''} ${post.is_pinned ? 'ring-2 ring-primary/20 bg-primary/5' : ''}`}>
        <CardContent className="pt-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {post.author_type === 'PRINCIPAL' ? 'P' :
                   post.author_type === 'TEACHER' ? 'T' :
                   post.author_name?.charAt(0) || 'S'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
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
                  {post.is_pinned && (
                    <Pin className="h-3 w-3 text-primary" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className={`text-xs ${getCategoryColor(post.post_category)}`}>
                    {post.post_category.replace('_', ' ')}
                  </Badge>
                  {post.is_cross_school && (
                    <Badge variant="outline" className="text-xs">
                      Cross-school
                    </Badge>
                  )}
                  {isRemoved && (
                    <Badge variant="destructive" className="text-xs">
                      Removed
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {!isRemoved && (
                  <>
                    <DropdownMenuItem
                      onClick={() => onAction(post.id, post.is_pinned ? 'UNPIN' : 'PIN')}
                    >
                      <Pin className="h-4 w-4 mr-2" />
                      {post.is_pinned ? 'Unpin' : 'Pin'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onAction(post.id, 'REMOVE')}
                      className="text-destructive"
                    >
                      Remove Post
                    </DropdownMenuItem>
                  </>
                )}
                {isRemoved && (
                  <DropdownMenuItem
                    onClick={() => onAction(post.id, 'RESTORE' as any)}
                  >
                    Restore Post
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Content */}
          <div className="pl-11">
            <p className={`text-sm leading-relaxed ${isRemoved ? 'blur-sm select-none' : ''}`}>
              {isRemoved ? 'This post has been removed' : post.content_text}
            </p>

            {/* Stats */}
            <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                👍 {post.reaction_count || 0}
              </span>
              <span className="flex items-center gap-1">
                💬 {post.comment_count || 0}
              </span>
              <span className="flex items-center gap-1">
                🚩 {post.report_count || 0}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function SchoolFeedTab() {
  const [filters, setFilters] = useState({
    author_type: '',
    status: '',
    search: '',
    date_range: '',
  });
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce search input
  const debouncedSearch = useDebounce(filters.search, 300);

  // Build date filter
  const getDateRange = (range: string) => {
    const now = new Date();
    switch (range) {
      case 'today':
        return { date_from: now.toISOString().split('T')[0] };
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return { date_from: weekAgo.toISOString().split('T')[0] };
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return { date_from: monthAgo.toISOString().split('T')[0] };
      default:
        return {};
    }
  };

  const queryFilters = {
    author_type: filters.author_type || undefined,
    status: filters.status || undefined,
    search: debouncedSearch || undefined,
    page: currentPage,
    limit: 20,
    ...getDateRange(filters.date_range),
  };

  const { data: postsResponse, isLoading, isError, refetch } = useSpherePosts(queryFilters);
  const sphereAction = useSphereAction();

  const handleAction = async (postId: string, action: 'PIN' | 'UNPIN' | 'REMOVE' | 'RESTORE') => {
    try {
      await sphereAction.mutateAsync({ postId, action });
      toast.success(`Post ${action.toLowerCase()}${action.endsWith('E') ? 'd' : action.endsWith('N') ? 'ned' : 'ed'} successfully`);
    } catch (error) {
      toast.error('Failed to perform action');
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const posts = postsResponse?.data || [];
  const totalPosts = postsResponse?.meta?.total || 0;

  return (
    <motion.div
      variants={slideUp}
      initial="initial"
      animate="animate"
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold tracking-tight">School Feed</h2>
        <p className="text-muted-foreground">View and manage all posts from your school community</p>
      </div>

      {/* Filter Bar */}
      <Card className="border-0 shadow-sm bg-muted/30">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search posts..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Author Filter */}
            <Select value={filters.author_type} onValueChange={(value) => handleFilterChange('author_type', value)}>
              <SelectTrigger className="w-full lg:w-40">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <SelectValue placeholder="Author" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {AUTHOR_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger className="w-full lg:w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {POST_STATUS.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Filter */}
            <Select value={filters.date_range} onValueChange={(value) => handleFilterChange('date_range', value)}>
              <SelectTrigger className="w-full lg:w-36">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <SelectValue placeholder="Date" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGES.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Results Count */}
          <div className="mt-3 text-sm text-muted-foreground">
            Showing {posts.length} of {totalPosts} posts
          </div>
        </CardContent>
      </Card>

      {/* Posts Grid */}
      {isError ? (
        <EmptyState
          icon={<Users className="h-8 w-8 text-muted-foreground" />}
          title="Could not load posts"
          description="Check your connection and try again."
          action={<Button onClick={() => refetch()}>Try again</Button>}
        />
      ) : posts.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8 text-muted-foreground" />}
          title="No posts found"
          description="No posts match your current filters. Try adjusting your search criteria."
        />
      ) : (
        <motion.div
          variants={staggerChildren}
          initial="initial"
          animate="animate"
          className="space-y-4"
        >
          {posts.map((post: any) => (
            <PostCard
              key={post.id}
              post={post}
              onAction={handleAction}
            />
          ))}
        </motion.div>
      )}

      {/* Pagination */}
      {totalPosts > 20 && (
        <div className="flex justify-center gap-2 pt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => prev + 1)}
            disabled={currentPage * 20 >= totalPosts}
          >
            Next
          </Button>
        </div>
      )}
    </motion.div>
  );
}