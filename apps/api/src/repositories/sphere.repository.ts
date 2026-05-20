import type { SupabaseClient } from '@supabase/supabase-js';
import type { Logger } from 'pino';
import type {
  ModerationSummary,
  NeuraSpherePost,
  SphereAnalytics,
  NeuraSphereSettings,
  PostReport,
  ModerationAction,
} from '../types/common.js';
import { DatabaseError, NotFoundError } from '../utils/errors.js';

interface PostsQuery {
  author_type?: string;
  class_year?: number;
  status?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  page: number;
  limit: number;
}

interface CreatePostData {
  neura_id: string | null;
  school_id: string;
  post_type: string;
  content_text: string;
  image_url?: string | null;
  tags?: string[];
  badge_id?: string | null;
  author_type: string;
  ai_score: string;
  moderation_status: string;
  published_at: string | null;
  scheduled_at?: string | null;
  status: string;
  post_category: string;
  is_cross_school: boolean;
}

export class SphereRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly logger: Logger,
  ) {}

  async getModerationSummary(schoolId: string, correlationId: string): Promise<ModerationSummary> {
    this.logger.debug({ correlationId, schoolId }, 'SphereRepository.getModerationSummary');

    // Get AI-flagged posts (REVIEW or REMOVE score)
    const { data: aiFlagged, error: aiError } = await this.supabase
      .from('neurasphere_posts')
      .select(`
        id, neura_id, school_id, post_type, content_text, image_url, tags, badge_id,
        source, moderation_status, moderation_confidence, moderation_reason,
        published_at, parent_visible, deleted_at, created_at,
        ai_score, ai_confidence, ai_category, ai_reason, ai_checked_at,
        author_type, scheduled_at, is_pinned, is_cross_school, status, post_category,
        students!inner(full_name),
        student_yearly_progress!inner(class_year, section)
      `)
      .eq('school_id', schoolId)
      .in('ai_score', ['REVIEW', 'REMOVE'])
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (aiError) throw new DatabaseError(aiError.message, { schoolId, correlationId });

    // Get posts reported by community
    const { data: reportedPosts, error: reportError } = await this.supabase
      .from('neurasphere_posts')
      .select(`
        id, neura_id, school_id, post_type, content_text, image_url, tags, badge_id,
        source, moderation_status, moderation_confidence, moderation_reason,
        published_at, parent_visible, deleted_at, created_at,
        ai_score, ai_confidence, ai_category, ai_reason, ai_checked_at,
        author_type, scheduled_at, is_pinned, is_cross_school, status, post_category,
        students!inner(full_name),
        student_yearly_progress!inner(class_year, section),
        post_reports!inner(id)
      `)
      .eq('school_id', schoolId)
      .eq('post_reports.status', 'PENDING')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (reportError) throw new DatabaseError(reportError.message, { schoolId, correlationId });

    // Get recently auto-removed posts (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: autoRemoved, error: removedError } = await this.supabase
      .from('neurasphere_posts')
      .select(`
        id, neura_id, school_id, post_type, content_text, image_url, tags, badge_id,
        source, moderation_status, moderation_confidence, moderation_reason,
        published_at, parent_visible, deleted_at, created_at,
        ai_score, ai_confidence, ai_category, ai_reason, ai_checked_at,
        author_type, scheduled_at, is_pinned, is_cross_school, status, post_category,
        students!inner(full_name),
        student_yearly_progress!inner(class_year, section)
      `)
      .eq('school_id', schoolId)
      .eq('status', 'REMOVED_BY_AI')
      .gte('created_at', sevenDaysAgo)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (removedError) throw new DatabaseError(removedError.message, { schoolId, correlationId });

    // Transform and enrich the data
    const transformPost = (post: any): NeuraSpherePost => ({
      ...post,
      author_name: post.students?.full_name || 'Principal',
      author_class: post.student_yearly_progress?.class_year ? `${post.student_yearly_progress.class_year}` : null,
      author_section: post.student_yearly_progress?.section || null,
      report_count: 0, // Will be filled by separate query if needed
      reaction_count: 0, // Will be filled by separate query if needed
      comment_count: 0, // Will be filled by separate query if needed
    });

    return {
      flagged_by_ai: (aiFlagged || []).map(transformPost),
      reported_by_community: (reportedPosts || []).map(transformPost),
      recently_auto_removed: (autoRemoved || []).map(transformPost),
    };
  }

  async takeModerationAction(
    postId: string,
    action: string,
    takenBy: string,
    takenByType: string,
    schoolId: string,
    correlationId: string,
    reason?: string,
  ): Promise<{ success: boolean; post: NeuraSpherePost }> {
    this.logger.debug({ correlationId, postId, action }, 'SphereRepository.takeModerationAction');

    // Start transaction
    const { data: post, error: fetchError } = await this.supabase
      .from('neurasphere_posts')
      .select('*')
      .eq('id', postId)
      .eq('school_id', schoolId)
      .single();

    if (fetchError) throw new DatabaseError(fetchError.message, { postId, correlationId });
    if (!post) throw new NotFoundError('Post not found', { post_id: postId });

    let updateData: Partial<any> = {};

    switch (action) {
      case 'REMOVE':
        updateData = {
          status: 'REMOVED_BY_PRINCIPAL',
          moderation_status: 'REJECTED',
        };
        break;
      case 'RESTORE':
        updateData = {
          status: 'ACTIVE',
          moderation_status: 'APPROVED',
          published_at: new Date().toISOString(),
        };
        break;
      case 'PIN':
        updateData = { is_pinned: true };
        break;
      case 'UNPIN':
        updateData = { is_pinned: false };
        break;
      case 'WARN':
        // Warning doesn't change post status but logs action
        break;
      case 'BLOCK':
        // Add poster to blocked list
        const { data: settings } = await this.supabase
          .from('neurasphere_settings')
          .select('blocked_posters')
          .eq('school_id', schoolId)
          .single();

        if (settings && post.neura_id) {
          const blockedPosters = [...(settings.blocked_posters || []), post.neura_id];
          await this.supabase
            .from('neurasphere_settings')
            .update({ blocked_posters: blockedPosters })
            .eq('school_id', schoolId);
        }
        break;
    }

    // Update the post if needed
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await this.supabase
        .from('neurasphere_posts')
        .update(updateData)
        .eq('id', postId);

      if (updateError) throw new DatabaseError(updateError.message, { postId, correlationId });
    }

    // Log the moderation action
    await this.logModerationAction(postId, action, takenBy, takenByType, reason, correlationId);

    // Return updated post
    const { data: updatedPost, error: refetchError } = await this.supabase
      .from('neurasphere_posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (refetchError) throw new DatabaseError(refetchError.message, { postId, correlationId });

    return { success: true, post: updatedPost as NeuraSpherePost };
  }

  async logModerationAction(
    postId: string,
    action: string,
    takenBy: string,
    takenByType: string,
    reason?: string,
    correlationId?: string,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('moderation_actions')
      .insert({
        post_id: postId,
        action,
        taken_by: takenBy,
        taken_by_type: takenByType,
        reason,
        action_metadata: {},
      });

    if (error) throw new DatabaseError(error.message, { postId, correlationId });
  }

  async getPosts(schoolId: string, query: PostsQuery, correlationId: string): Promise<NeuraSpherePost[]> {
    this.logger.debug({ correlationId, schoolId, query }, 'SphereRepository.getPosts');

    let supabaseQuery = this.supabase
      .from('neurasphere_posts')
      .select(`
        id, neura_id, school_id, post_type, content_text, image_url, tags, badge_id,
        source, moderation_status, moderation_confidence, moderation_reason,
        published_at, parent_visible, deleted_at, created_at,
        ai_score, ai_confidence, ai_category, ai_reason, ai_checked_at,
        author_type, scheduled_at, is_pinned, is_cross_school, status, post_category,
        students(full_name),
        student_yearly_progress(class_year, section)
      `)
      .eq('school_id', schoolId)
      .is('deleted_at', null);

    // Apply filters
    if (query.author_type) {
      supabaseQuery = supabaseQuery.eq('author_type', query.author_type);
    }
    if (query.status) {
      supabaseQuery = supabaseQuery.eq('status', query.status);
    }
    if (query.date_from) {
      supabaseQuery = supabaseQuery.gte('created_at', query.date_from);
    }
    if (query.date_to) {
      supabaseQuery = supabaseQuery.lte('created_at', query.date_to);
    }
    if (query.search) {
      supabaseQuery = supabaseQuery.ilike('content_text', `%${query.search}%`);
    }

    // Apply pagination
    const offset = (query.page - 1) * query.limit;
    supabaseQuery = supabaseQuery
      .range(offset, offset + query.limit - 1)
      .order('created_at', { ascending: false });

    const { data, error } = await supabaseQuery;

    if (error) throw new DatabaseError(error.message, { schoolId, correlationId });

    return (data || []).map((post: any) => ({
      ...post,
      author_name: post.students?.full_name || 'Principal',
      author_class: post.student_yearly_progress?.class_year ? `${post.student_yearly_progress.class_year}` : null,
      author_section: post.student_yearly_progress?.section || null,
      report_count: 0,
      reaction_count: 0,
      comment_count: 0,
    })) as NeuraSpherePost[];
  }

  async getPostsCount(schoolId: string, query: PostsQuery, correlationId: string): Promise<number> {
    let supabaseQuery = this.supabase
      .from('neurasphere_posts')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .is('deleted_at', null);

    // Apply same filters as getPosts
    if (query.author_type) {
      supabaseQuery = supabaseQuery.eq('author_type', query.author_type);
    }
    if (query.status) {
      supabaseQuery = supabaseQuery.eq('status', query.status);
    }
    if (query.date_from) {
      supabaseQuery = supabaseQuery.gte('created_at', query.date_from);
    }
    if (query.date_to) {
      supabaseQuery = supabaseQuery.lte('created_at', query.date_to);
    }
    if (query.search) {
      supabaseQuery = supabaseQuery.ilike('content_text', `%${query.search}%`);
    }

    const { count, error } = await supabaseQuery;

    if (error) throw new DatabaseError(error.message, { schoolId, correlationId });
    return count || 0;
  }

  async createPost(postData: CreatePostData, correlationId: string): Promise<NeuraSpherePost> {
    this.logger.debug({ correlationId, postData }, 'SphereRepository.createPost');

    const { data, error } = await this.supabase
      .from('neurasphere_posts')
      .insert(postData)
      .select()
      .single();

    if (error) throw new DatabaseError(error.message, { correlationId });
    return data as NeuraSpherePost;
  }

  async getAnalytics(schoolId: string, correlationId: string): Promise<SphereAnalytics> {
    this.logger.debug({ correlationId, schoolId }, 'SphereRepository.getAnalytics');

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Get active posters this week
    const { count: activePosters } = await this.supabase
      .from('neurasphere_posts')
      .select('neura_id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .gte('created_at', oneWeekAgo)
      .is('deleted_at', null);

    // Get total posts this month
    const { count: totalPosts } = await this.supabase
      .from('neurasphere_posts')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .gte('created_at', oneMonthAgo)
      .is('deleted_at', null);

    // Get AI review rate
    const { count: totalAIChecked } = await this.supabase
      .from('neurasphere_posts')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .not('ai_score', 'is', null);

    const { count: flaggedByAI } = await this.supabase
      .from('neurasphere_posts')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .in('ai_score', ['REVIEW', 'REMOVE']);

    const aiReviewRate = totalAIChecked ? (flaggedByAI || 0) / totalAIChecked * 100 : 0;

    // Mock data for other analytics (would implement with real queries)
    return {
      active_posters_week: activePosters || 0,
      total_posts_month: totalPosts || 0,
      ai_review_rate: aiReviewRate,
      cross_school_views: 0, // Would need view tracking
      top_posts: [],
      posting_trend: [],
      category_breakdown: [],
      moderation_summary: {
        total: totalPosts || 0,
        auto_removed: flaggedByAI || 0,
        principal_removed: 0,
        restored: 0,
      },
    };
  }

  async getSettings(schoolId: string, correlationId: string): Promise<NeuraSphereSettings> {
    this.logger.debug({ correlationId, schoolId }, 'SphereRepository.getSettings');

    const { data, error } = await this.supabase
      .from('neurasphere_settings')
      .select('*')
      .eq('school_id', schoolId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No settings found, return defaults
        const defaultSettings: NeuraSphereSettings = {
          id: '',
          school_id: schoolId,
          allow_cross_school: true,
          require_approval: false,
          max_posts_per_day: 5,
          keyword_blocklist: [],
          blocked_posters: [],
          posting_hours_start: '06:00:00',
          posting_hours_end: '22:00:00',
          enable_achievements: true,
          enable_manual_posts: true,
          enable_photo_posts: true,
          settings_audit_log: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        return defaultSettings;
      }
      throw new DatabaseError(error.message, { schoolId, correlationId });
    }

    return data as NeuraSphereSettings;
  }

  async updateSettings(
    schoolId: string,
    updates: Partial<NeuraSphereSettings>,
    updatedBy: string,
    correlationId: string,
  ): Promise<NeuraSphereSettings> {
    this.logger.debug({ correlationId, schoolId, updates }, 'SphereRepository.updateSettings');

    // Add audit log entry
    const auditEntry = {
      timestamp: new Date().toISOString(),
      updated_by: updatedBy,
      changes: updates,
    };

    const { data: existingSettings } = await this.supabase
      .from('neurasphere_settings')
      .select('settings_audit_log')
      .eq('school_id', schoolId)
      .single();

    const auditLog = [...(existingSettings?.settings_audit_log || []), auditEntry];

    const { data, error } = await this.supabase
      .from('neurasphere_settings')
      .upsert({
        school_id: schoolId,
        ...updates,
        settings_audit_log: auditLog,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new DatabaseError(error.message, { schoolId, correlationId });
    return data as NeuraSphereSettings;
  }
}