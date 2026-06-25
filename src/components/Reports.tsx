import React, { useEffect, useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Printer, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  UserMinus, 
  X,
  FileText,
  TrendingUp,
  Settings
} from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Intern, Attendance } from '../types';
import { cn, calculateLateHours, formatDepartment } from '../lib/utils';

const MONTH_NAMES_TH = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const WEEKDAYS_TH = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

const HOLIDAYS: Record<string, string> = {
  '01-01': 'วันขึ้นปีใหม่',
  '03-03': 'วันมาฆบูชา',
  '04-06': 'วันจักรี',
  '04-13': 'วันสงกรานต์',
  '04-14': 'วันสงกรานต์',
  '04-15': 'วันสงกรานต์',
  '05-01': 'วันแรงงานแห่งชาติ',
  '05-04': 'วันฉัตรมงคล',
  '05-31': 'วันวิสาขบูชา',
  '06-01': 'วันชดเชยวันวิสาขบูชา',
  '06-03': 'วันเฉลิมพระชนมพรรษา สมเด็จพระนางเจ้าฯ พระบรมราชินี',
  '07-28': 'วันเฉลิมพระชนมพรรษา พระบาทสมเด็จพระเจ้าอยู่หัว',
  '08-12': 'วันแม่แห่งชาติ',
  '10-13': 'วันคล้ายวันสวรรคต ร.9',
  '10-23': 'วันปิยมหาราช',
  '12-05': 'วันคล้ายวันพระบรมราชสมภพ ร.9',
  '12-10': 'วันรัฐธรรมนูญ',
  '12-31': 'วันสิ้นปี'
};

const STATUS_CONFIG = {
  present: { label: 'มาปกติ', color: 'text-green-600 bg-green-50 border-green-200', dot: 'bg-green-500' },
  late: { label: 'มาสาย', color: 'text-orange-600 bg-orange-50 border-orange-200', dot: 'bg-orange-500' },
  sick: { label: 'ลาป่วย', color: 'text-blue-600 bg-blue-50 border-blue-200', dot: 'bg-blue-500' },
  personal: { label: 'ลากิจ', color: 'text-purple-600 bg-purple-50 border-purple-200', dot: 'bg-purple-500' },
  absent: { label: 'ขาดงาน', color: 'text-red-600 bg-red-50 border-red-200', dot: 'bg-red-500' },
};

