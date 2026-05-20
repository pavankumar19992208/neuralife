import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { requireRole } from '../middleware/roleGuard.js';
import { supabaseAdmin } from '../lib/supabase.js';
import logger from '../lib/logger.js';
import { UserRole } from '../types/common.js';
import { SettingsRepository } from '../repositories/settings.repository.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';

// ─── Zod Schemas ──────────────────────────────────────────────────────────

const SchoolProfileSchema = z.object({
  name: z.string().min(2).max(200),
  affiliation_number: z.string().optional(),
  full_address: z.string().min(1).max(500),
  school_phone: z.string().optional(),
  school_email: z.string().email().optional(),
  principal_name: z.string().min(2).max(200),
  principal_email: z.string().email().optional(),
  principal_mobile: z.string().min(10).max(15),
});

const BrandingSchema = z.object({
  accent_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  tagline: z.string().max(200).optional(),
});

const CreateAcademicYearSchema = z.object({
  year_label: z.string().min(4).max(20),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  is_current: z.boolean().default(false),
});

const PromotionSchema = z.object({
  promotions: z.array(z.object({
    neuraId: z.string(),
    action: z.enum(['PROMOTE', 'REPEAT', 'RELEASE']),
    newClassYear: z.number().int().min(1).max(12).optional(),
    newSection: z.string().optional(),
    exitReason: z.string().optional(),
    exitType: z.enum(['TRANSFER', 'COMPLETED', 'DISCONTINUED', 'GRADUATED']).optional(),
    destinationSchool: z.string().optional(),
  })),
});

const FeeCategorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

const FeeHeadSchema = z.object({
  category_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  amount: z.number().min(0),
  frequency: z.enum(['ONE_TIME', 'MONTHLY', 'QUARTERLY', 'ANNUAL']),
  class_year: z.number().int().min(1).max(12).optional(),
  due_date_rule: z.string().default('MONTH_START'),
  is_mandatory: z.boolean().default(true),
});

const InviteAdminSchema = z.object({
  name: z.string().min(2).max(100),
  mobile: z.string().regex(/^[6-9]\d{9}$/), // 10-digit mobile without +91
  role: z.enum(['SCHOOL_ADMIN', 'VICE_PRINCIPAL']).default('SCHOOL_ADMIN'),
});

const ReleaseStudentsSchema = z.object({
  releases: z.array(z.object({
    neura_id: z.string(),
    exit_reason: z.string().min(1).max(200),
    exit_type: z.enum(['TRANSFER', 'COMPLETED', 'DISCONTINUED', 'GRADUATED']),
    destination_school: z.string().optional(),
  })),
});

const NotificationPrefsSchema = z.object({
  sms_enabled: z.boolean().optional(),
  email_enabled: z.boolean().optional(),
  push_enabled: z.boolean().optional(),
  attendance_alerts: z.boolean().optional(),
  fee_reminders: z.boolean().optional(),
  exam_notifications: z.boolean().optional(),
});

const CalendarSchema = z.object({
  working_days: z.array(z.number().int().min(0).max(6)).optional(),
  holidays: z.array(z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    name: z.string().min(1).max(100),
    type: z.enum(['NATIONAL', 'STATE', 'SCHOOL']),
  })).optional(),
});

const OnboardingStepSchema = z.object({
  is_completed: z.boolean(),
  data: z.record(z.any()).optional(),
});

// ─── Routes ────────────────────────────────────────────────────────────────

