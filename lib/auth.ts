'use client';

import { GradeLevel, SchoolTenant, UserSession } from './domain/types';

const KEYS = {
  role: 'thso_user_role',
  tenantId: 'thso_tenant_id',
  tenantName: 'thso_tenant_name',
  roomId: 'thso_room_id',
  roomName: 'thso_room_name',
  teacherName: 'thso_teacher_name',
  studentId: 'thso_student_id',
  studentCode: 'thso_student_code',
  studentName: 'thso_student_name',
  studentClass: 'thso_student_class',
  studentGrade: 'thso_student_grade',
  machineId: 'thso_machine_id',
  isPair: 'thso_is_pair',
  partnerId: 'thso_partner_id',
  partnerCode: 'thso_partner_code',
  partnerName: 'thso_partner_name',
  pairNames: 'thso_pair_names',
};

export const DEFAULT_TENANT_META = {
  tenantId: 'mao-dien',
  tenantName: 'Trường THCS Mão Điền',
  roomId: 'pm-1',
  roomName: 'Phòng Tin học 1',
  teacherName: 'Thầy Đỗ Mạnh Trường',
};

export function getActiveTenantContext(): {
  tenantId: string;
  tenantName: string;
  roomId: string;
  roomName: string;
  teacherName: string;
} {
  if (typeof window === 'undefined') {
    return DEFAULT_TENANT_META;
  }
  return {
    tenantId: localStorage.getItem(KEYS.tenantId) || DEFAULT_TENANT_META.tenantId,
    tenantName: localStorage.getItem(KEYS.tenantName) || DEFAULT_TENANT_META.tenantName,
    roomId: localStorage.getItem(KEYS.roomId) || DEFAULT_TENANT_META.roomId,
    roomName: localStorage.getItem(KEYS.roomName) || DEFAULT_TENANT_META.roomName,
    teacherName: localStorage.getItem(KEYS.teacherName) || DEFAULT_TENANT_META.teacherName,
  };
}

export function setActiveTenantContext(tenant: SchoolTenant, roomId?: string): void {
  if (typeof window === 'undefined') return;
  const chosenRoom = tenant.rooms.find((r) => r.id === roomId) || tenant.rooms[0] || {
    id: 'pm-1',
    name: 'Phòng Tin học 1',
    capacity: 24,
  };

  localStorage.setItem(KEYS.tenantId, tenant.id);
  localStorage.setItem(KEYS.tenantName, tenant.shortName || tenant.name);
  localStorage.setItem(KEYS.roomId, chosenRoom.id);
  localStorage.setItem(KEYS.roomName, chosenRoom.name);
  localStorage.setItem(KEYS.teacherName, tenant.teacherName);
  window.dispatchEvent(new CustomEvent('thso_session_change'));
}

export function getCurrentUser(): UserSession {
  const ctx = getActiveTenantContext();
  if (typeof window === 'undefined') {
    return { isLoggedIn: false, role: 'guest', ...ctx };
  }

  const role = (localStorage.getItem(KEYS.role) as 'student' | 'teacher' | null) || 'guest';
  if (role === 'guest') {
    return { isLoggedIn: false, role: 'guest', ...ctx };
  }

  if (role === 'teacher') {
    return {
      isLoggedIn: true,
      role: 'teacher',
      ...ctx,
      studentName: ctx.teacherName,
    };
  }

  const studentClass = localStorage.getItem(KEYS.studentClass) || '';
  const gradeStored = localStorage.getItem(KEYS.studentGrade);
  let studentGrade: GradeLevel = 7;
  if (gradeStored) {
    const parsed = parseInt(gradeStored, 10);
    if (parsed === 6 || parsed === 7 || parsed === 8 || parsed === 9) {
      studentGrade = parsed;
    }
  } else if (studentClass) {
    const m = studentClass.match(/([6789])/);
    if (m) studentGrade = parseInt(m[1], 10) as GradeLevel;
  }

  const studentName = localStorage.getItem(KEYS.studentName) || 'Học sinh';
  const isPair = localStorage.getItem(KEYS.isPair) === 'true';
  const partnerName = localStorage.getItem(KEYS.partnerName) || undefined;
  const machineRaw = localStorage.getItem(KEYS.machineId);

  return {
    isLoggedIn: true,
    role: 'student',
    ...ctx,
    studentId: localStorage.getItem(KEYS.studentId) || '',
    studentCode: localStorage.getItem(KEYS.studentCode) || '',
    studentName,
    studentClass,
    studentGrade,
    machineId: machineRaw ? parseInt(machineRaw, 10) : 1,
    isPair,
    partnerId: localStorage.getItem(KEYS.partnerId) || undefined,
    partnerCode: localStorage.getItem(KEYS.partnerCode) || undefined,
    partnerName,
    pairNames:
      localStorage.getItem(KEYS.pairNames) ||
      (isPair && partnerName ? `${studentName} & ${partnerName}` : undefined),
  };
}

export function loginAsStudentSession(params: {
  tenant: SchoolTenant;
  roomId: string;
  grade: GradeLevel;
  machineId: number;
  primary: { id: string; code: string; name: string; className: string };
  partner?: { id: string; code: string; name: string } | null;
}): void {
  if (typeof window === 'undefined') return;
  setActiveTenantContext(params.tenant, params.roomId);

  localStorage.setItem(KEYS.role, 'student');
  localStorage.setItem(KEYS.studentId, params.primary.id);
  localStorage.setItem(KEYS.studentCode, params.primary.code);
  localStorage.setItem(KEYS.studentName, params.primary.name);
  localStorage.setItem(KEYS.studentClass, params.primary.className);
  localStorage.setItem(KEYS.studentGrade, String(params.grade));
  localStorage.setItem(KEYS.machineId, String(params.machineId));

  if (params.partner) {
    localStorage.setItem(KEYS.isPair, 'true');
    localStorage.setItem(KEYS.partnerId, params.partner.id);
    localStorage.setItem(KEYS.partnerCode, params.partner.code);
    localStorage.setItem(KEYS.partnerName, params.partner.name);
    localStorage.setItem(KEYS.pairNames, `${params.primary.name} & ${params.partner.name}`);
  } else {
    localStorage.setItem(KEYS.isPair, 'false');
    localStorage.removeItem(KEYS.partnerId);
    localStorage.removeItem(KEYS.partnerCode);
    localStorage.removeItem(KEYS.partnerName);
    localStorage.removeItem(KEYS.pairNames);
  }
  window.dispatchEvent(new CustomEvent('thso_session_change'));
}

export function loginAsTeacherSession(tenant: SchoolTenant, roomId?: string): void {
  if (typeof window === 'undefined') return;
  setActiveTenantContext(tenant, roomId);
  localStorage.setItem(KEYS.role, 'teacher');
  window.dispatchEvent(new CustomEvent('thso_session_change'));
}

export function logout(): void {
  if (typeof window === 'undefined') return;
  Object.values(KEYS).forEach((k) => {
    // Keep tenant context for smooth re-login
    if (k !== KEYS.tenantId && k !== KEYS.tenantName && k !== KEYS.roomId && k !== KEYS.roomName && k !== KEYS.teacherName) {
      localStorage.removeItem(k);
    }
  });
  sessionStorage.removeItem('thso_initial_flow_done');
  window.dispatchEvent(new CustomEvent('thso_session_change'));
}

export type { UserSession };
