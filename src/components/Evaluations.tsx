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
  Download,
  Edit2,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatDepartment } from '../lib/utils';
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
    issueDate: new Date().toISOString().split('T')[0],
    totalDays: '81',
    totalHours: '649',
    grade: 'ดีมาก',
    signatory1: {
      name: 'นายธันวา มูลมาก',
      title: 'ผู้ช่วยหัวหน้าแผนกปฏิบัติการระบบไฟฟ้า',
      secondaryTitle: 'รักษาการแทน หัวหน้าแผนกปฏิบัติการระบบไฟฟ้า'
    },
    signatory2: {
      name: 'นายภูเดช ภักดีพันธ์',
      title: 'ผู้จัดการ การไฟฟ้าส่วนภูมิภาคสาขาทับสะแก'
    }
  });

  const formatThaiDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '-';
      
      const day = date.getDate();
      const month = date.toLocaleDateString('th-TH', { month: 'long' });
      const year = date.getFullYear() + 543;
      
      return `${day} ${month} พ.ศ. ${year}`;
    } catch (e) {
      return '-';
    }
  };

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
    // Create a temporary hidden iframe or new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const certElement = document.getElementById('certificate-print-content');
    if (!certElement) return;

    // Get all styles from the current document
    const styles = Array.from(document.styleSheets)
      .map(styleSheet => {
        try {
          return Array.from(styleSheet.cssRules)
            .map(rule => rule.cssText)
            .join('');
        } catch (e) {
          return '';
        }
      })
      .join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>ใบรับรองการฝึกงาน - ${selectedInternForCert.name}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
          <style>
            ${styles}
            @media print {
              body { margin: 0; padding: 0; }
              .no-print { display: none !important; }
              #certificate-print-content { 
                width: 210mm; 
                height: 297mm; 
                margin: 0 auto; 
                padding: 25mm 20mm;
                box-shadow: none !important;
                border: none !important;
                position: relative;
              }
            }
            body { 
              font-family: 'Sarabun', sans-serif; 
              font-size: 16pt; 
              color: black;
              line-height: 1.6;
            }
            #certificate-print-content {
              background: white;
              width: 210mm;
              min-height: 297mm;
              margin: 0 auto;
              padding: 25mm 20mm;
              text-align: center;
              box-sizing: border-box;
            }
            .logo-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              margin-bottom: 2rem;
            }
            .pea-logo {
              width: 250px;
              height: auto;
            }
            .title-main { font-size: 20pt; font-weight: bold; margin: 1.5rem 0; }
            .content-text { text-align: justify; text-indent: 1.5cm; margin-top: 2rem; font-weight: normal; }
            .bold-data { font-weight: normal; }
            .signature-section { margin-top: 4rem; text-align: center; }
            .date-section { margin-top: 2rem; text-align: center; }
          </style>
        </head>
        <body>
          <div id="certificate-print-content">
            <div class="logo-container">
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Logo_PEA.png/800px-Logo_PEA.png" class="pea-logo" alt="PEA Logo" />
            </div>

            <div class="title-main">หนังสือรับรองการฝึกงาน/ฝึกอาชีพ</div>
            
            <div class="content-text">
              หนังสือฉบับนี้ให้ไว้เพื่อรับรองว่า <span class="bold-data">${selectedInternForCert.firstName} ${selectedInternForCert.lastName}</span>
              รหัสประจำตัว <span class="bold-data">${selectedInternForCert.studentId}</span> 
              สาขาวิชา <span class="bold-data">${selectedInternForCert.major}</span>
              <span class="bold-data">${selectedInternForCert.faculty || '-'}</span> เป็นนักศึกษาของ
              <span class="bold-data">${selectedInternForCert.university}</span> ได้ผ่านการฝึกงาน/ฝึกอาชีพตามหลักสูตร
              <span class="bold-data">${selectedInternForCert.level}</span> ณ สถานที่ฝึกงาน/ฝึกอาชีพ สถานที่ตั้ง <span class="bold-data">${certOptions.trainingLocation}</span>
              แผนก <span class="bold-data">${formatDepartment(selectedInternForCert.department)}</span> โดยได้ปฏิบัติงานในหน้าที่
              และงานต่างๆ ระยะเวลาฝึกงาน/ฝึกอาชีพ วันที่ ${formatThaiDate(selectedInternForCert.startDate)} ถึง 
              วันที่ ${formatThaiDate(selectedInternForCert.endDate)} เป็นระยะเวลา 
              <span class="bold-data">${certOptions.totalDays}</span> วัน รวมจำนวน 
              <span class="bold-data">${certOptions.totalHours}</span> ชั่วโมง ผลการฝึกงาน/ฝึกอาชีพอยู่ในระดับ 
              <span class="bold-data">${certOptions.grade}</span> 
            </div>

            <div class="date-section">
              <div style="font-weight: bold; margin-bottom: 0.5rem; font-size: 20pt;">จึงออกหนังสือรับรองฉบับนี้ไว้เป็นสำคัญ</div>
              <div>ออกให้ ณ วันที่ ${formatThaiDate(certOptions.issueDate)}</div>
            </div>

            <div style="margin-top: 4rem; display: flex; flex-direction: column; align-items: flex-end; padding-right: 2cm;">
              <div class="signature-section">
                <p style="margin-bottom: 2rem;">ลงชื่อ..................................................................................</p>
                <p>( ${certOptions.signatory1.name} )</p>
                <p style="font-size: 14pt;">${certOptions.signatory1.title}</p>
              </div>
              
              <div class="signature-section" style="margin-top: 3rem;">
                <p style="margin-bottom: 2rem;">ลงชื่อ..................................................................................</p>
                <p>( ${certOptions.signatory2.name} )</p>
                <p style="font-size: 14pt;">${certOptions.signatory2.title}</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    
    // Give time for resources to load
    setTimeout(() => {
      printWindow.print();
      // On some browsers print() is blocking, but on others we might want to close() locally
      // printWindow.close();
    }, 1000);
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
                    <p className="truncate text-xs text-gray-500">{formatDepartment(intern?.department)} • {format(new Date(evalItem.date), 'd MMM yyyy', { locale: th })}</p>
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
                          <p className="truncate text-xs text-gray-500">{formatDepartment(intern.department)}</p>
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
                    <input type="date" className="w-full mt-1 p-2 text-sm border rounded-lg" value={certOptions.issueDate} onChange={e => setCertOptions({...certOptions, issueDate: e.target.value})} />
                  </div>
                  <hr className="my-4" />
                  <p className="text-xs font-bold text-gray-900 mb-2">ผู้ลงนาม 1</p>
                  <input className="w-full p-2 text-sm border rounded-lg mb-2" placeholder="ชื่อ-นามสกุล" value={certOptions.signatory1.name} onChange={e => setCertOptions({...certOptions, signatory1: {...certOptions.signatory1, name: e.target.value}})} />
                  <input className="w-full p-2 text-sm border rounded-lg" placeholder="ตำแหน่ง" value={certOptions.signatory1.title} onChange={e => setCertOptions({...certOptions, signatory1: {...certOptions.signatory1, title: e.target.value}})} />
                  <p className="text-xs font-bold text-gray-900 mt-4 mb-2">ผู้ลงนาม 2</p>
                  <input className="w-full p-2 text-sm border rounded-lg mb-2" placeholder="ชื่อ-นามสกุล" value={certOptions.signatory2.name} onChange={e => setCertOptions({...certOptions, signatory2: {...certOptions.signatory2, name: e.target.value}})} />
                  <input className="w-full p-2 text-sm border rounded-lg" placeholder="ตำแหน่ง" value={certOptions.signatory2.title} onChange={e => setCertOptions({...certOptions, signatory2: {...certOptions.signatory2, title: e.target.value}})} />
                </div>

                <div className="mt-8 space-y-3 pt-6 border-t border-gray-200">
                  <button 
                    onClick={handlePrint}
                    className="w-full flex items-center justify-center gap-3 rounded-2xl bg-gray-900 px-6 py-4 font-bold text-white shadow-xl shadow-gray-200 transition-all hover:bg-black active:scale-[0.98]"
                  >
                    <Printer size={20} />
                    พิมพ์ใบรับรอง
                  </button>
                  <button 
                    onClick={() => {
                      alert('แนะนำให้ใช้ฟังก์ชัน "พิมพ์" และเลือก "Save as PDF" (บันทึกเป็น PDF) เพื่อคุณภาพสีและฟอนต์ที่สมบูรณ์ที่สุด');
                      handlePrint();
                    }}
                    className="w-full flex items-center justify-center gap-3 rounded-2xl border-2 border-gray-900 bg-white px-6 py-4 font-bold text-gray-900 transition-all hover:bg-gray-50 active:scale-[0.98]"
                  >
                    <Download size={20} />
                    บันทึกเป็น PDF
                  </button>
                </div>
              </div>

              {/* Main Preview Area */}
              <div className="flex-1 overflow-y-auto bg-gray-600 p-4 sm:p-8 print:p-0 print:overflow-visible print:bg-white">
                <div className="sticky top-0 z-10 mb-8 flex items-center justify-between rounded-2xl border border-white/20 bg-gray-900/80 px-8 py-4 backdrop-blur-md print:hidden">
                  <h3 className="text-lg font-bold text-white">ดูตัวอย่างใบรับรอง</h3>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => {
                        alert('แนะนำให้ใช้ฟังก์ชัน "พิมพ์" และเลือก "Save as PDF" (บันทึกเป็น PDF) เพื่อคุณภาพสีและฟอนต์ที่สมบูรณ์ที่สุด');
                        handlePrint();
                      }}
                      className="hidden sm:flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-2.5 font-bold text-white hover:bg-white/20 transition-all"
                    >
                      <Download size={18} />
                      บันทึก PDF
                    </button>
                    <button 
                      onClick={handlePrint}
                      className="flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-2.5 font-bold text-white hover:bg-orange-600 shadow-lg shadow-orange-950/20"
                    >
                      <Printer size={18} />
                      พิมพ์
                    </button>
                    <button onClick={() => setSelectedInternForCert(null)} className="text-white/40 hover:text-white">
                      <X size={24} />
                    </button>
                  </div>
                </div>

                <div id="certificate-print-area" className="flex justify-center print:block">
                  <div 
                    id="certificate-print-content" 
                    className="origin-top scale-[0.5] sm:scale-[0.7] lg:scale-[0.8] xl:scale-100 min-w-[210mm] min-h-[297mm] p-[25mm] bg-white shadow-2xl flex flex-col items-center print:scale-100 print:shadow-none font-serif text-black" 
                    style={{ fontFamily: "'Sarabun', sans-serif" }}
                  >
                    <div className="flex flex-col items-center text-center">
                      <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Logo_PEA.png/800px-Logo_PEA.png" alt="PEA LOGO" className="h-[180px] mb-2 object-contain" />
                    </div>

                    <h1 className="text-[20pt] font-bold mb-14 mt-6 text-black border-b-2 border-black inline-block pb-1">หนังสือรับรองการฝึกงาน/ฝึกอาชีพ</h1>

                    <div className="w-full text-justify leading-[1.6] text-[16pt] space-y-4 text-black font-normal">
                      <p className="indent-24">
                        หนังสือฉบับนี้ให้ไว้เพื่อรับรองว่า <span className="font-normal">{selectedInternForCert.firstName} {selectedInternForCert.lastName}</span> รหัสประจำตัว <span className="font-normal">{selectedInternForCert.studentId}</span> สาขาวิชา 
                        <span className="font-normal">{selectedInternForCert.major}</span> <span className="font-normal">{selectedInternForCert.faculty || '-'}</span> เป็นนักศึกษาของ <span className="font-normal">{selectedInternForCert.university}</span> ได้ผ่านการฝึกงาน/ฝึกอาชีพตามหลักสูตร <span className="font-normal">{selectedInternForCert.level}</span> ณ สถานที่ฝึกงาน/ฝึกอาชีพ สถานที่ตั้ง <span className="font-normal">{certOptions.trainingLocation}</span> แผนก <span className="font-normal">{formatDepartment(selectedInternForCert.department)}</span> โดยได้ปฏิบัติงานในหน้าที่ และงานต่างๆ ระยะเวลาฝึกงาน/ฝึกอาชีพ วันที่ {formatThaiDate(selectedInternForCert.startDate)} ถึง วันที่ {formatThaiDate(selectedInternForCert.endDate)} เป็นระยะเวลา <span className="font-normal">{certOptions.totalDays}</span> วัน รวมจำนวน <span className="font-normal">{certOptions.totalHours}</span> ชั่วโมง ผลการฝึกงาน/ฝึกอาชีพอยู่ในระดับ <span className="font-normal">{certOptions.grade}</span>
                      </p>
                    </div>

                    <div className="mt-12 text-center text-black">
                        <p className="font-bold text-[20pt]">จึงออกหนังสือรับรองฉบับนี้ไว้เป็นสำคัญ</p>
                        <p className="mt-4 text-[16pt] font-normal">ออกให้ ณ วันที่ {formatThaiDate(certOptions.issueDate)}</p>
                    </div>

                    <div className="mt-auto w-full flex flex-col items-end gap-12 py-10 pr-10 text-black">
                        <div className="flex flex-col items-center text-center">
                           <p className="mb-4">ลงชื่อ...........................................................................</p>
                           <p className="text-[16pt] font-normal">( {certOptions.signatory1.name} )</p>
                           <p className="text-[14pt] mt-1 font-normal text-gray-700">{certOptions.signatory1.title}</p>
                        </div>

                        <div className="flex flex-col items-center text-center">
                           <p className="mb-4">ลงชื่อ...........................................................................</p>
                           <p className="text-[16pt] font-normal">( {certOptions.signatory2.name} )</p>
                           <p className="text-[14pt] mt-1 font-normal text-gray-700">{certOptions.signatory2.title}</p>
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
