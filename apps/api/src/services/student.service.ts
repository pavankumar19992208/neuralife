import logger from '../lib/logger.js'
import { NotFoundError } from '../utils/errors.js'
import { auditLog } from '../utils/audit.js'
import { StudentRepository } from '../repositories/student.repository.js'
import { EnrollmentRepository } from '../repositories/enrollment.repository.js'
import { TeacherRepository } from '../repositories/teacher.repository.js'
import type {
  AdmitStudentInput,
  StudentDetail,
  StudentListFilters,
  StudentListItem,
  UserRole,
} from '../types/common.js'

export class StudentService {
  constructor(
    private readonly studentRepo: StudentRepository,
    private readonly enrollmentRepo: EnrollmentRepository,
    private readonly teacherRepo: TeacherRepository,
  ) {}

  async admitStudent(
    data: AdmitStudentInput,
    schoolId: string,
    admittingTeacherId: string,
    correlationId: string,
  ): Promise<{ student: StudentDetail; neura_id: string }> {
    logger.info({ correlationId, schoolId, full_name: data.full_name }, 'Admitting student')

    // 1. Current academic year
    const academicYearId = await this.enrollmentRepo.getCurrentAcademicYear(
      schoolId,
      correlationId,
    )

    // 2. Atomic NeuraID
    const neuraId = await this.studentRepo.generateNeuraId(schoolId, correlationId)

    // 3. School board (for yearly_progress)
    const schoolBoard = data.board ?? await this.studentRepo.getSchoolBoard(schoolId, correlationId)

    // 4. Create student record
    await this.studentRepo.createStudent(
      { ...data, neura_id: neuraId, school_id: schoolId },
      correlationId,
    )

    // 5–7: Enrollment + parents + consent (steps that depend on student existing)
    try {
      await this.enrollmentRepo.enroll(
        neuraId,
        schoolId,
        academicYearId,
        data.class_year,
        data.section,
        data.medium,
        schoolBoard,
        correlationId,
      )

      await this.enrollmentRepo.addParentContacts(
        neuraId,
        schoolId,
        data.parents,
        correlationId,
      )

      await this.enrollmentRepo.createConsentRecord(
        neuraId,
        schoolId,
        admittingTeacherId,
        correlationId,
      )
    } catch (error) {
      // Partial failure after student record created — log for manual cleanup
      logger.error(
        { correlationId, neuraId, error },
        'Partial enrollment failure after student insert — manual cleanup may be needed',
      )
      throw error
    }

    // 8. Audit log
    await auditLog({
      event_type: 'STUDENT_ENROLLED',
      actor_id: admittingTeacherId,
      actor_role: 'PRINCIPAL',
      school_id: schoolId,
      target_neura_id: neuraId,
      target_table: 'students',
      result: 'SUCCESS',
      correlationId,
    })

    // 9. Fetch and return full profile
    const student = await this.studentRepo.findByNeuraId(neuraId, schoolId, correlationId)

    logger.info(
      { correlationId, neuraId, schoolId },
      'Student admitted successfully',
    )

    return { student: student!, neura_id: neuraId }
  }

  async getStudent(
    neuraId: string,
    schoolId: string,
    role: UserRole,
    teacherId: string | undefined,
    correlationId: string,
  ): Promise<StudentDetail> {
    logger.debug({ correlationId, neuraId, schoolId, role }, 'StudentService.getStudent')

    const student = await this.studentRepo.findByNeuraId(neuraId, schoolId, correlationId)
    if (!student) {
      throw new NotFoundError('Student not found', { neura_id: neuraId })
    }

    // Teachers only see subjects they teach; class teachers see everything
    if (role === 'TEACHER' && teacherId) {
      const assignments = await this.teacherRepo.getSubjectAssignments(teacherId, schoolId, correlationId)

      const teacherSubjects = assignments.map((a) => a.subject)

      const isClassTeacher = assignments.some(
        (a) =>
          a.class_year === student.yearly_progress?.class_year &&
          a.section === student.yearly_progress?.section &&
          a.is_class_teacher === true,
      )

      if (!isClassTeacher) {
        student.mastery_summary = student.mastery_summary.filter((m) =>
          teacherSubjects.includes(m.subject),
        )
      }
    }

    return student
  }

  async listStudents(
    schoolId: string,
    filters: StudentListFilters,
    page: number,
    limit: number,
    correlationId: string,
  ): Promise<{ students: StudentListItem[]; total: number; page: number; limit: number }> {
    logger.debug({ correlationId, schoolId, filters, page, limit }, 'StudentService.listStudents')

    const result = await this.studentRepo.findBySchool(
      schoolId,
      filters,
      page,
      limit,
      correlationId,
    )
    return { ...result, page, limit }
  }
}