const routes: FastifyPluginAsync = async (fastify) => {
  const settingsRepo = new SettingsRepository(supabaseAdmin);

  // ─── School Profile ─────────────────────────────────────────────────────

  // GET /api/v1/settings/profile
  fastify.get(
    '/profile',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId;
      const { school_id } = request.jwtPayload;

      logger.info({ correlationId, school_id }, 'Getting school profile');

      const profile = await settingsRepo.getSchoolProfile(school_id, correlationId);
      return reply.send({ data: profile });
    }
  );

  // PUT /api/v1/settings/profile
  fastify.put(
    '/profile',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId;
      const { school_id, sub: userId } = request.jwtPayload;
      const body = SchoolProfileSchema.parse(request.body);

      logger.info({ correlationId, school_id }, 'Updating school profile');

      const profile = await settingsRepo.updateSchoolProfile(
        school_id,
        body,
        correlationId
      );

      // Log the change
      await settingsRepo.logSettingsChange(
        school_id,
        userId,
        'UPDATE',
        'Updated school profile',
        undefined,
        body,
        request.ip,
        request.headers['user-agent'],
        correlationId
      );

      return reply.send({ data: profile });
    }
  );

  // ─── Branding ───────────────────────────────────────────────────────────

  // POST /api/v1/settings/branding/logo
  fastify.post(
    '/branding/logo',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId;
      const { school_id } = request.jwtPayload;

      logger.info({ correlationId, school_id }, 'Uploading school logo');

      // TODO: Handle multipart form upload to Supabase Storage
      // For now, return placeholder response
      const logoUrl = `https://placeholder.com/150x150/1E40AF/ffffff?text=${encodeURIComponent('SCHOOL')}`;

      // Note: logo_url is not currently part of the database schema
      // Return placeholder response without updating database
      return reply.send({ data: { logo_url: logoUrl } });
    }
  );

  // PUT /api/v1/settings/branding
  fastify.put(
    '/branding',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId;
      const { school_id, sub: userId } = request.jwtPayload;
      const body = BrandingSchema.parse(request.body);

      // Note: Branding properties (accent_color, tagline) are not currently part of the database schema
      // Return success without updating database for now
      const profile = await settingsRepo.getSchoolProfile(school_id, correlationId);

      await settingsRepo.logSettingsChange(
        school_id,
        userId,
        'UPDATE',
        'Updated school branding',
        undefined,
        body,
        request.ip,
        request.headers['user-agent'],
        correlationId
      );

      return reply.send({ data: { ...profile, ...body } });
    }
  );

  // ─── Academic Years ─────────────────────────────────────────────────────

  // GET /api/v1/settings/academic-years
  fastify.get(
    '/academic-years',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId;
      const { school_id } = request.jwtPayload;

      const academicYears = await settingsRepo.getAcademicYears(school_id, correlationId);
      return reply.send({ data: academicYears });
    }
  );

  // GET /api/v1/settings/academic-years/current
  fastify.get(
    '/academic-years/current',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId;
      const { school_id } = request.jwtPayload;

      const currentYear = await settingsRepo.getCurrentAcademicYear(school_id, correlationId);
      return reply.send({ data: currentYear });
    }
  );

  // POST /api/v1/settings/academic-years
  fastify.post(
    '/academic-years',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId;
      const { school_id } = request.jwtPayload;
      const body = CreateAcademicYearSchema.parse(request.body);

      const academicYear = await settingsRepo.createAcademicYear(
        school_id,
        body,
        correlationId
      );

      return reply.code(201).send({ data: academicYear });
    }
  );

  // PUT /api/v1/settings/academic-years/:id/set-current
  fastify.put(
    '/academic-years/:id/set-current',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId;
      const { school_id } = request.jwtPayload;
      const { id: academicYearId } = request.params as { id: string };

      // Implementation: Set this year as current and unset others
      // This would need to be implemented in the repository
      // For now, return success
      return reply.send({ data: { success: true } });
    }
  );

  // POST /api/v1/settings/academic-years/:fromId/promote/:toId
  fastify.post(
    '/academic-years/:fromId/promote/:toId',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId;
      const { school_id } = request.jwtPayload;
      const { fromId, toId } = request.params as { fromId: string; toId: string };
      const body = PromotionSchema.parse(request.body);

      // TODO: Implement processStudentPromotions method
      // For now, return placeholder response
      const result = {
        promoted: 0,
        repeated: 0,
        released: 0
      };

      return reply.send({ data: result });
    }
  );

  // ─── Fee Structure ──────────────────────────────────────────────────────

  // GET /api/v1/settings/fee-structure/categories
  fastify.get(
    '/fee-structure/categories',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId;
      const { school_id } = request.jwtPayload;

      const categories = await settingsRepo.getCustomFeeHeads(school_id, correlationId);
      return reply.send({ data: categories });
    }
  );

  // POST /api/v1/settings/fee-structure/categories
  fastify.post(
    '/fee-structure/categories',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId;
      const { school_id } = request.jwtPayload;
      const body = FeeCategorySchema.parse(request.body);

      // TODO: Implement createFeeCategory - using placeholder for current academic year
      const currentAcademicYear = await settingsRepo.getCurrentAcademicYear(school_id, correlationId);
      if (!currentAcademicYear) {
        return reply.code(400).send({ error: 'No current academic year found' });
      }
      const customFeeHead = await settingsRepo.createCustomFeeHead(school_id, currentAcademicYear.id, {
        display_name: body.name,
        head_code: body.name.toUpperCase().replace(/\s+/g, '_'),
        collection_type: 'MANUAL',
        description: body.description || null,
        is_active: body.is_active
      }, correlationId);
      return reply.code(201).send({ data: customFeeHead });
    }
  );

  // GET /api/v1/settings/fee-structure/heads
  fastify.get(
    '/fee-structure/heads',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId;
      const { school_id } = request.jwtPayload;

      const feeHeads = await settingsRepo.getCustomFeeHeads(school_id, correlationId);
      return reply.send({ data: feeHeads });
    }
  );

  // POST /api/v1/settings/fee-structure/heads
  fastify.post(
    '/fee-structure/heads',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId;
      const { school_id } = request.jwtPayload;
      const body = FeeHeadSchema.parse(request.body);

      // TODO: Implement createFeeHead method
      const feeHead = { id: 'placeholder', ...body, school_id };
      return reply.code(201).send({ data: feeHead });
    }
  );

  // PUT /api/v1/settings/fee-structure/heads/:id
  fastify.put(
    '/fee-structure/heads/:id',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId;
      const { school_id } = request.jwtPayload;
      const { id } = request.params as { id: string };
      const body = FeeHeadSchema.partial().parse(request.body);

      // TODO: Implement updateFeeHead method
      const feeHead = { id, ...body };
      return reply.send({ data: feeHead });
    }
  );

  // DELETE /api/v1/settings/fee-structure/heads/:id
  fastify.delete(
    '/fee-structure/heads/:id',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId;
      const { id } = request.params as { id: string };

      // TODO: Implement deactivateFeeHead method
      return reply.code(204).send();
    }
  );

  // ─── User Management ────────────────────────────────────────────────────

  // GET /api/v1/settings/users
  fastify.get(
    '/users',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId;
      const { school_id } = request.jwtPayload;

      // TODO: Implement getSchoolAdminUsers method
      const users: any[] = [];
      return reply.send({ data: users });
    }
  );

  // POST /api/v1/settings/users/invite
  fastify.post(
    '/users/invite',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId;
      const { school_id } = request.jwtPayload;
      const body = InviteAdminSchema.parse(request.body);

      // TODO: Implement inviteSchoolAdminUser method
      const user = { id: 'placeholder', ...body, school_id };
      return reply.code(201).send({ data: user });
    }
  );

  // DELETE /api/v1/settings/users/:id
  fastify.delete(
    '/users/:id',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId;
      const { id } = request.params as { id: string };

      // TODO: Implement deactivateSchoolAdminUser method
      return reply.code(204).send();
    }
  );

  // ─── Student Release ────────────────────────────────────────────────────

  // GET /api/v1/settings/students/release
  fastify.get(
    '/students/release',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId;
      const { school_id } = request.jwtPayload;
      const { academic_year_id, class_year } = request.query as { academic_year_id: string; class_year?: string };

      // TODO: Implement getStudentsForRelease method
      const students = await settingsRepo.getStudentStatusOverview(school_id, correlationId);

      return reply.send({ data: students });
    }
  );

  // POST /api/v1/settings/students/release
  fastify.post(
    '/students/release',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId;
      const body = ReleaseStudentsSchema.parse(request.body);

      // Process releases (this would need to be implemented in repository)
      const result = { released: body.releases.length };

      return reply.send({ data: result });
    }
  );

  // ─── Notifications ──────────────────────────────────────────────────────

  // GET /api/v1/settings/notifications
  fastify.get(
    '/notifications',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId;
      const { school_id } = request.jwtPayload;

      // Return default notification settings for now
      const preferences = {
        sms_enabled: true,
        email_enabled: true,
        push_enabled: true,
        attendance_alerts: true,
        fee_reminders: true,
        exam_notifications: true,
      };

      return reply.send({ data: preferences });
    }
  );

  // PUT /api/v1/settings/notifications
  fastify.put(
    '/notifications',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId;
      const { school_id } = request.jwtPayload;
      const body = NotificationPrefsSchema.parse(request.body);

      // For now, just return the body as if it was saved
      return reply.send({ data: body });
    }
  );

  // ─── Calendar ───────────────────────────────────────────────────────────

  // GET /api/v1/settings/calendar
  fastify.get(
    '/calendar',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId;
      const { school_id } = request.jwtPayload;

      // Return default calendar settings
      const calendar = {
        working_days: [1, 2, 3, 4, 5, 6], // Monday to Saturday
        holidays: [],
      };

      return reply.send({ data: calendar });
    }
  );

  // PUT /api/v1/settings/calendar
  fastify.put(
    '/calendar',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId;
      const { school_id } = request.jwtPayload;
      const body = CalendarSchema.parse(request.body);

      return reply.send({ data: body });
    }
  );

  // ─── Onboarding ─────────────────────────────────────────────────────────

  // GET /api/v1/settings/onboarding
  fastify.get(
    '/onboarding',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId;
      const { school_id } = request.jwtPayload;

      const progress = await settingsRepo.getOnboardingStatus(school_id, correlationId);
      return reply.send({ data: progress });
    }
  );

  // PUT /api/v1/settings/onboarding/step/:stepNumber
  fastify.put(
    '/onboarding/step/:stepNumber',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId;
      const { school_id } = request.jwtPayload;
      const { stepNumber } = request.params as { stepNumber: string };
      const body = OnboardingStepSchema.parse(request.body);

      const progress = await settingsRepo.updateOnboardingStatus(
        school_id,
        parseInt(stepNumber),
        body.is_completed,
        correlationId
      );

      return reply.send({ data: progress });
    }
  );

  // POST /api/v1/settings/onboarding/complete
  fastify.post(
    '/onboarding/complete',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId;
      const { school_id } = request.jwtPayload;

      // Mark school as onboarding complete
      const profile = await settingsRepo.updateSchoolProfile(
        school_id,
        { onboarding_complete: true, onboarding_step: 8 },
        correlationId
      );

      return reply.send({ data: profile });
    }
  );

  // ─── Verification ───────────────────────────────────────────────────────

  // GET /api/v1/settings/verify
  fastify.get(
    '/verify',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId;
      const { school_id } = request.jwtPayload;

      // Check completion status of various settings
      const profile = await settingsRepo.getSchoolProfile(school_id, correlationId);
      const academicYears = await settingsRepo.getAcademicYears(school_id, correlationId);
      const categories = await settingsRepo.getCustomFeeHeads(school_id, correlationId);
      // TODO: Implement getSchoolAdminUsers method
      const users: any[] = [];

      const verification = {
        profile_complete: !!(profile.name && profile.full_address),
        academic_year_setup: academicYears.length > 0,
        fee_structure_setup: categories.length > 0,
        admin_users_added: users.length > 0,
        missing_requirements: [] as string[],
      };

      if (!verification.profile_complete) {
        verification.missing_requirements.push('Complete school profile');
      }
      if (!verification.academic_year_setup) {
        verification.missing_requirements.push('Set up academic year');
      }
      if (!verification.fee_structure_setup) {
        verification.missing_requirements.push('Configure fee structure');
      }
      if (!verification.admin_users_added) {
        verification.missing_requirements.push('Add admin users');
      }

      return reply.send({ data: verification });
    }
  );
};

export default routes;