import React, { useEffect, useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Save,
  Loader2
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    orgNameTh: '',
    orgNameEn: '',
    address: '',
    phone: '',
  });

  useEffect(() => {
    async function fetchSettings() {
      try {
        const docRef = doc(db, 'settings', 'org_config');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setFormData(docSnap.data() as any);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'org_config'), {
        ...formData,
        updatedAt: new Date().toISOString(),
      });
      alert('บันทึกการตั้งค่าสำเร็จ');
    } catch (error) {
      console.error("Error saving settings:", error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      <aside className="w-full shrink-0 lg:w-48">
        <nav className="flex lg:flex-col">
          <button
            className="flex flex-1 items-center gap-3 rounded-2xl bg-orange-50 px-4 py-3 text-sm font-bold text-orange-600 shadow-sm lg:flex-none"
          >
            <SettingsIcon size={18} />
            ทั่วไป
          </button>
        </nav>
      </aside>

      <div className="flex-1 space-y-8">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="rounded-3xl border border-gray-100 bg-white p-8">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">การตั้งค่าองค์กร</h3>
                <p className="text-sm text-gray-500">ข้อมูลหน่วยงานที่ปรากฏในระบบและใบรับรอง</p>
              </div>
              <button 
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-2.5 font-bold text-white shadow-lg shadow-orange-100 hover:bg-orange-600 disabled:opacity-50"
              >
                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                บันทึกการตั้งค่า
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-700">ชื่อองค์กร (ภาษาไทย)</label>
                <input 
                  required
                  type="text" 
                  value={formData.orgNameTh}
                  onChange={e => setFormData({...formData, orgNameTh: e.target.value})}
                  className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm focus:border-orange-200 focus:outline-none" 
                  placeholder="เช่น การไฟฟ้าส่วนภูมิภาคสาขาทับสะแก"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-700">ชื่อองค์กร (English)</label>
                <input 
                  required
                  type="text" 
                  value={formData.orgNameEn}
                  onChange={e => setFormData({...formData, orgNameEn: e.target.value})}
                  className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm focus:border-orange-200 focus:outline-none"
                  placeholder="e.g. Provincial Electricity Authority Thap Sakae Branch"
                />
              </div>
              <div className="flex flex-col gap-2 sm:col-span-2">
                <label className="text-sm font-bold text-gray-700">ที่อยู่องค์กร</label>
                <textarea 
                  required
                  rows={3}
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm focus:border-orange-200 focus:outline-none"
                  placeholder="รายละเอียดที่ตั้งองค์กร"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-700">เบอร์โทรศัพท์องค์กร</label>
                <input 
                  required
                  type="text" 
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm focus:border-orange-200 focus:outline-none" 
                  placeholder="0xx-xxx-xxxx"
                />
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
