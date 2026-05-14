export type InternStatus = 'รอฝึกงาน' | 'กำลังฝึกงาน' | 'ฝึกงานสำเร็จ';
export type AttendanceStatus = 'present' | 'late' | 'sick' | 'personal' | 'absent';

export interface Intern {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  level: string;
  major: string;
  minor?: string;
  university: string;
  department: string[];
  startDate: string;
  endDate: string;
  status: InternStatus;
  totalScore?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Attendance {
  id: string;
  internId: string;
  date: string;
  status: AttendanceStatus;
  checkInTime?: string;
  notes?: string;
  createdAt: string;
}

export interface Evaluation {
  id: string;
  internId: string;
  evaluatorId: string;
  date: string;
  scores: Record<string, number>;
  totalScore: number;
  comments: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  internId: string;
  title: string;
  date: string;
  description: string;
  createdAt: string;
}
