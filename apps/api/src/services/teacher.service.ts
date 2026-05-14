import logger from '../lib/logger.js'
import { NotFoundError } from '../utils/errors.js'
import { auditLog } from '../utils/audit.js'
import { TeacherRepository } from '../repositories/teacher.repository.js'
import { SalaryRepository } from '../repositories/salary.repository.js'
import { LeaveRepository } from '../repositories/leave.repository.js'
import { EnrollmentRepository } from '../repositories/enrollment.repository.js'
import type {
  CreateTeacherInput,
  UpdateTeacherInput,
  CreateSalaryInput,
  TeacherListItem,
  TeacherDetail,
  UserRole,
} from '../types/common.js'

export class TeacherService {
  constructor(
    private readonly teacherRepo: TeacherRepository,
    private readonly salaryRepo: SalaryRepository,
    private readonly leaveRepo: LeaveRepository,
    private readonly enrollmentRepo: EnrollmentRepository,
  ) {}

  private async getCurrentAcademicYear(schoolId: string, correlationId: string): Promise<string> {
    return this.enrollmentRepo.getCurrentAcademicYear(schoolId, correlationId)
  }

  async createTeacher(
    data: CreateTeacherInput,
    schoolId: string,
    actorId: string | undefined,
    correlationId: string,
  ): Promise<{ teacher_id: string }> {
    logger.info({ correlationId, schoolId, full_name: data.full_name }, 'TeacherService.createTeacher')

    const academicYearId = await this.getCurrentAcademicYear(schoolId, correlationId)
    const result = await this.teacherRepo.createTeacher(data, schoolId, academicYearId, correlationId)

    await auditLog({
      event_type: 'TEACHER_CREATED',
      actor_id: actorId,
      actor_role: 'PRINCIPAL',
      school_id: schoolId,
      target_table: 'teachers',
      result: 'SUCCESS',
      action_detail: { teacher_id: result.teacher_id },
      correlationId,
    })

    return result
  }

  async listTeachers(
    schoolId: string,
    page: number,
    limit: number,
    correlationId: string,
  ): Promise<{ teachers: TeacherListItem[]; total: number }> {
    logger.debug({ correlationId, schoolId, page, limit }, 'TeacherService.listTeachers')

    const academicYearId = await this.getCurrentAcademicYear(schoolId, correlationId)
    return this.teacherRepo.findBySchool(schoolId, academicYearId, page, limit, correlationId)
  }

  async getTeacherProfile(
    teacherId: string,
    schoolId: string,
    requesterRole: UserRole | string,
    correlationId: string,
  ): Promise<TeacherDetail> {
    logger.debug({ correlationId, teacherId, schoolId, requesterRole }, 'TeacherService.getTeacherProfile')

    const teacher = await this.teacherRepo.findById(teacherId, schoolId, correlationId)
    if (!teacher) throw new NotFoundError('Teacher not found', { teacher_id: teacherId })

    // Attach salary only for PRINCIPAL and SCHOOL_ADMIN
    if (requesterRole === 'PRINCIPAL' || requesterRole === 'SCHOOL_ADMIN') {
      const salary = await this.salaryRepo.findCurrent(teacherId, schoolId, correlationId)
      if (salary) {
        teacher.salary = {
          basic: salary.basic,
          gross_monthly: salary.gross_monthly ?? 0,
          hra_value: salary.hra_value ?? 0,
          da_value: salary.da_value ?? 0,
          transport_allowance: salary.transport_allowance ?? 0,
          special_allowance: salary.special_allowance ?? 0,
          pf_applicable: salary.pf_applicable ?? false,
          esi_applicable: salary.esi_applicable ?? false,
          bank_name: salary.bank_name,
          ifsc_code: salary.ifsc_code,
          effective_from: salary.effective_from,
        }
      }
    }

    return teacher
  }

  async updateTeacher(
    teacherId: string,
    schoolId: string,
    updates: UpdateTeacherInput,
    correlationId: string,
  ): Promise<void> {
    return this.teacherRepo.updateTeacher(teacherId, schoolId, updates, correlationId)
  }

  async setSalaryStructure(
    teacherId: string,
    schoolId: string,
    input: CreateSalaryInput,
    actorId: string | undefined,
    correlationId: string,
  ): Promise<number> {
    logger.info({ correlationId, teacherId, schoolId }, 'TeacherService.setSalaryStructure')

    await this.salaryRepo.createSalaryStructure(teacherId, schoolId, input, correlationId)

    const gross = this.salaryRepo.computeGross(input)

    await auditLog({
      event_type: 'SALARY_STRUCTURE_UPDATED',
      actor_id: actorId,
      actor_role: 'PRINCIPAL',
      school_id: schoolId,
      target_table: 'salary_structures',
      result: 'SUCCESS',
      action_detail: { teacher_id: teacherId, gross_monthly: gross },
      correlationId,
    })

    return gross
  }

  async softDeleteTeacher(
    teacherId: string,
    schoolId: string,
    actorId: string | undefined,
    correlationId: string,
  ): Promise<void> {
    await this.teacherRepo.softDeleteTeacher(teacherId, schoolId, correlationId)

    await auditLog({
      event_type: 'TEACHER_DEACTIVATED',
      actor_id: actorId,
      actor_role: 'PRINCIPAL',
      school_id: schoolId,
      target_table: 'teachers',
      result: 'SUCCESS',
      action_detail: { teacher_id: teacherId },
      correlationId,
    })
  }
}
