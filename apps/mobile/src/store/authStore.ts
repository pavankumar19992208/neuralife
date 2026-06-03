import {create} from 'zustand';
import {SecureStorage} from '@lib/storage';

export type TeacherRole = 'SUBJECT_TEACHER' | 'CLASS_TEACHER' | 'PRINCIPAL' | 'SCHOOL_ADMIN';

// Roles allowed to use the Teacher App. PARENT / STUDENT are rejected at login.
export const TEACHER_APP_ROLES = ['PRINCIPAL', 'TEACHER', 'SCHOOL_ADMIN'] as const;

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  teacherId: string | null;
  mobile: string | null;
  schoolId: string | null;
  baseRole: string | null;     // raw JWT role: PRINCIPAL | TEACHER | SCHOOL_ADMIN
  roles: TeacherRole[];        // derived capability roles
  isClassTeacher: boolean;     // set from profile fetch (not present in JWT)
  classSection: string | null; // e.g. "10-A" if class teacher
  isAuthenticated: boolean;
  isLoading: boolean;

  setSession: (input: SetSessionInput) => Promise<void>;
  setClassTeacher: (classSection: string | null) => void;
  logout: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

interface SetSessionInput {
  accessToken: string;
  refreshToken: string;
  mobile: string;
}

// The access token issued by apps/api carries these claims.
interface RawJwt {
  sub: string;
  role: string;
  school_id: string;
  teacher_id?: string;
  neura_id?: string;
  linked_neura_ids?: string[];
  exp?: number;
  iat?: number;
  jti?: string;
}

// Pure-JS base64 decode — avoids depending on a runtime `atob` global, which
// is not guaranteed across JS engines / Hermes configurations.
const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function base64Decode(input: string): string {
  const str = input.replace(/=+$/, '');
  let output = '';
  let bc = 0;
  let bs = 0;
  for (let i = 0; i < str.length; i++) {
    const idx = B64_CHARS.indexOf(str.charAt(i));
    if (idx === -1) continue;
    bs = bc % 4 ? bs * 64 + idx : idx;
    if (bc++ % 4) {
      output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
    }
  }
  return output;
}

function decodeJwt(token: string): RawJwt {
  const segment = token.split('.')[1];
  // base64url → base64
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(base64Decode(base64)) as RawJwt;
}

// Map the single backend role onto the mobile app's capability roles.
function deriveRoles(jwtRole: string): TeacherRole[] {
  switch (jwtRole) {
    case 'PRINCIPAL':
      return ['PRINCIPAL'];
    case 'SCHOOL_ADMIN':
      return ['SCHOOL_ADMIN'];
    case 'TEACHER':
    default:
      return ['SUBJECT_TEACHER'];
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  refreshToken: null,
  teacherId: null,
  mobile: null,
  schoolId: null,
  baseRole: null,
  roles: [],
  isClassTeacher: false,
  classSection: null,
  isAuthenticated: false,
  isLoading: true,

  setSession: async ({accessToken, refreshToken, mobile}) => {
    const jwt = decodeJwt(accessToken);
    // Set the in-memory session first so navigation proceeds even if secure
    // storage is unavailable/throws on this device. Token persistence is a
    // best-effort enhancement, not a precondition for being logged in.
    set({
      token: accessToken,
      refreshToken,
      teacherId: jwt.teacher_id ?? jwt.sub,
      mobile,
      schoolId: jwt.school_id,
      baseRole: jwt.role,
      roles: deriveRoles(jwt.role),
      isAuthenticated: true,
      isLoading: false,
    });
    try {
      await SecureStorage.setToken(accessToken);
    } catch (e) {
      console.warn('[auth] could not persist token to secure storage:', e);
    }
  },

  setClassTeacher: (classSection) => {
    const roles = get().roles;
    set({
      isClassTeacher: true,
      classSection,
      roles: roles.includes('CLASS_TEACHER') ? roles : [...roles, 'CLASS_TEACHER'],
    });
  },

  logout: async () => {
    await SecureStorage.clearToken();
    set({
      token: null, refreshToken: null, teacherId: null, mobile: null, schoolId: null,
      baseRole: null, roles: [], isClassTeacher: false, classSection: null,
      isAuthenticated: false, isLoading: false,
    });
  },

  loadFromStorage: async () => {
    const token = await SecureStorage.getToken();
    if (!token) {
      set({isLoading: false});
      return;
    }
    try {
      const jwt = decodeJwt(token);
      if (jwt.exp && jwt.exp * 1000 < Date.now()) {
        await SecureStorage.clearToken();
        set({isLoading: false});
        return;
      }
      set({
        token,
        teacherId: jwt.teacher_id ?? jwt.sub,
        schoolId: jwt.school_id,
        baseRole: jwt.role,
        roles: deriveRoles(jwt.role),
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      await SecureStorage.clearToken();
      set({isLoading: false});
    }
  },
}));
