import React, { useEffect, useState } from 'react';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc,
  getDoc,
  query, 
  where,
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Intern, Evaluation } from '../types';
import { 
  ClipboardCheck, 
  Plus, 
  Search, 
  Star, 
  MessageSquare,
  ChevronRight,
  X,
  PlusCircle,
  FileText,
  Award,
  Printer,
  Edit2,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

const CRITERIA = [
  { id: 'discipline', label: 'ระเบียบวินัย / การตรงต่อเวลา' },
  { id: 'responsibility', label: 'ความรับผิดชอบต่อหน้าที่' },
  { id: 'quality', label: 'คุณภาพของงาน' },
  { id: 'teamwork', label: 'มนุษยสัมพันธ์และการทำงานเป็นทีม' },
  { id: 'learning', label: 'ความกระตือรือร้นในการเรียนรู้' },
];

export default function Evaluations() {
  const [interns, setInterns] = useState<Intern[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIntern, setSelectedIntern] = useState<Intern | null>(null);
  const [editingEvaluation, setEditingEvaluation] = useState<Evaluation | null>(null);
  const [deletingEvaluationId, setDeletingEvaluationId] = useState<string | null>(null);

  // Certificate State
  const [selectedInternForCert, setSelectedInternForCert] = useState<Intern | null>(null);
  const [certOptions, setCertOptions] = useState({
    trainingLocation: '',
    trainingAddress: '',
    duties: 'งานขยายเขตระบบจำหน่าย งานบำรุงรักษาระบบจำหน่าย และงานสำรวจตัดต้นไม้',
    issueDate: format(new Date(), 'd MMMM yyyy', { locale: th }),
    totalDays: '81',
    totalHours: '649',
    grade: 'ดีมาก',
    signatory1: {
      name: 'นายธันวา มูลมาก',
      title: 'ผู้ช่วยหัวหน้าแผนกก่อสร้าง ปฏิบัติการและบำรุงรักษาระบบไฟฟ้า',
      secondaryTitle: 'รักษาการแทน หัวหน้าแผนกก่อสร้าง ปฏิบัติการและบำรุงรักษาระบบไฟฟ้า'
    },
    signatory2: {
      name: 'นายภูเดช ภักดีพันธ์',
      title: 'ผู้จัดการ การไฟฟ้าส่วนภูมิภาคสาขาทับสะแก'
    }
  });

  // Evaluation Form State
  const [scores, setScores] = useState<Record<string, number>>(
    CRITERIA.reduce((acc, c) => ({ ...acc, [c.id]: 0 }), {})
  );
  const [comments, setComments] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const internsSnapshot = await getDocs(collection(db, 'interns'));
        setInterns(internsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Intern)));

        const evalsQ = query(collection(db, 'evaluations'), orderBy('createdAt', 'desc'));
        const evalsSnapshot = await getDocs(evalsQ);
        setEvaluations(evalsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Evaluation)));

        // Fetch Settings
        const settingsSnap = await getDoc(doc(db, 'settings', 'org_config'));
        if (settingsSnap.exists()) {
          const settings = settingsSnap.data();
          setCertOptions(prev => ({
            ...prev,
            trainingLocation: settings.orgNameTh || prev.trainingLocation,
            trainingAddress: settings.address || prev.trainingAddress,
          }));
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const totalScoreVal = (Object.values(scores) as number[]).reduce((a, b) => a + b, 0);
  const averageScore = totalScoreVal / CRITERIA.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIntern) return;

    try {
      const evaluationData = {
        internId: selectedIntern.id,
        date: editingEvaluation ? editingEvaluation.date : new Date().toISOString().split('T')[0],
        scores,
        totalScore: averageScore,
        comments,
        updatedAt: serverTimestamp(),
      };

      if (editingEvaluation) {
        await updateDoc(doc(db, 'evaluations', editingEvaluation.id), evaluationData);
      } else {
        await addDoc(collection(db, 'evaluations'), {
          ...evaluationData,
          createdAt: serverTimestamp(),
        });
      }

      setIsModalOpen(false);
      resetForm();
      // Refetch
      const evalsQ = query(collection(db, 'evaluations'), orderBy('createdAt', 'desc'));
      const evalsSnapshot = await getDocs(evalsQ);
      setEvaluations(evalsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Evaluation)));
      alert(editingEvaluation ? 'อัปเดตการประเมินผลสำเร็จ' : 'บันทึกการประเมินผลสำเร็จ');
    } catch (error) {
      console.error("Error saving evaluation:", error);
      handleFirestoreError(error, editingEvaluation ? OperationType.UPDATE : OperationType.CREATE, 'evaluations');
    }
  };

  const handleEdit = (evaluation: Evaluation) => {
    const intern = interns.find(i => i.id === evaluation.internId);
    if (intern) {
      setEditingEvaluation(evaluation);
      setSelectedIntern(intern);
      setScores(evaluation.scores);
      setComments(evaluation.comments);
      setIsModalOpen(true);
    }
  };

  const handleDelete = async () => {
    if (!deletingEvaluationId) return;
    
    try {
      setLoading(true);
      await deleteDoc(doc(db, 'evaluations', deletingEvaluationId));
      
      // Refetch immediately
      const evalsQ = query(collection(db, 'evaluations'), orderBy('createdAt', 'desc'));
      const evalsSnapshot = await getDocs(evalsQ);
      setEvaluations(evalsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Evaluation)));
      
      setDeletingEvaluationId(null);
    } catch (error) {
      console.error("Error deleting evaluation:", error);
      handleFirestoreError(error, OperationType.DELETE, `evaluations/${deletingEvaluationId}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const resetForm = () => {
    setScores(CRITERIA.reduce((acc, c) => ({ ...acc, [c.id]: 0 }), {}));
    setComments('');
    setSelectedIntern(null);
    setEditingEvaluation(null);
  };

  return (
    <div className="space-y-8 no-print">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap');
          
          @media print {
            .no-print, .no-print * {
              display: none !important;
            }
            body {
              background: white !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            #certificate-print-area {
              display: block !important;
              position: fixed !important;
              top: 0 !important;
              left: 0 !important;
              width: 100% !important;
              height: 100% !important;
              z-index: 99999 !important;
              background: white !important;
              padding: 0 !important;
              margin: 0 !important;
              overflow: visible !important;
            }
            #certificate-print-content {
              border: none !important;
              box-shadow: none !important;
              width: 210mm !important;
              min-height: 297mm !important;
              margin: 0 auto !important;
              padding: 1.5cm !important;
              display: flex !important;
              flex-direction: column !important;
              align-items: center !important;
            }
            @page {
              size: A4;
              margin: 0;
            }
          }
        `}
      </style>

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900">ประเมินผลและออกใบรับรอง</h3>
          <p className="text-sm text-gray-500">บันทึกผลการปฏิบัติงานและออกใบรับรองการฝึกงาน</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-2xl bg-gray-900 px-6 py-3 font-bold text-white shadow-lg shadow-gray-200 transition-transform active:scale-95"
        >
          <PlusCircle size={20} />
          ทำการประเมินใหม่
        </button>
      </div>

      {/* Certificate Section */}
      <div className="rounded-3xl border border-gray-100 bg-white p-8">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-900">ออกใบรับรองการฝึกงาน</h3>
          <p className="text-sm text-gray-500">เลือกนักศึกษาที่ฝึกงานสำเร็จแล้วเพื่อออกใบรับรอง</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {interns.filter(i => i.status === 'ฝึกงานสำเร็จ' || (i as any).status === 'completed').map((intern) => (
            <button
              key={intern.id}
              onClick={() => setSelectedInternForCert(intern)}
              className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 p-6 transition-all hover:border-orange-200 hover:bg-white hover:shadow-lg hover:shadow-orange-100/20 text-left"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                  <Award size={24} />
                </div>
                <div className="overflow-hidden">
                  <p className="truncate font-bold text-gray-900">{intern.firstName} {intern.lastName}</p>
                  <p className="truncate text-xs text-gray-500">{intern.level} - {intern.major}</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-300 shrink-0" />
            </button>
          ))}
          {interns.filter(i => i.status === 'ฝึกงานสำเร็จ' || (i as any).status === 'completed').length === 0 && (
            <div className="col-span-full border border-dashed border-gray-200 rounded-2xl p-8 text-center text-gray-400 text-sm">
              ยังไม่มีนักศึกษาที่สำเร็จการฝึกงาน
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Recent Evaluations */}
        <div className="space-y-6">
          <h4 className="text-sm font-bold uppercase tracking-wider text-gray-400">การประเมินล่าสุด</h4>
          <div className="space-y-4">
            {evaluations.map((evalItem) => {
              const intern = interns.find(i => i.id === evalItem.internId);
              return (
                <div key={evalItem.id} className="group relative flex items-center gap-4 rounded-3xl border border-gray-100 bg-white p-6 transition-all hover:border-orange-200 hover:shadow-lg hover:shadow-orange-100/20">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-500 font-bold text-xl uppercase">
                    {intern?.firstName[0] || '?'}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <p className="truncate font-bold text-gray-900">{intern?.firstName} {intern?.lastName}</p>
                      <div className="flex items-center gap-1 text-orange-500">
                        <Star size={14} fill="currentColor" />
                        <span className="text-sm font-bold">{evalItem.totalScore.toFixed(1)}</span>
                      </div>
                    </div>
                    <p className="truncate text-xs text-gray-500">{Array.isArray(intern?.department) ? intern?.department.join(', ') : intern?.department} • {format(new Date(evalItem.date), 'd MMM yyyy', { locale: th })}</p>
                    <p className="mt-2 line-clamp-1 text-sm text-gray-600 italic">"{evalItem.comments}"</p>
                  </div>
                  <div className="flex items-center gap-2 transition-opacity group-hover:opacity-100 sm:opacity-0">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleEdit(evalItem); }}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 text-gray-400 transition-all hover:bg-orange-100 hover:text-orange-600"
                      title="แก้ไข"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setDeletingEvaluationId(evalItem.id); }}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 text-gray-400 transition-all hover:bg-red-50 hover:text-red-500"
                      title="ลบ"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <ChevronRight size={20} className="text-gray-300 transition-transform group-hover:translate-x-1" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Info Card */}
        <div className="rounded-3xl bg-orange-500 p-10 text-white shadow-xl shadow-orange-100">
          <FileText size={48} className="mb-6 opacity-40" />
          <h3 className="mb-4 text-2xl font-bold">เกณฑ์การประเมิน</h3>
          <p className="mb-8 text-orange-100 leading-relaxed font-medium">
            การให้คะแนนควรพิจารณาจากผลงานจริง พฤติกรรม และความก้าวหน้าตลอดระยะเวลาที่ผ่านมา 
            โดยคะแนนเต็มในแต่ละหัวข้อคือ 5 คะแนน
          </p>
          <div className="space-y-3">
            {CRITERIA.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs font-bold">{i+1}</div>
                <span className="text-sm font-medium">{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Evaluation Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-gray-100 px-8 py-6">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingEvaluation ? 'แก้ไขแบบประเมิน' : 'แบบประเมินผลการฝึกงาน'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-auto p-8">
                <div className="mb-8 space-y-4">
                  <label className="text-sm font-bold text-gray-700">เลือกนักศึกษา</label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {interns.filter(i => i.status === 'กำลังฝึกงาน' || (i as any).status === 'active' || !i.status).map((intern) => (
                      <button
                        key={intern.id}
                        type="button"
                        onClick={() => setSelectedIntern(intern)}
                        className={cn(
                          "flex items-center gap-3 rounded-2xl border p-3 text-left transition-all",
                          selectedIntern?.id === intern.id 
                            ? "border-orange-500 bg-orange-50 ring-2 ring-orange-200" 
                            : "border-gray-100 bg-gray-50 hover:border-gray-200"
                        )}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white font-bold text-gray-400">
                          {intern.firstName[0]}
                        </div>
                        <div className="overflow-hidden">
                          <p className="truncate text-sm font-bold text-gray-900">{intern.firstName} {intern.lastName}</p>
                          <p className="truncate text-xs text-gray-500">{Array.isArray(intern.department) ? intern.department.join(', ') : intern.department}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-8">
                  {CRITERIA.map((criterion) => (
                    <div key={criterion.id} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-gray-800">{criterion.label}</label>
                        <span className="text-lg font-black text-orange-500">{scores[criterion.id]} / 5</span>
                      </div>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setScores({...scores, [criterion.id]: val})}
                            className={cn(
                              "flex-1 rounded-xl border py-3 font-bold transition-all",
                              scores[criterion.id] === val 
                                ? "border-orange-500 bg-orange-50 text-orange-600 shadow-sm" 
                                : "border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200"
                            )}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 space-y-2">
                  <label className="text-sm font-bold text-gray-700">ความคิดเห็นเพิ่มเติม</label>
                  <textarea 
                    rows={4}
                    placeholder="ระบุความคิดเห็นเกี่ยวกับผลการปฏิบัติงาน..."
                    className="w-full rounded-2xl border border-gray-100 bg-gray-50 p-4 focus:border-orange-200 focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-100/50"
                    value={comments}
                    onChange={e => setComments(e.target.value)}
                  />
                </div>

                <div className="mt-10 flex gap-4">
                  <button 
                    type="button" onClick={() => setIsModalOpen(false)}
                    className="flex-1 rounded-2xl bg-gray-50 py-4 font-bold text-gray-500 hover:bg-gray-100"
                  >
                    ยกเลิก
                  </button>
                  <button 
                    type="submit" 
                    disabled={!selectedIntern || totalScoreVal === 0}
                    className="flex-1 rounded-2xl bg-orange-500 py-4 font-bold text-white shadow-lg shadow-orange-100 hover:bg-orange-600 disabled:opacity-50 disabled:shadow-none"
                  >
                    {editingEvaluation ? 'บันทึกการแก้ไข' : 'บันทึกการประเมิน'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Certificate Modal */}
      <AnimatePresence>
        {selectedInternForCert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:p-0">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedInternForCert(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md print:hidden"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-5xl overflow-hidden rounded-[40px] bg-white shadow-2xl print:m-0 print:h-screen print:w-screen print:rounded-none print:shadow-none flex flex-col lg:flex-row"
            >
              {/* Sidebar Config - HIDDEN IN PRINT */}
              <div className="w-full lg:w-80 border-r border-gray-100 bg-gray-50 p-8 overflow-y-auto max-h-[40vh] lg:max-h-none print:hidden">
                <h4 className="font-bold text-gray-900 mb-6">ตั้งค่าใบรับรอง</h4>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">สถานที่ฝึกงาน</label>
                    <input className="w-full mt-1 p-2 text-sm border rounded-lg" value={certOptions.trainingLocation} onChange={e => setCertOptions({...certOptions, trainingLocation: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">ที่อยู่สถานที่ฝึกงาน</label>
                    <textarea className="w-full mt-1 p-2 text-sm border rounded-lg" rows={2} value={certOptions.trainingAddress} onChange={e => setCertOptions({...certOptions, trainingAddress: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">งานในหน้าที่</label>
                    <textarea className="w-full mt-1 p-2 text-sm border rounded-lg" rows={3} value={certOptions.duties} onChange={e => setCertOptions({...certOptions, duties: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">จำนวนวัน</label>
                      <input className="w-full mt-1 p-2 text-sm border rounded-lg" value={certOptions.totalDays} onChange={e => setCertOptions({...certOptions, totalDays: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">รวมชั่วโมง</label>
                      <input className="w-full mt-1 p-2 text-sm border rounded-lg" value={certOptions.totalHours} onChange={e => setCertOptions({...certOptions, totalHours: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">ระดับผลการฝึกงาน</label>
                    <input className="w-full mt-1 p-2 text-sm border rounded-lg" value={certOptions.grade} onChange={e => setCertOptions({...certOptions, grade: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">วันที่ออกใบรับรอง</label>
                    <input className="w-full mt-1 p-2 text-sm border rounded-lg" value={certOptions.issueDate} onChange={e => setCertOptions({...certOptions, issueDate: e.target.value})} />
                  </div>
                  <hr className="my-4" />
                  <p className="text-xs font-bold text-gray-900 mb-2">ผู้ลงนาม 1</p>
                  <input className="w-full p-2 text-sm border rounded-lg mb-2" placeholder="ชื่อ-นามสกุล" value={certOptions.signatory1.name} onChange={e => setCertOptions({...certOptions, signatory1: {...certOptions.signatory1, name: e.target.value}})} />
                  <input className="w-full p-2 text-sm border rounded-lg" placeholder="ตำแหน่ง" value={certOptions.signatory1.title} onChange={e => setCertOptions({...certOptions, signatory1: {...certOptions.signatory1, title: e.target.value}})} />
                  <p className="text-xs font-bold text-gray-900 mt-4 mb-2">ผู้ลงนาม 2</p>
                  <input className="w-full p-2 text-sm border rounded-lg mb-2" placeholder="ชื่อ-นามสกุล" value={certOptions.signatory2.name} onChange={e => setCertOptions({...certOptions, signatory2: {...certOptions.signatory2, name: e.target.value}})} />
                  <input className="w-full p-2 text-sm border rounded-lg" placeholder="ตำแหน่ง" value={certOptions.signatory2.title} onChange={e => setCertOptions({...certOptions, signatory2: {...certOptions.signatory2, title: e.target.value}})} />
                </div>
              </div>

              {/* Main Preview Area */}
              <div className="flex-1 overflow-y-auto bg-gray-600 p-4 sm:p-8 print:p-0 print:overflow-visible print:bg-white">
                <div className="sticky top-0 z-10 mb-8 flex items-center justify-between rounded-2xl border border-white/20 bg-gray-900/80 px-8 py-4 backdrop-blur-md print:hidden">
                  <h3 className="text-lg font-bold text-white">ดูตัวอย่างใบรับรอง</h3>
                  <div className="flex gap-4">
                    <button 
                      onClick={handlePrint}
                      className="flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-2.5 font-bold text-white hover:bg-orange-600 shadow-lg shadow-orange-950/20"
                    >
                      <Printer size={18} />
                      พิมพ์ใบรับรอง
                    </button>
                    <button onClick={() => setSelectedInternForCert(null)} className="text-white/40 hover:text-white">
                      <X size={24} />
                    </button>
                  </div>
                </div>

                <div id="certificate-print-area" className="flex justify-center print:block">
                  <div 
                    id="certificate-print-content" 
                    className="origin-top scale-[0.6] sm:scale-[0.8] lg:scale-100 w-[210mm] min-h-[297mm] p-16 bg-white shadow-2xl flex flex-col items-center print:scale-100 print:shadow-none print:p-14 font-serif" 
                    style={{ fontFamily: "'Sarabun', sans-serif" }}
                  >
                    <div className="mb-6 flex flex-col items-center text-center text-black">
                      <img src="https://upload.wikimedia.org/wikipedia/commons/4/4b/Logo_PEA.png" alt="PEA LOGO" className="h-[120px] mb-2 object-contain" />
                      <h2 className="text-[26px] font-bold leading-tight">การไฟฟ้าส่วนภูมิภาค</h2>
                      <p className="text-[12px] font-bold tracking-[0.1em]">PROVINCIAL ELECTRICITY AUTHORITY</p>
                    </div>

                    <h1 className="text-[24px] font-bold mb-14 mt-6 text-black">หนังสือรับรองการฝึกงาน/ฝึกอาชีพ</h1>

                    <div className="w-full text-justify leading-[2.2] text-[18px] space-y-4 text-black">
                      <p className="indent-24">
                        หนังสือฉบับนี้ให้ไว้เพื่อรับรองว่า <span className="font-bold border-b border-dotted border-black px-2">{selectedInternForCert.firstName} {selectedInternForCert.lastName}</span> รหัสประจำตัว <span className="font-bold border-b border-dotted border-black px-2">{selectedInternForCert.studentId}</span> สาขาวิชา 
                        <span className="font-bold border-b border-dotted border-black px-2">{selectedInternForCert.major}</span> สาขางาน <span className="font-bold border-b border-dotted border-black px-2">{selectedInternForCert.minor || '-'}</span> เป็นนักศึกษาของ <span className="font-bold border-b border-dotted border-black px-2">{selectedInternForCert.university}</span> ได้ผ่านการฝึกงาน/ฝึกอาชีพตามหลักสูตร <span className="font-bold border-b border-dotted border-black px-2">{selectedInternForCert.level}</span> ณ สถานที่ฝึกงาน/ฝึกอาชีพ <span className="font-bold border-b border-dotted border-black px-2">{certOptions.trainingLocation}</span> สถานที่ตั้ง <span className="font-bold border-b border-dotted border-black px-2">{certOptions.trainingAddress}</span> แผนก <span className="font-bold border-b border-dotted border-black px-2">{Array.isArray(selectedInternForCert.department) ? selectedInternForCert.department.join(', ') : selectedInternForCert.department}</span> โดยได้ปฏิบัติงานในหน้าที่ <span className="font-bold border-b border-dotted border-black px-2">{certOptions.duties}</span> ระยะเวลาฝึกงาน/ฝึกอาชีพ <span className="font-bold border-b border-dotted border-black px-2">วันที่ {format(new Date(selectedInternForCert.startDate), 'd MMMM พ.ศ. yyyy', { locale: th })}</span> ถึงวันที่ <span className="font-bold border-b border-dotted border-black px-2">{format(new Date(selectedInternForCert.endDate), 'd MMMM พ.ศ. yyyy', { locale: th })}</span> เป็นระยะเวลา <span className="font-bold border-b border-dotted border-black px-2">{certOptions.totalDays}</span> วัน รวมจำนวน <span className="font-bold border-b border-dotted border-black px-2">{certOptions.totalHours}</span> ชั่วโมง ผลการฝึกงาน/ฝึกอาชีพอยู่ในระดับ <span className="font-bold border-b border-dotted border-black px-2">{certOptions.grade}</span>
                      </p>
                    </div>

                    <div className="mt-20 w-full flex flex-col items-center text-black">
                        <p className="font-bold text-[18px]">จึงออกหนังสือรับรองฉบับนี้ไว้เป็นสำคัญ</p>
                        <p className="mt-4 text-[18px]">ออกให้ ณ วันที่ {certOptions.issueDate}</p>
                    </div>

                    <div className="mt-auto w-full flex flex-col items-end gap-24 py-16 pr-10 text-black">
                        <div className="flex flex-col items-center text-center">
                           <p className="mb-4">ลงชื่อ...........................................................................</p>
                           <p>( {certOptions.signatory1.name} )</p>
                           <p className="text-[16px] mt-2">{certOptions.signatory1.title}</p>
                           {certOptions.signatory1.secondaryTitle && <p className="text-[16px]">{certOptions.signatory1.secondaryTitle}</p>}
                        </div>

                        <div className="flex flex-col items-center text-center">
                           <p className="mb-4">ลงชื่อ...........................................................................</p>
                           <p>( {certOptions.signatory2.name} )</p>
                           <p className="text-[16px] mt-2">{certOptions.signatory2.title}</p>
                        </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingEvaluationId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDeletingEvaluationId(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white p-8 shadow-2xl text-center"
            >
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                <Trash2 size={32} />
              </div>
              <h3 className="mb-2 text-xl font-bold text-gray-900">ยืนยันการลบ</h3>
              <p className="mb-8 text-gray-500">คุณต้องการลบข้อมูลการประเมินนี้ใช่หรือไม่? ข้อมูลที่ลบแล้วจะไม่สามารถกู้คืนได้</p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeletingEvaluationId(null)}
                  className="flex-1 rounded-xl bg-gray-50 py-3 font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex-1 rounded-xl bg-red-500 py-3 font-bold text-white shadow-lg shadow-red-100 hover:bg-red-600 transition-colors"
                >
                  ยืนยันการลบ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
