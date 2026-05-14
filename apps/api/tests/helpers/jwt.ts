import { signAccessToken, signRefreshToken } from '../../src/lib/jwt.js'
import { UserRole } from '../../src/types/common.js'

export function makeTeacherJWT(overrides: Partial<{ school_id: string; teacher_id: string }> = {}) {
  return signAccessToken({
    sub: 'teacher-uuid-001',
    role: UserRole.TEACHER,
    school_id: overrides.school_id ?? 'SCH-AP-DEMO-0001',
    teacher_id: overrides.teacher_id ?? 'teacher-uuid-001',
  })
}

export function makePrincipalJWT(schoolId = 'SCH-AP-DEMO-0001') {
  return signAccessToken({
    sub: 'principal-uuid-001',
    role: UserRole.PRINCIPAL,
    school_id: schoolId,
    teacher_id: 'principal-uuid-001',
  })
}

export function makeStudentJWT(neuraId = 'NID-2025-AP-084291', schoolId = 'SCH-AP-DEMO-0001') {
  return signAccessToken({
    sub: neuraId,
    role: UserRole.STUDENT,
    school_id: schoolId,
    neura_id: neuraId,
  })
}

export function makeRefreshJWT(sub = 'user-001', role = UserRole.TEACHER, schoolId = 'SCH-AP-DEMO-0001') {
  return signRefreshToken({ sub, role, school_id: schoolId })
}

export function makeSchoolAdminJWT(schoolId = 'SCH-AP-DEMO-0001') {
  return signAccessToken({
    sub: 'schooladmin-uuid-001',
    role: UserRole.SCHOOL_ADMIN,
    school_id: schoolId,
    teacher_id: 'schooladmin-uuid-001',
  })
}

export function makeParentJWT(
  linkedNeuraIds: string[] = ['NID-2025-AP-084291'],
  schoolId = 'SCH-AP-DEMO-0001',
) {
  return signAccessToken({
    sub: 'parent-uuid-001',
    role: UserRole.PARENT,
    school_id: schoolId,
    linked_neura_ids: linkedNeuraIds,
  })
}
