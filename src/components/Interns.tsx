import React, { useEffect, useState } from 'react';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Intern, InternStatus } from '../types';
import { Plus, Search, MoreVertical, Edit2, Trash2, UserPlus, X, Mail, Phone, School, Briefcase, Users, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, normalizeDepartments } from '../lib/utils';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

export default function Interns() {
  const [interns, setInterns] = useState<Intern[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingIntern, setEditingIntern] = useState<Intern | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    studentId: '',
    firstName: '',
    lastName: '',
    level: '',
    major: '',
    minor: '',
    university: '',
    department: [] as string[],
    startDate: '',
    endDate: '',
    status: 'กำลังฝึกงาน' as InternStatus,
  });

  const DEPARTMENTS = [
    'แผนกปฏิบัติการระบบไฟฟ้า',
    'แผนกบัญชีและการเงิน',
    'แผนกบริการลูกค้า'
  ];

  const fetchInterns = async () => {
    try {
      // Fetch all to avoid missing docs without createdAt field
      const snapshot = await getDocs(collection(db, 'interns'));
      const fetchedInterns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Intern));
      
      // Sort client-side instead of in query
      fetchedInterns.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      
      setInterns(fetchedInterns);
    } catch (error: any) {
      console.error("Error fetching interns:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterns();
  }, []);

  const toggleDepartment = (dept: string) => {
    setFormData(prev => ({
      ...prev,
      department: prev.department.includes(dept)
        ? prev.department.filter(d => d !== dept)
        : [...prev.department, dept]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.studentId || !formData.firstName || !formData.lastName || !formData.level || !formData.major || formData.department.length === 0) {
      alert('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (รหัสประจำตัว, ชื่อ, นามสกุล, ระดับชั้น, สาขาวิชา และเลือกแผนกอย่างน้อย 1 แผนก)');
      return;
    }

    try {
      if (editingIntern) {
        await updateDoc(doc(db, 'interns', editingIntern.id), {
          ...formData,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, 'interns'), {
          ...formData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      setIsModalOpen(false);
      resetForm();
      await fetchInterns();
      alert('บันทึกข้อมูลเรียบร้อยแล้ว');
    } catch (error: any) {
      console.error("Error saving intern:", error);
      alert('ไม่สามารถบันทึกข้อมูลได้: ' + (error.message || 'Error occurred'));
    }
  };

  const handleEdit = (intern: Intern) => {
    setEditingIntern(intern);
    setFormData({
      studentId: intern.studentId || '',
      firstName: intern.firstName,
      lastName: intern.lastName,
      level: intern.level,
      major: intern.major,
      minor: intern.minor || '',
      university: intern.university,
      department: normalizeDepartments(intern.department),
      startDate: intern.startDate,
      endDate: intern.endDate,
      status: intern.status,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('คุณต้องการลบข้อมูลนักศึกษาคนนี้ใช่หรือไม่?')) {
      try {
        await deleteDoc(doc(db, 'interns', id));
        fetchInterns();
      } catch (err) {
        alert('ไม่สามารถลบได้');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      studentId: '',
      firstName: '',
      lastName: '',
      level: '',
      major: '',
      minor: '',
      university: '',
      department: [],
      startDate: '',
      endDate: '',
      status: 'กำลังฝึกงาน',
    });
    setEditingIntern(null);
  };

  const filteredInterns = interns.filter(i => 
    `${i.firstName} ${i.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    normalizeDepartments(i.department).join(', ').toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.university.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.major.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="ค้นหาชื่อ, แผนก, หรือสาขาวิชา..." 
            className="w-full rounded-2xl border border-gray-100 bg-white py-3 pl-12 pr-4 shadow-sm focus:border-orange-200 focus:outline-none focus:ring-4 focus:ring-orange-100/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 py-3 font-bold text-white shadow-lg shadow-orange-100 transition-transform hover:bg-orange-600 active:scale-95"
        >
          <UserPlus size={20} />
          เพิ่มนักศึกษาใหม่
        </button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-50 bg-gray-50/50">
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">รหัส / นักศึกษา</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">สถาบัน / ระดับชั้น</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">คณะ / สาขาวิชา</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">แผนกฝึกงาน</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">สถานะ</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredInterns.map((intern) => (
              <tr key={intern.id} className="group transition-colors hover:bg-gray-50/50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 font-bold">
                      {intern.firstName[0]}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">{intern.studentId}</p>
                      <p className="font-semibold text-gray-900">{intern.firstName} {intern.lastName}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-gray-700">{intern.university}</p>
                  <p className="text-xs text-orange-500 font-medium">{intern.level}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-gray-700">{intern.major}</p>
                  <p className="text-xs text-gray-400">{intern.minor || '-'}</p>
                </td>
                <td className="px-6 py-4">
                   <div className="flex flex-wrap gap-1">
                      {normalizeDepartments(intern.department).map((d, idx) => (
                        <span key={idx} className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
                          {d}
                        </span>
                      ))}
                   </div>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase",
                    (intern.status === 'กำลังฝึกงาน' || (intern as any).status === 'active' || !intern.status) ? "bg-green-100 text-green-700" : 
                    (intern.status === 'ฝึกงานสำเร็จ' || (intern as any).status === 'completed') ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
                  )}>
                    {intern.status === 'active' ? 'กำลังฝึกงาน' : 
                     intern.status === 'completed' ? 'ฝึกงานสำเร็จ' : 
                     intern.status === 'terminated' ? 'ยกเลิก' : intern.status || 'รอฝึกงาน'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => handleEdit(intern)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-white hover:text-orange-500 hover:shadow-sm"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(intern.id)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-white hover:text-red-500 hover:shadow-sm"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredInterns.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="px-6 py-20 text-center text-gray-400">
                  <div className="flex flex-col items-center">
                    <Users size={48} className="mb-4 opacity-20" />
                    <p>ไม่พบข้อมูลนักศึกษาที่ค้นหา</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-gray-100 px-8 py-6">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingIntern ? 'แก้ไขข้อมูลนักศึกษา' : 'เพิ่มนักศึกษาใหม่'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto p-8">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">รหัสประจำตัว</label>
                    <input 
                      required 
                      type="text" 
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:border-orange-500 focus:bg-white focus:outline-none"
                      value={formData.studentId}
                      onChange={e => setFormData({...formData, studentId: e.target.value})}
                    />
                  </div>
                  <div className="hidden md:block"></div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">ชื่อ</label>
                    <input 
                      required 
                      type="text" 
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:border-orange-500 focus:bg-white focus:outline-none"
                      value={formData.firstName}
                      onChange={e => setFormData({...formData, firstName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">นามสกุล</label>
                    <input 
                      required 
                      type="text" 
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:border-orange-500 focus:bg-white focus:outline-none"
                      value={formData.lastName}
                      onChange={e => setFormData({...formData, lastName: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">สถาบัน</label>
                    <div className="relative">
                      <School size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        required 
                        type="text" 
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-12 pr-4 focus:border-orange-500 focus:bg-white focus:outline-none"
                        value={formData.university}
                        onChange={e => setFormData({...formData, university: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">ระดับชั้น</label>
                    <select 
                      required 
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:border-orange-500 focus:bg-white focus:outline-none"
                      value={formData.level}
                      onChange={e => setFormData({...formData, level: e.target.value})}
                    >
                      <option value="">เลือกระดับชั้น</option>
                      <option value="ปวช.">ปวช.</option>
                      <option value="ปวส.">ปวส.</option>
                      <option value="ปริญญาตรี">ปริญญาตรี</option>
                      <option value="ปริญญาโท">ปริญญาโท</option>
                      <option value="อื่นๆ">อื่นๆ</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">คณะ/สาขางาน (ถ้ามี)</label>
                    <input 
                      type="text" 
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:border-orange-500 focus:bg-white focus:outline-none"
                      value={formData.minor}
                      onChange={e => setFormData({...formData, minor: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">แผนกวิชา / สาขาวิชา</label>
                    <input 
                      required 
                      type="text" 
                      placeholder="เช่น คอมพิวเตอร์ธุรกิจ"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:border-orange-500 focus:bg-white focus:outline-none"
                      value={formData.major}
                      onChange={e => setFormData({...formData, major: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-bold text-gray-700">แผนกที่เข้าฝึกงาน (เลือกได้มากกว่า 1)</label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                       {DEPARTMENTS.map(dept => (
                         <button
                           key={dept}
                           type="button"
                           onClick={() => toggleDepartment(dept)}
                           className={cn(
                             "flex items-center justify-between rounded-xl border p-4 text-left text-sm font-medium transition-all",
                             formData.department.includes(dept)
                               ? "border-orange-500 bg-orange-50 text-orange-600 ring-2 ring-orange-100"
                               : "border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200"
                           )}
                         >
                           {dept}
                           {formData.department.includes(dept) && <Check size={16} className="text-orange-500" />}
                         </button>
                       ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">วันเริ่มฝึกงาน</label>
                    <input 
                      required 
                      type="date" 
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:border-orange-500 focus:bg-white focus:outline-none"
                      value={formData.startDate}
                      onChange={e => setFormData({...formData, startDate: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">วันสิ้นสุดฝึกงาน</label>
                    <input 
                      required 
                      type="date" 
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:border-orange-500 focus:bg-white focus:outline-none"
                      value={formData.endDate}
                      onChange={e => setFormData({...formData, endDate: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-bold text-gray-700">สถานะ</label>
                    <div className="flex gap-4">
                      {['รอฝึกงาน', 'กำลังฝึกงาน', 'ฝึกงานสำเร็จ'].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setFormData({...formData, status: s as InternStatus})}
                          className={cn(
                            "flex-1 rounded-xl border py-3 text-sm font-bold transition-all",
                            (formData.status === s || (s === 'กำลังฝึกงาน' && (formData.status as any) === 'active') || (s === 'ฝึกงานสำเร็จ' && (formData.status as any) === 'completed')) 
                              ? "border-orange-500 bg-orange-50 text-orange-600 ring-2 ring-orange-100" 
                              : "border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex gap-4">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 rounded-2xl bg-gray-50 py-4 font-bold text-gray-500 hover:bg-gray-100"
                  >
                    ยกเลิก
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 rounded-2xl bg-orange-500 py-4 font-bold text-white shadow-lg shadow-orange-100 hover:bg-orange-600"
                  >
                    บันทึกข้อมูล
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
