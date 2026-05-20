import { SupabaseClient } from '@supabase/supabase-js';
import { Database, Tables } from '@neuralife/shared';
import { DatabaseError, NotFoundError } from '../utils/errors.js';
import { logger } from '../lib/logger.js';

type SchoolProfile = {
  id: string;
  name: string;
  affiliation_number?: string | null;
  full_address: string;
  school_phone?: string | null;
  school_email?: string | null;
  onboarding_complete?: boolean | null;
  onboarding_step?: number | null;
  principal_name: string;
  principal_email?: string | null;
  principal_mobile: string;
  board: SchoolRow['board'];
  medium: SchoolRow['medium'];
  school_type: SchoolRow['school_type'];
  district: string;
  state: string;
};

type AcademicYearRow = Tables<'academic_years'>;
type CustomFeeHead = Tables<'custom_fee_heads'>;
type SchoolRow = Tables<'schools'>;

export class SettingsRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  // ─── SCHOOL PROFILE ─────────────────────────────────────────────────────
  async getSchoolProfile(schoolId: string, correlationId: string): Promise<SchoolProfile> {
    logger.info({ correlationId, schoolId }, 'Fetching school profile');

    const { data, error } = await this.supabase
      .from('schools')
      .select('id, name, affiliation_number, full_address, school_phone, school_email, onboarding_complete, onboarding_step, principal_name, principal_email, principal_mobile, board, medium, school_type, district, state')
      .eq('id', schoolId)
      .single();

    if (error) {
      logger.error({ correlationId, error, schoolId }, 'Failed to fetch school profile');
      throw new DatabaseError(error.message, { schoolId });
    }

    if (!data) {
      throw new NotFoundError('School not found', { schoolId });
    }

    return data;
  }

  async updateSchoolProfile(
    schoolId: string,
    updates: Partial<SchoolProfile>,
    correlationId: string
  ): Promise<SchoolProfile> {
    logger.info({ correlationId, schoolId, updates }, 'Updating school profile');

    // Filter out null values for non-nullable fields
    const cleanUpdates = { ...updates };
    if (cleanUpdates.full_address === null) {
      delete cleanUpdates.full_address;
    }

    const { data, error } = await this.supabase
      .from('schools')
      .update(cleanUpdates)
      .eq('id', schoolId)
      .select('id, name, affiliation_number, full_address, school_phone, school_email, onboarding_complete, onboarding_step, principal_name, principal_email, principal_mobile, board, medium, school_type, district, state')
      .single();

    if (error) {
      logger.error({ correlationId, error, schoolId }, 'Failed to update school profile');
      throw new DatabaseError(error.message, { schoolId });
    }

    return data;
  }

  // ─── ACADEMIC YEARS ─────────────────────────────────────────────────────
  async getAcademicYears(schoolId: string, correlationId: string): Promise<AcademicYearRow[]> {
    logger.info({ correlationId, schoolId }, 'Fetching academic years');

    const { data, error } = await this.supabase
      .from('academic_years')
      .select('*')
      .eq('school_id', schoolId)
      .order('start_date', { ascending: false });

    if (error) {
      logger.error({ correlationId, error, schoolId }, 'Failed to fetch academic years');
      throw new DatabaseError(error.message, { schoolId });
    }

    return data || [];
  }

  async getCurrentAcademicYear(schoolId: string, correlationId: string): Promise<AcademicYearRow | null> {
    logger.info({ correlationId, schoolId }, 'Fetching current academic year');

    const { data, error } = await this.supabase
      .from('academic_years')
      .select('*')
      .eq('school_id', schoolId)
      .eq('is_current', true)
      .single();

    if (error) {
      logger.warn({ correlationId, error, schoolId }, 'No current academic year found');
      return null;
    }

    return data;
  }

  async createAcademicYear(
    schoolId: string,
    academicYear: Omit<AcademicYearRow, 'id' | 'school_id' | 'created_at'>,
    correlationId: string
  ): Promise<AcademicYearRow> {
    logger.info({ correlationId, schoolId, academicYear }, 'Creating academic year');

    const { data, error } = await this.supabase
      .from('academic_years')
      .insert({
        school_id: schoolId,
        ...academicYear
      })
      .select()
      .single();

    if (error) {
      logger.error({ correlationId, error, schoolId }, 'Failed to create academic year');
      throw new DatabaseError(error.message, { schoolId });
    }

    return data;
  }

  // ─── CUSTOM FEE HEADS ──────────────────────────────────────────────────────
  async getCustomFeeHeads(schoolId: string, correlationId: string): Promise<CustomFeeHead[]> {
    logger.info({ correlationId, schoolId }, 'Fetching custom fee heads');

    const { data, error } = await this.supabase
      .from('custom_fee_heads')
      .select('*')
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .order('display_name');

    if (error) {
      logger.error({ correlationId, error, schoolId }, 'Failed to fetch custom fee heads');
      throw new DatabaseError(error.message, { schoolId });
    }

    return data || [];
  }

  async createCustomFeeHead(
    schoolId: string,
    academicYearId: string,
    feeHead: Omit<CustomFeeHead, 'id' | 'school_id' | 'academic_year_id' | 'created_at'>,
    correlationId: string
  ): Promise<CustomFeeHead> {
    logger.info({ correlationId, schoolId, feeHead }, 'Creating custom fee head');

    const { data, error } = await this.supabase
      .from('custom_fee_heads')
      .insert({
        school_id: schoolId,
        academic_year_id: academicYearId,
        ...feeHead
      })
      .select()
      .single();

    if (error) {
      logger.error({ correlationId, error, schoolId }, 'Failed to create custom fee head');
      throw new DatabaseError(error.message, { schoolId });
    }

    return data;
  }

  async getCustomFeeHeadsByAcademicYear(schoolId: string, academicYearId: string, correlationId: string): Promise<CustomFeeHead[]> {
    logger.info({ correlationId, schoolId, academicYearId }, 'Fetching custom fee heads by academic year');

    const { data, error } = await this.supabase
      .from('custom_fee_heads')
      .select('*')
      .eq('school_id', schoolId)
      .eq('academic_year_id', academicYearId)
      .eq('is_active', true)
      .order('display_name');

    if (error) {
      logger.error({ correlationId, error, schoolId }, 'Failed to fetch custom fee heads');
      throw new DatabaseError(error.message, { schoolId });
    }

    return data || [];
  }

  // ─── STUDENT STATUS OVERVIEW ───────────────────────────────────────────────
  async getStudentStatusOverview(schoolId: string, _correlationId: string) {
    logger.info({ schoolId }, 'Fetching student status overview');

    const { data, error } = await this.supabase
      .from('student_yearly_progress')
      .select(`
        neura_id,
        students!inner(neura_id, full_name),
        class_year,
        section
      `)
      .eq('school_id', schoolId);

    if (error) {
      throw new DatabaseError(error.message, { schoolId });
    }

    return (data || []).map((row: any) => ({
      neura_id: row.neura_id,
      full_name: row.students.full_name,
      class_year: row.class_year,
      section: row.section
    }));
  }

  // ─── ONBOARDING STATUS ──────────────────────────────────────────────────
  async getOnboardingStatus(schoolId: string, _correlationId: string) {
    logger.info({ schoolId }, 'Fetching onboarding status');

    const { data, error } = await this.supabase
      .from('schools')
      .select('onboarding_complete, onboarding_step')
      .eq('id', schoolId)
      .single();

    if (error) {
      throw new DatabaseError(error.message, { schoolId });
    }

    return {
      onboarding_completed: data.onboarding_complete || false,
      current_step: data.onboarding_step || 1,
      total_steps: 7 // Fixed number based on onboarding wizard
    };
  }

  async updateOnboardingStatus(
    schoolId: string,
    stepNumber: number,
    isCompleted: boolean,
    _correlationId: string
  ) {
    logger.info({ schoolId, stepNumber, isCompleted }, 'Updating onboarding status');

    // If completing the final step, mark entire onboarding as complete
    const updates: any = {
      onboarding_step: stepNumber
    };

    if (stepNumber === 7 && isCompleted) {
      updates.onboarding_complete = true;
    }

    const { error } = await this.supabase
      .from('schools')
      .update(updates)
      .eq('id', schoolId);

    if (error) {
      throw new DatabaseError(error.message, { schoolId });
    }

    return { success: true };
  }

  // ─── AUDIT LOG PLACEHOLDER ─────────────────────────────────────────────
  async logSettingsChange(
    schoolId: string,
    userId: string,
    action: string,
    details: string,
    oldValues: Record<string, any> | undefined,
    newValues: Record<string, any> | undefined,
    ipAddress: string | undefined,
    userAgent: string | undefined,
    _correlationId: string
  ) {
    logger.info({
      schoolId,
      userId,
      action,
      details,
      hasOldValues: !!oldValues,
      hasNewValues: !!newValues,
      ipAddress,
      userAgent
    }, 'Settings change logged');

    // For now, just log to console - audit table would need to be implemented
    return { success: true };
  }
}