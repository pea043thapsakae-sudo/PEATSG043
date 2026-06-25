import React, { useEffect, useState, useRef } from 'react';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  setDoc, 
  doc, 
  serverTimestamp,
  orderBy 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Intern, Attendance as AttendanceType, AttendanceStatus } from '../types';
import { 
  CheckCircle2, 
  Clock, 
  UserMinus, 
  AlertCircle, 
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Search,
  Save,
  Check,
  X
} from 'lucide-react';
import { format, startOfToday, addDays, subDays } from 'date-fns';
import { th } from 'date-fns/locale';
import { cn, calculateLateHours, formatDepartment } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function Attendance() {
  const [interns, setInterns] = useState<Intern[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceType>>({});
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dateInputRef = useRef<HTMLInputElement>(null);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const dayOfWeek = selectedDate.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  const HOLIDAYS: Record<string, string> = {
    '2026-01-01': 'วันขึ้นปีใหม่',
    '2026-03-03': 'วันมาฆบูชา',
    '2026-04-06': 'วันจักรี',
    '2026-04-13': 'วันสงกรานต์',
    '2026-04-14': 'วันสงกรานต์',
    '2026-04-15': 'วันสงกรานต์',
    '2026-05-01': 'วันแรงงานแห่งชาติ',
    '2026-05-04': 'วันฉัตรมงคล',
    '2026-05-31': 'วันวิสาขบูชา',
    '2026-06-01': 'วันชดเชยวิสาขบูชา',
    '2026-06-03': 'วันเฉลิมพระชนมพรรษา สมเด็จพระนางเจ้าฯ พระบรมราชินี',
    '2026-07-28': 'วันเฉลิมพระชนมพรรษา พระบาทสมเด็จพระเจ้าอยู่หัว',
    '2026-08-12': 'วันแม่แห่งชาติ',
    '2026-10-13': 'วันคล้ายวันสวรรคต ร.9',
    '2026-10-23': 'วันปิยมหาราช',
    '2026-12-05': 'วันคล้ายวันพระบรมราชสมภพ ร.9',
    '2026-12-10': 'วันรัฐธรรมนูญ',
    '2026-12-31': 'วันสิ้นปี'
  };

  const holidayName = HOLIDAYS[dateStr];
  const isHoliday = !!holidayName;

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch interns
        const internsSnapshot = await getDocs(collection(db, 'interns'));
        const allInterns = internsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Intern));
        // Fetch attendance for selected date
        const attendanceQ = query(collection(db, 'attendance'), where('date', '==', dateStr));
        const attendanceSnapshot = await getDocs(attendanceQ);
        const dailyAttendance: Record<string, AttendanceType> = {};
        attendanceSnapshot.docs.forEach(doc => {
          const data = doc.data() as AttendanceType;
          dailyAttendance[data.internId] = { id: doc.id, ...data };
        });
        setAttendance(dailyAttendance);

        // Filter interns client-side
        const matchingInterns = allInterns.filter(i => {
          // 1. ให้แสดงถ้ามีบันทึกการเช็คชื่อไว้แล้ว (เพื่อให้แก้ไขข้อมูลเก่าได้)
          if (dailyAttendance[i.id]) return true;

          // 2. ระบบเริ่มเปิดบันทึกข้อมูลตั้งแต่วันที่ 20 เมษายน 2569 เป็นต้นไป
          if (dateStr < '2026-04-20') return false;

          // 3. กฎความสัมพันธ์ของระบบใหม่: แสดงเฉพาะ "กำลังฝึกงาน" หรือสถานะเดิม "active"
          const status = i.status as string;
          const isActive = status === 'กำลังฝึกงาน' || status === 'active' || !status;

          return isActive;
        });
        setInterns(matchingInterns);
      } catch (error) {
        console.error("Error fetching attendance:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [dateStr]);

  const handleMarkStatus = (internId: string, status: AttendanceStatus) => {
    setAttendance(prev => {
      const existing = prev[internId] || {};
      const updated: AttendanceType = {
        ...existing,
        internId,
        date: dateStr,
        status,
        createdAt: existing.createdAt || new Date().toISOString()
      };
      
      // If late and checkInTime isn't set, set default to '08:45'
      if (status === 'late' && !updated.checkInTime) {
        updated.checkInTime = '08:45';
      }
      
      return {
        ...prev,
        [internId]: updated
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const promises = Object.values(attendance).map((record: AttendanceType) => {
        const docId = record.id || `${record.internId}_${dateStr}`;
        return setDoc(doc(db, 'attendance', docId), {
          ...record,
          id: docId,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      });
      await Promise.all(promises);
      alert('บันทึกข้อมูลเรียบร้อยแล้ว');
    } catch (error) {
      console.error("Error saving attendance:", error);
      alert('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(false);
    }
  };

  const filteredInterns = interns.filter(i => 
    `${i.firstName} ${i.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusOptions: { value: AttendanceStatus; label: string; icon: any; color: string }[] = [
    { value: 'present', label: 'มาปกติ', icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
    { value: 'late', label: 'มาสาย', icon: Clock, color: 'text-orange-600 bg-orange-50' },
    { value: 'sick', label: 'ลาป่วย', icon: AlertCircle, color: 'text-blue-600 bg-blue-50' },
    { value: 'personal', label: 'ลากิจ', icon: UserMinus, color: 'text-purple-600 bg-purple-50' },
    { value: 'absent', label: 'อื่นๆ', icon: X, color: 'text-red-600 bg-red-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-2xl border border-gray-100 bg-white p-1">
            <button 
              onClick={() => setSelectedDate(subDays(selectedDate, 1))}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-50 hover:text-gray-900"
            >
              <ChevronLeft size={20} />
            </button>
            <div 
              className="relative flex items-center gap-2 px-4 text-lg font-bold text-gray-900 group cursor-pointer hover:text-orange-500 transition-colors" 
              title="คลิกเพื่อเลือกวันที่"
              onClick={() => {
                try {
                  // Trigger native date picker
                  if ('showPicker' in HTMLInputElement.prototype) {
                    dateInputRef.current?.showPicker();
                  } else {
                    dateInputRef.current?.focus();
                    dateInputRef.current?.click();
                  }
                } catch (e) {
                  dateInputRef.current?.focus();
                  dateInputRef.current?.click();
                }
              }}
            >
              <CalendarIcon size={20} className="text-orange-500" />
              <span>{format(selectedDate, 'd MMMM yyyy', { locale: th })}</span>
              <input 
                ref={dateInputRef}
                type="date"
                className="absolute inset-0 opacity-0 cursor-pointer w-full"
                value={dateStr}
                style={{ visibility: 'visible' }}
                onChange={(e) => {
                  const newDate = new Date(e.target.value);
                  if (!isNaN(newDate.getTime())) {
                    setSelectedDate(newDate);
                  }
                }}
              />
            </div>
            <button 
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-50 hover:text-gray-900"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <button 
            onClick={() => setSelectedDate(startOfToday())}
            className="text-sm font-bold text-orange-600 hover:orange-700"
          >
            วันนี้
          </button>
        </div>

        {isWeekend && (
          <div className="flex items-center gap-2 rounded-2xl bg-orange-50 px-6 py-3 text-orange-600 shadow-sm border border-orange-100">
            <AlertCircle size={20} />
            <span className="font-bold">วันนี้เป็นวันหยุดสุดสัปดาห์ ({dayOfWeek === 0 ? 'วันอาทิตย์' : 'วันเสาร์'})</span>
          </div>
        )}

        {isHoliday && (
          <div className="flex items-center gap-2 rounded-2xl bg-red-50 px-6 py-3 text-red-600 shadow-sm border border-red-100">
            <AlertCircle size={20} />
            <span className="font-bold">วันนี้เป็นวันหยุดนักขัตฤกษ์ ({holidayName})</span>
          </div>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="ค้นหาชื่อ..." 
              className="h-12 rounded-xl border border-gray-100 bg-white pl-10 pr-4 text-sm focus:border-orange-200 focus:outline-none focus:ring-4 focus:ring-orange-100/50"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-gray-900 px-8 font-bold text-white shadow-lg shadow-gray-200 transition-all hover:bg-gray-800 active:scale-95 disabled:opacity-50"
          >
            {saving ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <Save size={18} />}
            บันทึกทั้งหมด
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-50 bg-gray-50/50">
              <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-gray-500">นักศึกษา</th>
              <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-gray-500">เลือกสถานะ</th>
              <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-gray-500">สถานะปัจจุบัน</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredInterns.map((intern) => (
              <tr key={intern.id} className="transition-colors hover:bg-gray-50/30">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 font-bold">
                      {intern.firstName ? intern.firstName[0] : '?'}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{intern.firstName || 'ไม่ระบุ'} {intern.lastName || ''}</p>
                      <p className="text-xs text-gray-400">
                        {formatDepartment(intern.department)}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="flex flex-wrap gap-2">
                    {statusOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => handleMarkStatus(intern.id, opt.value)}
                        className={cn(
                          "group relative flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-all",
                          attendance[intern.id]?.status === opt.value
                            ? cn("border-transparent shadow-md", opt.color)
                            : "border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200"
                        )}
                      >
                        <opt.icon size={16} />
                        {opt.label}
                        {attendance[intern.id]?.status === opt.value && (
                          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-current shadow-sm">
                            <Check size={10} />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Additional inputs based on status */}
                  {attendance[intern.id]?.status === 'absent' && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-[11px] font-bold text-red-600 whitespace-nowrap">ระบุเหตุผล:</span>
                      <input
                        type="text"
                        placeholder="ระบุเหตุผล เช่น ขาดการติดต่อ, ไปทำธุระต่างจังหวัด..."
                        value={attendance[intern.id]?.notes || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAttendance(prev => ({
                            ...prev,
                            [intern.id]: {
                              ...prev[intern.id],
                              notes: val
                            }
                          }));
                        }}
                        className="rounded-xl border border-red-150 bg-red-50/10 px-3 py-1.5 text-xs focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/10 w-full max-w-md font-semibold text-red-800"
                      />
                    </div>
                  )}

                  {attendance[intern.id]?.status === 'late' && (
                    <div className="mt-3 flex flex-wrap items-center gap-3 bg-orange-50/40 p-2.5 rounded-xl border border-orange-100/50">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-orange-700 whitespace-nowrap">ระบุเวลามาสาย:</span>
                        <input
                          type="time"
                          value={attendance[intern.id]?.checkInTime || '08:45'}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAttendance(prev => ({
                              ...prev,
                              [intern.id]: {
                                ...prev[intern.id],
                                checkInTime: val
                              }
                            }));
                          }}
                          className="rounded-lg border border-orange-200 bg-white px-2 py-0.5 text-xs font-bold text-orange-800 focus:border-orange-500 focus:outline-none"
                        />
                      </div>
                      <div className="text-[11px] text-orange-800 font-bold">
                        ปฏิบัติงานจริง: <span className="text-xs font-extrabold text-orange-600">{calculateLateHours(attendance[intern.id]?.checkInTime)}</span> ชม.
                      </div>
                      <div className="text-[9px] text-gray-400">
                        (เริ่ม 08.30 - 16.30 น. หักพักเที่ยง 1 ชม.)
                      </div>
                    </div>
                  )}
                </td>
                <td className="px-8 py-6">
                  <div className="flex flex-col gap-1">
                    {attendance[intern.id] ? (
                      <>
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase",
                            statusOptions.find(o => o.value === attendance[intern.id].status)?.color
                          )}>
                             {statusOptions.find(o => o.value === attendance[intern.id].status)?.label}
                          </div>
                        </div>
                        {attendance[intern.id].status === 'absent' && attendance[intern.id].notes && (
                          <span className="text-xs text-red-600 font-semibold truncate max-w-[200px]" title={attendance[intern.id].notes}>
                            เหตุผล: {attendance[intern.id].notes}
                          </span>
                        )}
                        {attendance[intern.id].status === 'late' && (
                          <span className="text-xs text-orange-600 font-semibold">
                            เวลา: {attendance[intern.id].checkInTime || '08:45'} น. ({calculateLateHours(attendance[intern.id].checkInTime)} ชม.)
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-xs italic text-gray-300">ยังไม่ลงเวลา</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredInterns.length === 0 && !loading && (
              <tr>
                <td colSpan={3} className="px-8 py-20 text-center text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <CalendarIcon size={48} className="mb-2 opacity-20" />
                    <p className="font-bold text-gray-600">ไม่พบรายชื่อในวันที่เลือก</p>
                    <p className="text-sm">นักศึกษาจะแสดงชื่อตามช่วงวันที่เริ่มฝึกงานที่ระบุไว้ในระบบ</p>
                    {dateStr < '2026-04-20' && (
                      <p className="mt-2 text-xs text-orange-500 font-medium">* ระบบเริ่มบันทึกข้อมูลตั้งแต่วันที่ 20 เมษายน 2569 เป็นต้นไป</p>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
