import React, { useEffect, useState } from 'react';
import { 
  Users, 
  CheckCircle2, 
  UserPlus,
  ArrowUpRight,
  ArrowDownRight,
  GraduationCap,
  Printer,
  FileText,
  Settings
} from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Intern, Attendance } from '../types';
import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Cell,
  LabelList
} from 'recharts';
import { cn } from '../lib/utils';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalInterns: 0,
    activeInterns: 0,
    completedInterns: 0,
    pendingInterns: 0,
  });
  const [internsWithAttendance, setInternsWithAttendance] = useState<(Intern & { attendanceCount: any })[]>([]);
  const [overallAttendanceData, setOverallAttendanceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInternForReport, setSelectedInternForReport] = useState<string>('all');
  
  // Custom Signatory States for Report Printing
  const [preparerName, setPreparerName] = useState<string>("นางสาวดวงพร เหลืองเถลิงพงษ์");
  const [preparerPosition, setPreparerPosition] = useState<string>("ผู้ช่วยบันทึกข้อมูลคอมพิวเตอร์");
  const [managerName, setManagerName] = useState<string>("นายภูศเดช  ภักดีพันธ์");
  const [managerPosition, setManagerPosition] = useState<string>("ผู้จัดการ การไฟฟ้าส่วนภูมิภาคสาขาทับสะแก");
  const [managerPosition2, setManagerPosition2] = useState<string>("");
  const [showSignSettings, setShowSignSettings] = useState<boolean>(false);

  const internChartData = internsWithAttendance.map(intern => ({
    name: intern.firstName,
    'ปกติ': intern.attendanceCount.present,
    'สาย': intern.attendanceCount.late,
    'ป่วย': intern.attendanceCount.sick,
    'กิจ': intern.attendanceCount.personal,
  }));

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
          activeInterns: allInterns.filter(i => i.status === 'กำลังฝึกงาน' || (i as any).status === 'active').length,
          completedInterns: allInterns.filter(i => i.status === 'ฝึกงานสำเร็จ' || (i as any).status === 'completed').length,
          pendingInterns: allInterns.filter(i => i.status === 'รอฝึกงาน' || (i as any).status === 'terminated').length,
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

  const printAttendanceReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const filteredInterns = selectedInternForReport === 'all' 
      ? internsWithAttendance 
      : internsWithAttendance.filter(i => i.id === selectedInternForReport);

    // Calculate max value for scale
    const allValues = filteredInterns.flatMap(i => [
      i.attendanceCount.present,
      i.attendanceCount.late,
      i.attendanceCount.sick,
      i.attendanceCount.personal,
      i.attendanceCount.absent
    ]);
    const maxVal = Math.max(...allValues, 10);
    const yAxisTicks = [0, 5, 10, 15, 20, 25].filter(t => t <= Math.ceil(maxVal / 5) * 5 + 5);

    const reportContent = `
      <html>
        <head>
          <title>รายงานสรุปการมาฝึกงาน</title>
          <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
          <style>
            @page {
              size: A4;
              margin: 15mm;
            }
            body { 
              font-family: 'Sarabun', sans-serif; 
              color: #333; 
              font-size: 13px;
              margin: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .page-header { text-align: right; font-size: 10px; color: #666; margin-bottom: 5px; }
            h1 { text-align: center; color: #000; margin-bottom: 3px; font-size: 18px; }
            h2 { text-align: center; color: #666; margin-bottom: 12px; font-size: 14px; font-weight: normal; }
            
            /* Main Layout Table for repeated footer */
            .main-layout { width: 100%; border-collapse: collapse; }
            .content-cell { padding: 0; }
            
            /* Inner Data Table */
            .data-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            .data-table th, .data-table td { border: 1px solid #ddd; padding: 5px 3px; text-align: center; font-size: 11px; }
            .data-table th { background-color: #f8f9fa; font-weight: bold; }
            .text-left { text-align: left; }
            
            /* Legend & Chart */
            .legend { display: flex; justify-content: flex-end; gap: 10px; margin-bottom: 5px; font-size: 9px; }
            .legend-item { display: flex; align-items: center; gap: 3px; }
            .legend-color { width: 7px; height: 7px; border-radius: 50%; }
            .chart-container { 
              margin: 10px 0; 
              padding: 12px; 
              border: 1px solid #f0f0f0; 
              border-radius: 8px;
              page-break-inside: avoid;
            }
            .chart-title { font-weight: bold; margin-bottom: 12px; font-size: 12px; text-align: left; }

            /* Signature Footer */
            .signature-wrapper { 
              width: 100%; 
              padding-top: 20px;
            }
            .signature-table { width: 100%; border: none; }
            .signature-cell { width: 50%; text-align: center; vertical-align: bottom; }
            .signature-cell p { margin: 2px 0; }
            .signature-line { margin-bottom: 35px !important; }

            @media print {
              .no-print { display: none; }
              tfoot { display: table-footer-group; }
            }
          </style>
        </head>
        <body>
          <table class="main-layout">
            <thead>
              <tr>
                <td class="content-cell">
                  <div class="page-header">
                    พิมพ์เมื่อวันที่: ${new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                  <h1>รายงานสรุปการเข้าฝึกงาน</h1>
                  <h2>การไฟฟ้าส่วนภูมิภาคสาขาทับสะแก</h2>
                </td>
              </tr>
            </thead>
            
            <tbody>
              <tr>
                <td class="content-cell">
                  <!-- Attendance Table -->
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th class="text-left">ชื่อ-นามสกุล</th>
                        <th>รหัสประจำตัว</th>
                        <th>มาปกติ</th>
                        <th>มาสาย</th>
                        <th>ลาป่วย</th>
                        <th>ลากิจ</th>
                        <th>ขาด</th>
                        <th>จำนวน ชม.</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${filteredInterns.map(intern => {
                        const totalHours = (intern.attendanceCount.present * 7) + (intern.attendanceCount.late * 3.5);
                        return `
                        <tr>
                          <td class="text-left">${intern.firstName} ${intern.lastName}</td>
                          <td>${intern.studentId}</td>
                          <td>${intern.attendanceCount.present}</td>
                          <td>${intern.attendanceCount.late}</td>
                          <td>${intern.attendanceCount.sick}</td>
                          <td>${intern.attendanceCount.personal}</td>
                          <td>${intern.attendanceCount.absent}</td>
                          <td style="font-weight: bold;">${totalHours.toLocaleString()}</td>
                        </tr>
                        `;
                      }).join('')}
                    </tbody>
                  </table>

                  <div class="chart-container">
                    <div class="chart-title">อัตราการเข้าปฏิบัติงานรายบุคคล (วัน)</div>
                    
                    <div class="legend">
                      <div class="legend-item"><div class="legend-color" style="background: #8b5cf6;"></div> กิจ</div>
                      <div class="legend-item"><div class="legend-color" style="background: #10b981;"></div> ปกติ</div>
                      <div class="legend-item"><div class="legend-color" style="background: #3b82f6;"></div> ป่วย</div>
                      <div class="legend-item"><div class="legend-color" style="background: #f59e0b;"></div> สาย</div>
                    </div>

                    <svg viewBox="0 0 800 300" width="100%" height="280" xmlns="http://www.w3.org/2000/svg">
                      ${yAxisTicks.map(t => {
                        const y = 250 - (t / Math.max(...yAxisTicks)) * 200;
                        return `
                          <text x="35" y="${y + 4}" text-anchor="end" font-size="10" fill="#666">${t}</text>
                          <line x1="45" y1="${y}" x2="780" y2="${y}" stroke="#eee" stroke-dasharray="3,3" />
                        `;
                      }).join('')}
                      
                      <text x="15" y="150" transform="rotate(-90 15 150)" text-anchor="middle" font-size="10" fill="#666">จำนวนวัน</text>
                      <line x1="45" y1="50" x2="45" y2="250" stroke="#ccc" />

                      ${filteredInterns.map((intern, i) => {
                        const groupWidth = 735 / filteredInterns.length;
                        const groupX = 45 + (i * groupWidth);
                        const barWidth = Math.min(groupWidth / 6, 20);
                        const chartHeight = 250;
                        const maxTick = Math.max(...yAxisTicks);
                        
                        const getY = (val: number) => 250 - (val / maxTick) * chartHeight;
                        const getHeight = (val: number) => (val / maxTick) * chartHeight;

                        return `
                          <g>
                            <!-- กิจ - Violet -->
                            <rect x="${groupX + (groupWidth/2) - (barWidth * 2)}" y="${getY(intern.attendanceCount.personal)}" width="${barWidth}" height="${getHeight(intern.attendanceCount.personal)}" fill="#8b5cf6" rx="1" />
                            ${intern.attendanceCount.personal > 0 ? `<text x="${groupX + (groupWidth/2) - (barWidth * 1.5)}" y="${getY(intern.attendanceCount.personal) - 4}" text-anchor="middle" font-size="8" font-weight="bold" fill="#8b5cf6">${intern.attendanceCount.personal}</text>` : ''}

                            <!-- ปกติ - Green -->
                            <rect x="${groupX + (groupWidth/2) - barWidth}" y="${getY(intern.attendanceCount.present)}" width="${barWidth}" height="${getHeight(intern.attendanceCount.present)}" fill="#10b981" rx="1" />
                            ${intern.attendanceCount.present > 0 ? `<text x="${groupX + (groupWidth/2) - (barWidth * 0.5)}" y="${getY(intern.attendanceCount.present) - 4}" text-anchor="middle" font-size="8" font-weight="bold" fill="#10b981">${intern.attendanceCount.present}</text>` : ''}

                            <!-- ป่วย - Blue -->
                            <rect x="${groupX + (groupWidth/2)}" y="${getY(intern.attendanceCount.sick)}" width="${barWidth}" height="${getHeight(intern.attendanceCount.sick)}" fill="#3b82f6" rx="1" />
                            ${intern.attendanceCount.sick > 0 ? `<text x="${groupX + (groupWidth/2) + (barWidth * 0.5)}" y="${getY(intern.attendanceCount.sick) - 4}" text-anchor="middle" font-size="8" font-weight="bold" fill="#3b82f6">${intern.attendanceCount.sick}</text>` : ''}

                            <!-- สาย - Orange -->
                            <rect x="${groupX + (groupWidth/2) + barWidth}" y="${getY(intern.attendanceCount.late)}" width="${barWidth}" height="${getHeight(intern.attendanceCount.late)}" fill="#f59e0b" rx="1" />
                            ${intern.attendanceCount.late > 0 ? `<text x="${groupX + (groupWidth/2) + (barWidth * 1.5)}" y="${getY(intern.attendanceCount.late) - 4}" text-anchor="middle" font-size="8" font-weight="bold" fill="#f59e0b">${intern.attendanceCount.late}</text>` : ''}

                            <text x="${groupX + groupWidth/2}" y="${filteredInterns.length > 5 ? 270 : 275}" text-anchor="middle" font-size="${filteredInterns.length > 8 ? 8 : 10}" fill="#333">${intern.firstName}</text>
                          </g>
                        `;
                      }).join('')}
                      
                      <line x1="45" y1="250" x2="780" y2="250" stroke="#ccc" />
                    </svg>
                  </div>
                </td>
              </tr>
            </tbody>

            <tfoot>
              <tr>
                <td class="content-cell">
                  <div class="signature-wrapper">
                    <table class="signature-table">
                      <tr>
                        <td class="signature-cell">
                          <p class="signature-line">ลงชื่อ...........................................................................</p>
                          <p>( ${preparerName} )</p>
                          <p style="font-size: 10px; color: #666;">ตำแหน่ง ${preparerPosition}</p>
                        </td>
                        <td class="signature-cell">
                          <p class="signature-line">ลงชื่อ...........................................................................</p>
                          <p>( ${managerName} )</p>
                          <p style="font-size: 10px; color: #666;">ตำแหน่ง ${managerPosition}</p>
                          ${managerPosition2 ? `<p style="font-size: 10px; color: #666; margin-top: 3px;">${managerPosition2}</p>` : ''}
                        </td>
                      </tr>
                    </table>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>

          <script>
            window.onload = () => { 
              setTimeout(() => { 
                window.print(); 
              }, 800); 
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(reportContent);
    printWindow.document.close();
  };

  const StatCard = ({ title, value, icon: Icon, color, textColor }: any) => (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm shadow-gray-100/50 transition-all hover:shadow-md hover:border-gray-200">
      <div className="mb-4 flex items-center justify-between">
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", color, "bg-opacity-10")}>
          <Icon size={24} className={textColor} />
        </div>
      </div>
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <p className="text-3xl font-bold tracking-tight text-gray-900 mt-1">{value}</p>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="จำนวนนักศึกษาทั้งหมด" 
          value={stats.totalInterns} 
          icon={Users} 
          color="bg-blue-600" 
          textColor="text-blue-600"
        />
        <StatCard 
          title="รอฝึกงาน" 
          value={stats.pendingInterns} 
          icon={Users} 
          color="bg-amber-600" 
          textColor="text-amber-600"
        />
        <StatCard 
          title="กำลังฝึกงาน" 
          value={stats.activeInterns} 
          icon={UserPlus} 
          color="bg-green-600" 
          textColor="text-green-600"
        />
        <StatCard 
          title="ฝึกงานสำเร็จแล้ว" 
          value={stats.completedInterns} 
          icon={GraduationCap} 
          color="bg-orange-600" 
          textColor="text-orange-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main Section: Attendance Summary Table and Chart */}
        <div className="lg:col-span-3 space-y-8">
          <div className="rounded-3xl border border-gray-100 bg-white p-8 overflow-hidden">
            <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h3 className="text-lg font-bold text-gray-900">สรุปการเข้าฝึกงานรายบุคคล</h3>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <select
                  value={selectedInternForReport}
                  onChange={(e) => setSelectedInternForReport(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="all">นักศึกษาทั้งหมด</option>
                  {internsWithAttendance.map((intern) => (
                    <option key={intern.id} value={intern.id}>
                      {intern.firstName} {intern.lastName}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setShowSignSettings(!showSignSettings)}
                  title="ตั้งค่าผู้ลงลายมือชื่อ"
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition-all active:scale-95 whitespace-nowrap",
                    showSignSettings 
                      ? "bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100" 
                      : "bg-white border-gray-250 text-gray-700 hover:bg-gray-50 hover:border-gray-300"
                  )}
                >
                  <Settings size={16} />
                  <span>ตั้งค่าผู้ลงนาม</span>
                </button>
                <button 
                  onClick={printAttendanceReport}
                  className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-gray-800 active:scale-95 whitespace-nowrap"
                >
                  <Printer size={16} />
                  <span>พิมพ์รายงานสรุป</span>
                </button>
              </div>
            </div>

            {/* Custom Signatories Setup Panel */}
            {showSignSettings && (
              <div className="mb-6 rounded-2xl bg-gray-50/70 p-5 border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">ฝั่งผู้จัดทำ</h4>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">ชื่อ-ามสกุล ผู้จัดทำ</label>
                    <input 
                      type="text" 
                      value={preparerName} 
                      onChange={(e) => setPreparerName(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-750 focus:ring-2 focus:ring-blue-500/20 outline-none"
                      placeholder="เช่น นางสาวดวงพร เหลืองเถลิงพงษ์"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">ตำแหน่ง ผู้จัดทำ</label>
                    <input 
                      type="text" 
                      value={preparerPosition} 
                      onChange={(e) => setPreparerPosition(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-750 focus:ring-2 focus:ring-blue-500/20 outline-none"
                      placeholder="เช่น ผู้ช่วยบันทึกข้อมูลคอมพิวเตอร์"
                    />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">ฝั่งอนุมัติ / ผู้จัดการ (แก้ไขได้กรณีไปราชการ)</h4>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">ชื่อ-ามสกุล ผู้จัดการ/ผู้ลงนาม</label>
                    <input 
                      type="text" 
                      value={managerName} 
                      onChange={(e) => setManagerName(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-750 focus:ring-2 focus:ring-blue-500/20 outline-none"
                      placeholder="เช่น นายภูศเดช  ภักดีพันธ์"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">ตำแหน่ง บรรทัดที่ 1 (เช่น ผู้จัดการ...)</label>
                    <input 
                      type="text" 
                      value={managerPosition} 
                      onChange={(e) => setManagerPosition(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-750 focus:ring-2 focus:ring-blue-500/20 outline-none"
                      placeholder="เช่น ผู้จัดการ"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">ตำแหน่ง บรรทัดที่ 2 (กรณีมีรักษาการแทน / ไปราชการ)</label>
                    <input 
                      type="text" 
                      value={managerPosition2} 
                      onChange={(e) => setManagerPosition2(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-750 focus:ring-2 focus:ring-blue-500/20 outline-none"
                      placeholder="เช่น รักษาการแทน ผู้จัดการ การไฟฟ้าส่วนภูมิภาคสาขาทับสะแก"
                    />
                  </div>
                </div>
              </div>
            )}
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
                    <th className="px-2 py-3 text-center text-xs font-bold uppercase text-gray-900 border-l border-gray-100">รวม (ชม.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {internsWithAttendance.map((intern) => {
                    const totalHours = (intern.attendanceCount.present * 7) + (intern.attendanceCount.late * 3.5);
                    return (
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
                        <td className="px-2 py-3 text-center text-sm font-bold text-gray-900 border-l border-gray-100 bg-gray-50/30">
                          {totalHours.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                  {internsWithAttendance.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">ยังไม่มีข้อมูล</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Overall Attendance Chart Section */}
          <div className="rounded-3xl border border-gray-100 bg-white p-8">
            <h3 className="mb-8 text-lg font-bold text-gray-900">อัตราการเข้าปฏิบัติงานรายบุคคล (วัน)</h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={internChartData}
                  margin={{ top: 35, right: 30, left: 0, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                  />
                  <YAxis 
                    axisLine={true} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    label={{ value: 'จำนวนวัน', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 12, fill: '#6b7280' } }}
                  />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend 
                    verticalAlign="top" 
                    align="right" 
                    iconType="circle"
                    wrapperStyle={{ fontSize: '12px', paddingBottom: '20px' }}
                  />
                  <Bar dataKey="ปกติ" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30}>
                    <LabelList dataKey="ปกติ" position="top" style={{ fill: '#10b981', fontSize: 11, fontWeight: 'bold' }} formatter={(val: any) => typeof val === 'number' && val > 0 ? val : ''} />
                  </Bar>
                  <Bar dataKey="สาย" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={30}>
                    <LabelList dataKey="สาย" position="top" style={{ fill: '#f59e0b', fontSize: 11, fontWeight: 'bold' }} formatter={(val: any) => typeof val === 'number' && val > 0 ? val : ''} />
                  </Bar>
                  <Bar dataKey="ป่วย" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30}>
                    <LabelList dataKey="ป่วย" position="top" style={{ fill: '#3b82f6', fontSize: 11, fontWeight: 'bold' }} formatter={(val: any) => typeof val === 'number' && val > 0 ? val : ''} />
                  </Bar>
                  <Bar dataKey="กิจ" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={30}>
                    <LabelList dataKey="กิจ" position="top" style={{ fill: '#8b5cf6', fontSize: 11, fontWeight: 'bold' }} formatter={(val: any) => typeof val === 'number' && val > 0 ? val : ''} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
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