export default function Reports() {
  const [interns, setInterns] = useState<Intern[]>([]);
  const [selectedInternId, setSelectedInternId] = useState<string>('');
  const [attendanceData, setAttendanceData] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Date State
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());

  // Signatory settings for print
  const [preparerName, setPreparerName] = useState<string>("นางสาวดวงพร เหลืองเถลิงพงษ์");
  const [preparerPosition, setPreparerPosition] = useState<string>("ผู้ช่วยบันทึกข้อมูลคอมพิวเตอร์");
  const [managerName, setManagerName] = useState<string>("นายภูศเดช  ภักดีพันธ์");
  const [managerPosition, setManagerPosition] = useState<string>("ผู้จัดการ การไฟฟ้าส่วนภูมิภาคสาขาทับสะแก");
  const [managerPosition2, setManagerPosition2] = useState<string>("");
  const [showSignSettings, setShowSignSettings] = useState<boolean>(false);

  useEffect(() => {
    async function fetchInterns() {
      try {
        const querySnapshot = await getDocs(collection(db, 'interns'));
        const list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Intern));
        setInterns(list);
        if (list.length > 0) {
          setSelectedInternId(list[0].id);
        }
      } catch (err) {
        console.error("Error fetching interns for reports:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchInterns();
  }, []);

  useEffect(() => {
    if (!selectedInternId) return;

    async function fetchAttendance() {
      try {
        // Query attendance for the selected intern
        const attendanceRef = collection(db, 'attendance');
        const q = query(attendanceRef, where('internId', '==', selectedInternId));
        const querySnapshot = await getDocs(q);
        const list = querySnapshot.docs.map(doc => doc.data() as Attendance);
        setAttendanceData(list);
      } catch (err) {
        console.error("Error fetching attendance for report:", err);
      }
    }
    fetchAttendance();
  }, [selectedInternId]);

  const selectedIntern = interns.find(i => i.id === selectedInternId);

  // Calendar calculations
  const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sunday

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // Filter attendance for the selected month
  const monthlyAttendanceMap = React.useMemo(() => {
    const map: Record<string, Attendance> = {};
    attendanceData.forEach(att => {
      const attDate = new Date(att.date);
      if (attDate.getFullYear() === currentYear && attDate.getMonth() === currentMonth) {
        map[att.date] = att;
      }
    });
    return map;
  }, [attendanceData, currentMonth, currentYear]);

  // Statistics calculation
  const stats = React.useMemo(() => {
    let present = 0;
    let late = 0;
    let sick = 0;
    let personal = 0;
    let absent = 0;

    const items = Object.values(monthlyAttendanceMap) as Attendance[];
    items.forEach(att => {
      if (att.status === 'present') present++;
      else if (att.status === 'late') late++;
      else if (att.status === 'sick') sick++;
      else if (att.status === 'personal') personal++;
      else if (att.status === 'absent') absent++;
    });

    const totalHours = items.reduce((acc, att) => {
      if (att.status === 'present') return acc + 7;
      if (att.status === 'late') return acc + calculateLateHours(att.checkInTime);
      return acc;
    }, 0);

    return { present, late, sick, personal, absent, totalHours };
  }, [monthlyAttendanceMap]);

  // Generate calendar cells
  const calendarCells = [];
  // Empty cells for alignment
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push(null);
  }
  // Day cells
  for (let d = 1; d <= totalDays; d++) {
    calendarCells.push(d);
  }

  const printMonthlyReport = () => {
    if (!selectedIntern) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const formattedMonth = MONTH_NAMES_TH[currentMonth];
    const formattedYearTH = currentYear + 543;

    // Build the grid rows for printing
    let gridHTML = '';
    const tempCells = [...calendarCells];
    
    while (tempCells.length > 0) {
      const week = tempCells.splice(0, 7);
      gridHTML += '<tr>';
      for (let i = 0; i < 7; i++) {
        const dayNum = week[i];
        if (dayNum === undefined || dayNum === null) {
          gridHTML += '<td class="empty-cell"></td>';
        } else {
          const dayStr = String(dayNum).padStart(2, '0');
          const monthStr = String(currentMonth + 1).padStart(2, '0');
          const dateString = `${currentYear}-${monthStr}-${dayStr}`;
          
          const isWeekend = i === 0 || i === 6;
          const holidayKey = `${monthStr}-${dayStr}`;
          const holidayName = HOLIDAYS[holidayKey];
          const isHoliday = !!holidayName;
          
          const record = monthlyAttendanceMap[dateString];
          let statusText = '';
          let classNames = 'day-cell';
          
          if (isWeekend) {
            classNames += ' weekend';
          }
          if (isHoliday) {
            classNames += ' holiday';
          }

          if (record) {
            if (record.status === 'present') {
              statusText = '<span class="status-present">มาปกติ</span>';
            } else if (record.status === 'late') {
              const timeStr = record.checkInTime ? `<div style="font-size: 8px; color: #f59e0b; margin-top: 1px;">(${record.checkInTime})</div>` : '';
              statusText = `<span class="status-late">มาสาย</span>${timeStr}`;
            } else if (record.status === 'sick') {
              statusText = '<span class="status-sick">ลาป่วย</span>';
            } else if (record.status === 'personal') {
              statusText = '<span class="status-personal">ลากิจ</span>';
            } else if (record.status === 'absent') {
              const reasonStr = record.notes ? `<div style="font-size: 8px; color: #dc2626; margin-top: 1px; max-width: 50px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${record.notes}">(${record.notes})</div>` : '';
              statusText = `<span class="status-absent">อื่นๆ</span>${reasonStr}`;
            }
          }

          gridHTML += `
            <td class="${classNames}">
              <div class="day-number">${dayNum}</div>
              <div class="status-wrap">${statusText}</div>
              ${isHoliday ? `<div class="holiday-lbl">${holidayName}</div>` : ''}
            </td>
          `;
        }
      }
      gridHTML += '</tr>';
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>รายงานปฏิทินการเข้าฝึกงาน - ${selectedIntern.firstName}</title>
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
            h2 { text-align: center; color: #666; margin-bottom: 15px; font-size: 14px; font-weight: normal; }
            
            .info-box {
              border: 1px solid #ddd;
              padding: 10px 15px;
              border-radius: 6px;
              margin-bottom: 15px;
              background-color: #fafafa;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px;
            }
            .info-label { font-weight: bold; color: #555; }
            
            /* Main Layout Table */
            .main-layout { width: 100%; border-collapse: collapse; }
            
            /* Calendar Table */
            .cal-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; table-layout: fixed; }
            .cal-table th { border: 1px solid #ccc; background-color: #f1f1f1; padding: 6px; font-size: 11px; text-align: center; font-weight: bold; }
            .cal-table td { border: 1px solid #ccc; height: 65px; vertical-align: top; padding: 4px; position: relative; }
            
            .day-number { font-size: 11px; font-weight: bold; color: #444; }
            .empty-cell { background-color: #fafafa; }
            .weekend { background-color: #fef2f2; }
            .holiday { background-color: #fffbeb; }
            .holiday-lbl { font-size: 8px; color: #b45309; margin-top: 2px; line-height: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            
            .status-wrap { margin-top: 8px; text-align: center; }
            .status-present { display: inline-block; padding: 2px 6px; font-size: 9px; font-weight: bold; color: #047857; background-color: #d1fae5; border-radius: 4px; border: 1px solid #a7f3d0; }
            .status-late { display: inline-block; padding: 2px 6px; font-size: 9px; font-weight: bold; color: #c2410c; background-color: #ffedd5; border-radius: 4px; border: 1px solid #fed7aa; }
            .status-sick { display: inline-block; padding: 2px 6px; font-size: 9px; font-weight: bold; color: #1d4ed8; background-color: #dbeafe; border-radius: 4px; border: 1px solid #bfdbfe; }
            .status-personal { display: inline-block; padding: 2px 6px; font-size: 9px; font-weight: bold; color: #6d28d9; background-color: #f3e8ff; border-radius: 4px; border: 1px solid #e9d5ff; }
            .status-absent { display: inline-block; padding: 2px 6px; font-size: 9px; font-weight: bold; color: #b91c1c; background-color: #fee2e2; border-radius: 4px; border: 1px solid #fca5a5; }

            /* Stats summary */
            .stats-table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 25px; }
            .stats-table th, .stats-table td { border: 1px solid #ddd; padding: 6px; text-align: center; font-size: 11px; }
            .stats-table th { background-color: #f8f9fa; font-weight: bold; }

            /* Signature Footer */
            .signature-wrapper { 
              width: 100%; 
              padding-top: 20px;
              page-break-inside: avoid;
            }
            .signature-table { width: 100%; border: none; }
            .signature-cell { width: 50%; text-align: center; vertical-align: top; }
            .signature-cell p { margin: 2px 0; }
            .signature-line { margin-bottom: 35px !important; }

            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="page-header">
            พิมพ์เมื่อวันที่: ${new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <h1>รายงานสรุปการเข้าฝึกงานรายบุคคล (ปฏิทินรายเดือน)</h1>
          <h2>การไฟฟ้าส่วนภูมิภาคสาขาทับสะแก</h2>

          <div class="info-box">
            <div class="info-grid">
              <div><span class="info-label">ชื่อ-นามสกุล:</span> ${selectedIntern.firstName} ${selectedIntern.lastName}</div>
              <div><span class="info-label">รหัสประจำตัว:</span> ${selectedIntern.studentId}</div>
              <div><span class="info-label">ระดับชั้น:</span> ${selectedIntern.level} สาขา ${selectedIntern.major}</div>
              <div><span class="info-label">สถาบันการศึกษา:</span> ${selectedIntern.university}</div>
              <div><span class="info-label">แผนกที่ฝึกงาน:</span> ${formatDepartment(selectedIntern.department)}</div>
              <div><span class="info-label">ประจำเดือน:</span> ${formattedMonth} พ.ศ. ${formattedYearTH}</div>
            </div>
          </div>

          <table class="cal-table">
            <thead>
              <tr>
                <th style="color: #b91c1c;">อาทิตย์</th>
                <th>จันทร์</th>
                <th>อังคาร</th>
                <th>พุธ</th>
                <th>พฤหัสบดี</th>
                <th>ศุกร์</th>
                <th style="color: #b91c1c;">เสาร์</th>
              </tr>
            </thead>
            <tbody>
              ${gridHTML}
            </tbody>
          </table>

          <table class="stats-table">
            <thead>
              <tr>
                <th style="color: #047857;">มาปกติ (วัน)</th>
                <th style="color: #c2410c;">มาสาย (วัน)</th>
                <th style="color: #1d4ed8;">ลาป่วย (วัน)</th>
                <th style="color: #6d28d9;">ลากิจ (วัน)</th>
                <th style="color: #b91c1c;">อื่นๆ (วัน)</th>
                <th style="font-weight: bold; background-color: #f3f4f6;">รวมเวลาปฏิบัติงาน (ชั่วโมง)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="font-weight: bold;">${stats.present}</td>
                <td style="font-weight: bold;">${stats.late}</td>
                <td style="font-weight: bold;">${stats.sick}</td>
                <td style="font-weight: bold;">${stats.personal}</td>
                <td style="font-weight: bold;">${stats.absent}</td>
                <td style="font-weight: bold; font-size: 12px; background-color: #f9fafb;">${stats.totalHours.toLocaleString()} ชม.</td>
              </tr>
            </tbody>
          </table>

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

          <script>
            window.onload = () => { 
              setTimeout(() => { 
                window.print(); 
                window.close(); 
              }, 300); 
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selection Filter Header */}
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-orange-50 p-3 text-orange-500">
              <CalendarIcon size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">รายงานปฏิทินประจำเดือน</h3>
              <p className="text-xs text-gray-500">ตรวจสอบสถิติการเช็คชื่อรายบุคคลในแต่ละวัน</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-gray-400" />
              <select
                value={selectedInternId}
                onChange={(e) => setSelectedInternId(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-750 focus:border-orange-500 focus:outline-none"
              >
                {interns.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.firstName} {i.lastName} ({i.studentId})
                  </option>
                ))}
              </select>
            </div>

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
              onClick={printMonthlyReport}
              disabled={!selectedInternId}
              className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-gray-800 active:scale-95 disabled:opacity-50"
            >
              <Printer size={16} />
              <span>พิมพ์รายงานประจำเดือน</span>
            </button>
          </div>
        </div>

        {/* Custom Signatories Setup Panel */}
        {showSignSettings && (
          <div className="mt-6 rounded-2xl bg-gray-50/70 p-5 border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">ฝั่งผู้จัดทำ</h4>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">ชื่อ-นามสกุล ผู้จัดทำ</label>
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
                <label className="block text-xs font-semibold text-gray-500 mb-1">ชื่อ-นามสกุล ผู้จัดการ/ผู้ลงนาม</label>
                <input 
                  type="text" 
                  value={managerName} 
                  onChange={(e) => setManagerName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-750 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  placeholder="เช่น นายภูศเดช  ภักดีพันธ์"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">ตำแหน่ง บรรทัดที่ 1</label>
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
      </div>

      {selectedIntern && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Calendar Display - Left 2 Columns */}
          <div className="lg:col-span-2 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            {/* Month Navigator Header */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-50 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-gray-400 mr-1">เลือกเดือน/ปี:</span>
                <select
                  value={currentMonth}
                  onChange={(e) => setCurrentMonth(Number(e.target.value))}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-750 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/10 cursor-pointer transition-all"
                >
                  {MONTH_NAMES_TH.map((name, idx) => (
                    <option key={idx} value={idx}>{name}</option>
                  ))}
                </select>
                <select
                  value={currentYear}
                  onChange={(e) => setCurrentYear(Number(e.target.value))}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-750 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/10 cursor-pointer transition-all"
                >
                  {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                    <option key={year} value={year}>พ.ศ. {year + 543}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevMonth}
                  title="เดือนก่อนหน้า"
                  className="rounded-lg border border-gray-150 p-2 text-gray-500 transition-all hover:bg-gray-50 hover:text-gray-700 active:scale-95"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => {
                    setCurrentMonth(new Date().getMonth());
                    setCurrentYear(new Date().getFullYear());
                  }}
                  className="rounded-lg border border-gray-150 px-3 py-1.5 text-xs font-bold text-gray-600 transition-all hover:bg-gray-50 hover:text-gray-800 active:scale-95"
                >
                  เดือนปัจจุบัน
                </button>
                <button
                  onClick={handleNextMonth}
                  title="เดือนถัดไป"
                  className="rounded-lg border border-gray-150 p-2 text-gray-500 transition-all hover:bg-gray-50 hover:text-gray-700 active:scale-95"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {/* Day Headers */}
              {WEEKDAYS_TH.map((day, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "pb-2 text-center text-xs font-bold uppercase tracking-wider",
                    idx === 0 || idx === 6 ? "text-red-500" : "text-gray-400"
                  )}
                >
                  {day}
                </div>
              ))}

              {/* Grid Cells */}
              {calendarCells.map((dayNum, cellIdx) => {
                if (dayNum === null) {
                  return <div key={`empty-${cellIdx}`} className="aspect-square rounded-2xl bg-gray-50/50" />;
                }

                const dayStr = String(dayNum).padStart(2, '0');
                const monthStr = String(currentMonth + 1).padStart(2, '0');
                const dateKey = `${currentYear}-${monthStr}-${dayStr}`;
                const holidayKey = `${monthStr}-${dayStr}`;
                const holidayName = HOLIDAYS[holidayKey];

                const record = monthlyAttendanceMap[dateKey];
                const isWeekend = cellIdx % 7 === 0 || cellIdx % 7 === 6;
                const isHoliday = !!holidayName;

                let cellBg = "bg-white hover:border-gray-300";
                let statusBadge = null;

                if (record) {
                  if (record.status === 'present') {
                    cellBg = "bg-green-50/70 border-green-200 text-green-700";
                    statusBadge = <span className="text-[10px] font-bold text-green-700">มาปกติ</span>;
                  } else if (record.status === 'late') {
                    cellBg = "bg-orange-50/70 border-orange-200 text-orange-700";
                    statusBadge = (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold text-orange-700">มาสาย</span>
                        {record.checkInTime && (
                          <span className="text-[9px] font-bold text-orange-500 bg-orange-100/40 rounded px-1 py-0.5 whitespace-nowrap">
                            {record.checkInTime} น.
                          </span>
                        )}
                      </div>
                    );
                  } else if (record.status === 'sick') {
                    cellBg = "bg-blue-50/70 border-blue-200 text-blue-700";
                    statusBadge = <span className="text-[10px] font-bold text-blue-700">ลาป่วย</span>;
                  } else if (record.status === 'personal') {
                    cellBg = "bg-purple-50/70 border-purple-200 text-purple-700";
                    statusBadge = <span className="text-[10px] font-bold text-purple-700">ลากิจ</span>;
                  } else if (record.status === 'absent') {
                    cellBg = "bg-red-50/70 border-red-200 text-red-700";
                    statusBadge = (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold text-red-700">อื่นๆ</span>
                        {record.notes && (
                          <span className="truncate text-[8px] font-medium text-red-600 block max-w-full" title={record.notes}>
                            {record.notes}
                          </span>
                        )}
                      </div>
                    );
                  }
                } else if (isWeekend) {
                  cellBg = "bg-red-50/30 text-gray-400";
                } else if (isHoliday) {
                  cellBg = "bg-amber-50/30 text-amber-700";
                }

                return (
                  <div
                    key={`day-${dayNum}`}
                    className={cn(
                      "flex aspect-square flex-col justify-between rounded-2xl border border-gray-100 p-2.5 transition-all",
                      cellBg
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "text-sm font-bold",
                        isWeekend && !record ? "text-red-400" : "text-gray-700",
                        isHoliday && !record ? "text-amber-600" : ""
                      )}>
                        {dayNum}
                      </span>
                      {isHoliday && (
                        <span 
                          title={holidayName} 
                          className="h-2 w-2 rounded-full bg-amber-500"
                        />
                      )}
                    </div>

                    <div className="flex flex-col gap-0.5">
                      {statusBadge}
                      {holidayName && (
                        <span className="truncate text-[8px] font-medium text-amber-600/90 leading-tight">
                          {holidayName}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Intern Profile & Stats - Right 1 Column */}
          <div className="space-y-6">
            {/* Profile Summary */}
            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4 border-b border-gray-50 pb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 font-bold text-lg">
                  {selectedIntern.firstName[0]}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{selectedIntern.firstName} {selectedIntern.lastName}</h4>
                  <p className="text-xs text-gray-400">รหัส: {selectedIntern.studentId}</p>
                </div>
              </div>

              <div className="mt-4 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">ระดับการศึกษา:</span>
                  <span className="font-semibold text-gray-750">{selectedIntern.level}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">สาขาวิชา:</span>
                  <span className="font-semibold text-gray-750">{selectedIntern.major}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">สถาบันการศึกษา:</span>
                  <span className="font-semibold text-gray-750">{selectedIntern.university}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">แผนกฝึกงาน:</span>
                  <span className="font-semibold text-gray-750">{formatDepartment(selectedIntern.department)}</span>
                </div>
              </div>
            </div>

            {/* Attendance Statistics for the Month */}
            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
              <h4 className="font-bold text-gray-900 border-b border-gray-50 pb-2 flex items-center gap-2">
                <TrendingUp size={18} className="text-orange-500" />
                <span>สถิติในเดือนนี้</span>
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-green-100 bg-green-50/50 p-3 text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.present}</div>
                  <div className="text-xs font-semibold text-green-600/80">มาปกติ</div>
                </div>

                <div className="rounded-2xl border border-orange-100 bg-orange-50/50 p-3 text-center">
                  <div className="text-2xl font-bold text-orange-600">{stats.late}</div>
                  <div className="text-xs font-semibold text-orange-600/80">มาสาย</div>
                </div>

                <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.sick}</div>
                  <div className="text-xs font-semibold text-blue-600/80">ลาป่วย</div>
                </div>

                <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-3 text-center">
                  <div className="text-2xl font-bold text-purple-600">{stats.personal}</div>
                  <div className="text-xs font-semibold text-purple-600/80">ลากิจ</div>
                </div>

                <div className="col-span-2 rounded-2xl border border-red-100 bg-red-50/50 p-3 text-center">
                  <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
                  <div className="text-xs font-semibold text-red-600/80">อื่นๆ</div>
                </div>
              </div>

              {/* Training Hours Progress */}
              <div className="pt-2">
                <div className="rounded-2xl bg-gray-50 p-4 border border-gray-100">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    รวมเวลาปฏิบัติงานเดือนนี้
                  </div>
                  <div className="text-2xl font-extrabold text-gray-800">
                    {stats.totalHours.toLocaleString()} <span className="text-sm font-semibold text-gray-500">ชั่วโมง</span>
                  </div>
                  <div className="mt-2 text-[10px] text-gray-400 leading-relaxed">
                    * คำนวณจาก มาปกติ วันละ 7 ชม. และ มาสาย ตามเวลาเข้างานจริงเริ่มตั้งแต่ 08.30 น. (ลาและอื่นๆ ไม่คิดชั่วโมง)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
