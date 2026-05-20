import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { requireRole } from '../middleware/roleGuard.js';
import { supabaseAdmin } from '../lib/supabase.js';
import logger from '../lib/logger.js';
import { UserRole } from '../types/common.js';
import type {
  ModerationSummary,
  NeuraSpherePost,
  CreatePostInput,
  PostActionInput,
  SphereAnalytics,
  NeuraSphereSettings,
} from '../types/common.js';
import { SphereRepository } from '../repositories/sphere.repository.js';
import { ValidationError } from '../utils/errors.js';

const PostActionSchema = z.object({
  action: z.enum(['REMOVE', 'RESTORE', 'PIN', 'UNPIN', 'WARN', 'BLOCK']),
});

const CreatePostSchema = z.object({
  content: z.string().min(1).max(300).trim(),
  post_category: z.enum(['GENERAL', 'STUDY_TIP', 'ACHIEVEMENT', 'ANNOUNCEMENT', 'QUESTION', 'PROJECT']),
  is_cross_school: z.boolean(),
  scheduled_at: z.string().optional(),
  image_urls: z.array(z.string().url()).max(3).optional(),
});

const PostsQuerySchema = z.object({
  author_type: z.enum(['STUDENT', 'PRINCIPAL', 'TEACHER', 'SYSTEM']).optional(),
  class_year: z.coerce.number().min(1).max(12).optional(),
  status: z.enum(['ACTIVE', 'SCHEDULED', 'REMOVED_BY_AI', 'REMOVED_BY_PRINCIPAL', 'DRAFT']).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
});

const UpdateSettingsSchema = z.object({
  allow_cross_school: z.boolean().optional(),
  require_approval: z.boolean().optional(),
  max_posts_per_day: z.number().min(1).max(20).optional(),
  keyword_blocklist: z.array(z.string()).optional(),
  blocked_posters: z.array(z.string()).optional(),
  posting_hours_start: z.string().regex(/^\d{2}:\d{2}:\d{2}$/).optional(),
  posting_hours_end: z.string().regex(/^\d{2}:\d{2}:\d{2}$/).optional(),
  enable_achievements: z.boolean().optional(),
  enable_manual_posts: z.boolean().optional(),
  enable_photo_posts: z.boolean().optional(),
});

const routes: FastifyPluginAsync = async (fastify) => {
  const sphereRepo = new SphereRepository(supabaseAdmin, logger);

  // GET /api/v1/sphere/moderation - Get flagged posts for moderation
  fastify.get(
    '/api/v1/sphere/moderation',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId;
      const { school_id } = request.jwtPayload;

      logger.info({ correlationId, school_id }, 'Fetching moderation summary');

      const moderationSummary = await sphereRepo.getModerationSummary(school_id, correlationId);

      return reply.send({ data: moderationSummary });
    }
  );

  // PUT /api/v1/sphere/posts/:id/action - Take moderation action on a post
  fastify.put(
    '/api/v1/sphere/posts/:id/action',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId;
      const { school_id, teacher_id } = request.jwtPayload;
      const postId = (request.params as { id: string }).id;
      const body = PostActionSchema.parse(request.body);

      logger.info({ correlationId, postId, action: body.action }, 'Taking moderation action');

      const result = await sphereRepo.takeModerationAction(
        postId,
        body.action,
        teacher_id || 'PRINCIPAL',
        'PRINCIPAL',
        school_id,
        correlationId
      );

      return reply.send({ data: result });
    }
  );

  // GET /api/v1/sphere/posts - Get posts with filters and pagination
  fastify.get(
    '/api/v1/sphere/posts',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL, UserRole.TEACHER]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId;
      const { school_id } = request.jwtPayload;
      const query = PostsQuerySchema.parse(request.query);

      logger.info({ correlationId, school_id, filters: query }, 'Fetching posts');

      const posts = await sphereRepo.getPosts(school_id, query, correlationId);
      const total = await sphereRepo.getPostsCount(school_id, query, correlationId);

      return reply.send({
        data: posts,
        meta: {
          total,
          page: query.page,
          limit: query.limit,
        },
      });
    }
  );

  // POST /api/v1/sphere/posts - Create new post (Principal only)
  fastify.post(
    '/api/v1/sphere/posts',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId;
      const { school_id, teacher_id } = request.jwtPayload;
      const body = CreatePostSchema.parse(request.body);

      logger.info({ correlationId, school_id, category: body.post_category }, 'Creating principal post');

      const post = await sphereRepo.createPost(
        {
          neura_id: null, // Principal posts don't have neura_id
          school_id,
          author_type: 'PRINCIPAL',
          post_type: 'MANUAL',
          content_text: body.content,
          post_category: body.post_category,
          is_cross_school: body.is_cross_school,
          scheduled_at: body.scheduled_at,
          image_url: body.image_urls?.[0] || null,
          ai_score: 'SAFE', // Principal posts bypass AI moderation
          moderation_status: 'APPROVED',
          published_at: body.scheduled_at ? null : new Date().toISOString(),
          status: body.scheduled_at ? 'SCHEDULED' : 'ACTIVE',
        },
        correlationId
      );

      // Log the post creation action
      await sphereRepo.logModerationAction(
        post.id,
        'APPROVE',
        teacher_id || 'PRINCIPAL',
        'PRINCIPAL',
        'Principal post auto-approved',
        correlationId
      );

      logger.info({ correlationId, postId: post.id }, 'Principal post created');
      return reply.code(201).send({ data: post });
    }
  );

  // GET /api/v1/sphere/analytics - Get sphere analytics
  fastify.get(
    '/api/v1/sphere/analytics',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId;
      const { school_id } = request.jwtPayload;

      logger.info({ correlationId, school_id }, 'Fetching sphere analytics');

      const analytics = await sphereRepo.getAnalytics(school_id, correlationId);

      return reply.send({ data: analytics });
    }
  );

  // GET /api/v1/sphere/settings - Get sphere settings
  fastify.get(
    '/api/v1/sphere/settings',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId;
      const { school_id } = request.jwtPayload;

      logger.info({ correlationId, school_id }, 'Fetching sphere settings');

      const settings = await sphereRepo.getSettings(school_id, correlationId);

      return reply.send({ data: settings });
    }
  );

  // PUT /api/v1/sphere/settings - Update sphere settings
  fastify.put(
    '/api/v1/sphere/settings',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId;
      const { school_id, teacher_id } = request.jwtPayload;
      const body = UpdateSettingsSchema.parse(request.body);

      logger.info({ correlationId, school_id, changes: Object.keys(body) }, 'Updating sphere settings');

      const updatedSettings = await sphereRepo.updateSettings(
        school_id,
        body,
        teacher_id || 'PRINCIPAL',
        correlationId
      );

      return reply.send({ data: updatedSettings });
    }
  );
};

export default routes;