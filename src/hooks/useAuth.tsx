import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut, 
  User 
} from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Login Error:", error);
      if (error.code === 'auth/popup-blocked') {
        alert('กรุณาอนุญาตให้เว็บแสดง Pop-up เพื่อเข้าสู่ระบบด้วย Google');
      } else {
        alert('เกิดข้อผิดพลาดในการเข้าสู่ระบบ: ' + error.message);
      }
    }
  };

  const loginWithEmail = async (idOrEmail: string, pass: string) => {
    try {
      // If it's a numeric ID, append a internal domain to make it an email for Firebase
      const email = idOrEmail.includes('@') ? idOrEmail : `${idOrEmail}@intern.hub`;
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error: any) {
      console.error("Login Error:", error);
      let message = 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = 'รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง';
      } else if (error.code === 'auth/invalid-email') {
        message = 'รูปแบบรหัสพนักงานไม่ถูกต้อง';
      }
      throw new Error(message);
    }
  };

  const registerWithEmail = async (idOrEmail: string, pass: string) => {
    try {
      const email = idOrEmail.includes('@') ? idOrEmail : `${idOrEmail}@intern.hub`;
      await createUserWithEmailAndPassword(auth, email, pass);
    } catch (error: any) {
      console.error("Register Error:", error);
      let message = 'ไม่สามารถสร้างบัญชีได้';
      if (error.code === 'auth/email-already-in-use') {
        message = 'รหัสพนักงานนี้ถูกใช้งานแล้ว';
      }
      throw new Error(message);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithEmail, registerWithEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
