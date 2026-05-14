import React, { useEffect, useState } from 'react';
import { 
  Users, 
  CheckCircle2, 
  UserPlus,
  ArrowUpRight,
  ArrowDownRight,
  GraduationCap
} from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Intern, Attendance } from '../types';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { cn } from '../lib/utils';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalInterns: 0,
    activeInterns: 0,
    completedInterns: 0,
  });
  const [internsWithAttendance, setInternsWithAttendance] = useState<(Intern & { attendanceCount: any })[]>([]);
  const [overallAttendanceData, setOverallAttendanceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [internsSnapshot, attendanceSnapshot] = await Promise.all([
          getDocs(collection(db, 'interns')),
          getDocs(collection(db, 'attendance'))
        ]);

        const allInterns = internsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Intern));
        const allAttendance = attendanceSnapshot.docs.map(doc => doc.data() as Attendance);

        setStats({
          totalInterns: allInterns.length,
          activeInterns: allInterns.filter(i => i.status === 'กำลังฝึกงาน').length,
          completedInterns: allInterns.filter(i => i.status === 'ฝึกงานสำเร็จ').length,
        });

        // Overall Attendance Data for Pie Chart
        const statusMap = {
          present: { name: 'มาปกติ', color: '#10b981' },
          late: { name: 'มาสาย', color: '#f59e0b' },
          sick: { name: 'ลาป่วย', color: '#3b82f6' },
          personal: { name: 'ลากิจ', color: '#8b5cf6' },
          absent: { name: 'ขาด', color: '#ef4444' }
        };

        const overallStats = Object.keys(statusMap).map(key => ({
          name: (statusMap as any)[key].name,
          value: allAttendance.filter(a => a.status === key).length,
          color: (statusMap as any)[key].color
        }));
        setOverallAttendanceData(overallStats.filter(s => s.value > 0));

        // Interns with summary
        const summary = allInterns.map(intern => {
          const internAttendance = allAttendance.filter(a => a.internId === intern.id);
          return {
            ...intern,
            attendanceCount: {
              present: internAttendance.filter(a => a.status === 'present').length,
              late: internAttendance.filter(a => a.status === 'late').length,
              sick: internAttendance.filter(a => a.status === 'sick').length,
              personal: internAttendance.filter(a => a.status === 'personal').length,
              absent: internAttendance.filter(a => a.status === 'absent').length,
            }
          };
        });
        setInternsWithAttendance(summary);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm shadow-gray-100/50">
      <div className="mb-4 flex items-center justify-between">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${color} bg-opacity-10 text-opacity-100`}>
          <Icon size={24} className={color.replace('bg-', 'text-')} />
        </div>
        {trend && (
          <div className={clsx(
            "flex items-center gap-1 text-xs font-medium uppercase tracking-wider",
            trend > 0 ? "text-green-600" : "text-red-600"
          )}>
            {trend > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <p className="text-3xl font-bold tracking-tight text-gray-900">{value}</p>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <StatCard 
          title="จำนวนนักศึกษาทั้งหมด" 
          value={stats.totalInterns} 
          icon={Users} 
          color="bg-blue-600" 
        />
        <StatCard 
          title="จำนวนนักศึกษาที่กำลังฝึกงานอยู่" 
          value={stats.activeInterns} 
          icon={UserPlus} 
          color="bg-green-600" 
        />
        <StatCard 
          title="จำนวนนักศึกษาที่ฝึกงานจบแล้ว" 
          value={stats.completedInterns} 
          icon={GraduationCap} 
          color="bg-orange-600" 
        />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main Section: Attendance Summary Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-3xl border border-gray-100 bg-white p-8 overflow-hidden">
            <h3 className="mb-6 text-lg font-bold text-gray-900">สรุปการเข้าฝึกงานรายบุคคล</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/50">
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">ชื่อ-นามสกุล</th>
                    <th className="px-2 py-3 text-center text-xs font-bold uppercase text-green-600">ปกติ</th>
                    <th className="px-2 py-3 text-center text-xs font-bold uppercase text-amber-500">สาย</th>
                    <th className="px-2 py-3 text-center text-xs font-bold uppercase text-blue-500">ป่วย</th>
                    <th className="px-2 py-3 text-center text-xs font-bold uppercase text-purple-500">กิจ</th>
                    <th className="px-2 py-3 text-center text-xs font-bold uppercase text-red-500">ขาด</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {internsWithAttendance.map((intern) => (
                    <tr key={intern.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{intern.firstName} {intern.lastName}</p>
                        <p className="text-[10px] text-gray-400">{intern.studentId}</p>
                      </td>
                      <td className="px-2 py-3 text-center text-sm font-bold text-green-600">{intern.attendanceCount.present}</td>
                      <td className="px-2 py-3 text-center text-sm font-bold text-amber-500">{intern.attendanceCount.late}</td>
                      <td className="px-2 py-3 text-center text-sm font-bold text-blue-600">{intern.attendanceCount.sick}</td>
                      <td className="px-2 py-3 text-center text-sm font-bold text-purple-600">{intern.attendanceCount.personal}</td>
                      <td className="px-2 py-3 text-center text-sm font-bold text-red-600">{intern.attendanceCount.absent}</td>
                    </tr>
                  ))}
                  {internsWithAttendance.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">ยังไม่มีข้อมูล</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Overall Attendance Chart Section */}
        <div className="space-y-8">
          <div className="rounded-3xl border border-gray-100 bg-white p-8">
            <h3 className="mb-8 text-lg font-bold text-gray-900">อัตราการเข้าปฏิบัติงานรวม</h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={overallAttendanceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {overallAttendanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              {overallAttendanceData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs font-medium text-gray-600">{item.name} ({item.value})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function clsx(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
