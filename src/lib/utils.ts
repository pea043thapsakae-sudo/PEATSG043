import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateLateHours(checkInTime?: string): number {
  if (!checkInTime) return 3.5; // Default fallback to 3.5 if no time specified
  const [hStr, mStr] = checkInTime.split(':');
  const hours = parseInt(hStr, 10);
  const mins = parseInt(mStr, 10);
  if (isNaN(hours) || isNaN(mins)) return 3.5;
  
  let checkInMinutes = hours * 60 + mins;
  const startWorkMinutes = 8 * 60 + 30; // 08:30
  const endWorkMinutes = 16 * 60 + 30; // 16:30
  const lunchStart = 12 * 60; // 12:00
  const lunchEnd = 13 * 60; // 13:00

  if (checkInMinutes < startWorkMinutes) {
    checkInMinutes = startWorkMinutes;
  }
  if (checkInMinutes >= endWorkMinutes) {
    return 0;
  }

  let workedMinutes = 0;
  if (checkInMinutes < lunchStart) {
    // Arrived before lunch
    // Morning work: from checkInMinutes to 12:00
    const morningMins = lunchStart - checkInMinutes;
    // Afternoon work: 13:00 to 16:30 (3.5 hours = 210 mins)
    const afternoonMins = endWorkMinutes - lunchEnd;
    workedMinutes = morningMins + afternoonMins;
  } else if (checkInMinutes < lunchEnd) {
    // Arrived during lunch, work starts at 13:00
    workedMinutes = endWorkMinutes - lunchEnd; // 210 mins
  } else {
    // Arrived after lunch
    workedMinutes = endWorkMinutes - checkInMinutes;
  }

  // Round to 2 decimal places
  return Math.max(0, Math.round((workedMinutes / 60) * 100) / 100);
}

export function calculateAttendanceHours(att: any): number {
  if (att.status === 'present') return 7;
  if (att.status === 'late') return calculateLateHours(att.checkInTime);
  return 0;
}

export function normalizeDepartments(dept: string | string[] | undefined): string[] {
  if (!dept) return [];
  const arr = Array.isArray(dept) ? dept : [dept];
  return arr.map(d => d === 'แผนกก่อสร้าง ปฏิบัติการและบำรุงรักษาระบบไฟฟ้า' ? 'แผนกปฏิบัติการระบบไฟฟ้า' : d);
}

export function formatDepartment(dept: string | string[] | undefined): string {
  const normalized = normalizeDepartments(dept);
  return normalized.length > 0 ? normalized.join(', ') : 'ทั่วไป';
}

