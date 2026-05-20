import { motion } from 'framer-motion';
import { TrendingUp, Users, AlertTriangle, Target, Award, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/feedback/EmptyState';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Tooltip
} from 'recharts';
import { useSphereAnalytics } from '@/hooks/useSphere';
import { slideUp, staggerChildren, listItem } from '@/lib/animations';

const CHART_COLORS = ['#1E40AF', '#0D9488', '#F59E0B', '#EF4444', '#10B981', '#8B5CF6'];

interface KPICardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'danger';
}

function KPICard({ title, value, change, icon, color = 'primary' }: KPICardProps) {
  const colorClasses = {
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
  };

  return (
    <motion.div variants={listItem}>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-2xl font-bold">{value}</p>
                {change && (
                  <Badge variant="secondary" className="text-xs">
                    {change}
                  </Badge>
                )}
              </div>
            </div>
            <div className={`p-3 rounded-lg bg-muted/30 ${colorClasses[color]}`}>
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function AnalyticsTab() {
  const { data: analytics, isLoading, isError, refetch } = useSphereAnalytics();

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <EmptyState
        icon={<AlertTriangle className="h-8 w-8 text-danger" />}
        title="Could not load analytics"
        description="Check your connection and try again."
        action={<button onClick={() => refetch()}>Try again</button>}
      />
    );
  }

  if (!analytics) {
    return null;
  }

  // Mock data for charts (would be replaced with real data from API)
  const postingTrendData = [
    { date: '2026-05-13', poster_count: 12 },
    { date: '2026-05-14', poster_count: 15 },
    { date: '2026-05-15', poster_count: 8 },
    { date: '2026-05-16', poster_count: 22 },
    { date: '2026-05-17', poster_count: 18 },
    { date: '2026-05-18', poster_count: 25 },
    { date: '2026-05-19', poster_count: 20 },
  ];

  const categoryData = [
    { category: 'General', count: 45, color: CHART_COLORS[0] },
    { category: 'Achievement', count: 32, color: CHART_COLORS[1] },
    { category: 'Study Tip', count: 28, color: CHART_COLORS[2] },
    { category: 'Announcement', count: 15, color: CHART_COLORS[3] },
    { category: 'Project', count: 12, color: CHART_COLORS[4] },
    { category: 'Question', count: 8, color: CHART_COLORS[5] },
  ];

  const topPostsData = [
    { title: 'Board exam preparation tips', engagement: 45 },
    { title: 'Science fair project ideas', engagement: 38 },
    { title: 'Mathematics study group', engagement: 32 },
    { title: 'Holiday homework reminder', engagement: 28 },
    { title: 'Sports day announcement', engagement: 25 },
  ];

  return (
    <motion.div
      variants={slideUp}
      initial="initial"
      animate="animate"
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
        <p className="text-muted-foreground">Community engagement and moderation insights</p>
      </div>

      {/* KPI Cards */}
      <motion.div
        variants={staggerChildren}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <KPICard
          title="Active Posters (Week)"
          value={analytics.active_posters_week}
          change="+12%"
          icon={<Users className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title="Total Posts (Month)"
          value={analytics.total_posts_month}
          change="+8%"
          icon={<MessageCircle className="h-6 w-6" />}
          color="success"
        />
        <KPICard
          title="AI Review Rate"
          value={`${analytics.ai_review_rate.toFixed(1)}%`}
          change="-2%"
          icon={<Target className="h-6 w-6" />}
          color="warning"
        />
        <KPICard
          title="Cross-School Views"
          value={analytics.cross_school_views}
          change="+15%"
          icon={<TrendingUp className="h-6 w-6" />}
          color="success"
        />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Posting Trend */}
        <motion.div variants={listItem}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Posting Trend (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={postingTrendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    className="text-xs fill-muted-foreground"
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis className="text-xs fill-muted-foreground" />
                  <Tooltip
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    formatter={(value: any) => [typeof value === 'number' ? value : 0, 'Active Posters']}
                  />
                  <Area
                    type="monotone"
                    dataKey="poster_count"
                    stroke="#1E40AF"
                    fill="#1E40AF"
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Category Breakdown */}
        <motion.div variants={listItem}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Post Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="count"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [typeof value === 'number' ? value : 0, 'Posts']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {categoryData.map((category, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-muted-foreground">{category.category}</span>
                    <span className="font-medium ml-auto">{category.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Posts */}
        <motion.div variants={listItem}>
          <Card>
            <CardHeader>
              <CardTitle>Top 5 Posts by Engagement</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topPostsData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs fill-muted-foreground" />
                  <YAxis
                    type="category"
                    dataKey="title"
                    className="text-xs fill-muted-foreground"
                    width={120}
                    tickFormatter={(value) => value.length > 15 ? `${value.slice(0, 15)}...` : value}
                  />
                  <Tooltip />
                  <Bar dataKey="engagement" fill="#0D9488" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Moderation Summary */}
        <motion.div variants={listItem}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Moderation Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Total Posts</span>
                    <span className="font-medium">{analytics.moderation_summary.total}</span>
                  </div>
                  <Progress value={100} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Auto-removed</span>
                    <span className="font-medium text-danger">
                      {analytics.moderation_summary.auto_removed}
                    </span>
                  </div>
                  <Progress
                    value={(analytics.moderation_summary.auto_removed / analytics.moderation_summary.total) * 100}
                    className="h-2"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Principal-removed</span>
                    <span className="font-medium text-warning">
                      {analytics.moderation_summary.principal_removed}
                    </span>
                  </div>
                  <Progress
                    value={(analytics.moderation_summary.principal_removed / analytics.moderation_summary.total) * 100}
                    className="h-2"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Restored</span>
                    <span className="font-medium text-success">
                      {analytics.moderation_summary.restored}
                    </span>
                  </div>
                  <Progress
                    value={(analytics.moderation_summary.restored / analytics.moderation_summary.total) * 100}
                    className="h-2"
                  />
                </div>
              </div>

              <div className="pt-3 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">AI Accuracy</span>
                  <Badge variant="secondary">
                    {(100 - analytics.ai_review_rate).toFixed(1)}%
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Posts correctly identified by AI moderation
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}