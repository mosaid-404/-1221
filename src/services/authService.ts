import { initializeApp } from 'firebase/app';
import { auth, db, firebaseConfig } from '../firebase';
import { 
  signInWithEmailAndPassword,
  signOut, 
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User,
  createUserWithEmailAndPassword,
  getAuth,
  updatePassword
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { UserProfile, UserRole } from '../types';

const ADMIN_EMAIL = "admin@attendance-system.local";
const DOMAIN = "attendance-system.local";

// Secondary app for creating users without signing out the current admin
const secondaryApp = initializeApp(firebaseConfig, 'Secondary');
const secondaryAuth = getAuth(secondaryApp);

// Helper to map username to email
const usernameToEmail = (username: string) => {
  if (username.includes('@')) return username;
  return `${username}@${DOMAIN}`;
};

export const loginWithCredentials = async (username: string, password: string) => {
  try {
    const email = usernameToEmail(username);
    let user;
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      user = result.user;
    } catch (error: any) {
      // If it's the admin email and user not found, create it
      if (email === ADMIN_EMAIL && (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential')) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        user = result.user;
      } else {
        throw error;
      }
    }
    
    // Check if user profile exists in Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (!userDoc.exists()) {
      const role: UserRole = user.email === ADMIN_EMAIL ? 'admin' : 'employee';
      const profile: UserProfile = {
        uid: user.uid,
        username: username,
        role,
        displayName: username,
        permissions: {
          canViewHistory: true
        }
      };
      await setDoc(doc(db, 'users', user.uid), profile);
      return profile;
    }
    
    return userDoc.data() as UserProfile;
  } catch (error: any) {
    console.error('Login error:', error);
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
    }
    if (error.code === 'auth/weak-password') {
      throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    }
    throw error;
  }
};

export const logout = async () => {
  await signOut(auth);
};

export const getCurrentUser = async (): Promise<UserProfile | null> => {
  const user = auth.currentUser;
  if (!user) return null;
  
  const userDoc = await getDoc(doc(db, 'users', user.uid));
  return userDoc.exists() ? (userDoc.data() as UserProfile) : null;
};

export const getEmployees = async (): Promise<UserProfile[]> => {
  const q = query(collection(db, 'users'), where('role', '==', 'employee'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as UserProfile);
};

export const deleteEmployee = async (uid: string) => {
  await deleteDoc(doc(db, 'users', uid));
};

export const updateEmployeePermissions = async (uid: string, permissions: any) => {
  await updateDoc(doc(db, 'users', uid), { permissions });
};

export const createEmployee = async (username: string, displayName: string, password: string) => {
  try {
    const email = usernameToEmail(username);
    
    // Check if username taken in Firestore first
    const q = query(collection(db, 'users'), where('username', '==', username));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      throw new Error('اسم المستخدم موجود بالفعل');
    }

    // Create Auth account using secondary auth instance
    const result = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const user = result.user;
    
    // Sign out from secondary app immediately
    await signOut(secondaryAuth);

    // Create Firestore profile
    const profile: UserProfile = {
      uid: user.uid,
      username: username,
      role: 'employee',
      displayName: displayName,
      permissions: {
        canViewHistory: true
      }
    };
    await setDoc(doc(db, 'users', user.uid), profile);
    return profile;
  } catch (error: any) {
    console.error('Create employee error:', error);
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('اسم المستخدم موجود بالفعل');
    }
    if (error.code === 'auth/weak-password') {
      throw new Error('كلمة المرور ضعيفة جداً');
    }
    throw error;
  }
};

export const updateUserPassword = async (newPassword: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error('يجب تسجيل الدخول أولاً');
  
  try {
    await updatePassword(user, newPassword);
  } catch (error: any) {
    console.error('Update password error:', error);
    if (error.code === 'auth/requires-recent-login') {
      throw new Error('يرجى تسجيل الدخول مرة أخرى لتغيير كلمة المرور');
    }
    throw new Error('فشل تغيير كلمة المرور. يرجى المحاولة مرة أخرى.');
  }
};

export const onAuthStateChanged = (callback: (user: UserProfile | null) => void) => {
  return firebaseOnAuthStateChanged(auth, async (user) => {
    if (user) {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        callback(userDoc.data() as UserProfile);
      } else {
        callback(null);
      }
    } else {
      callback(null);
    }
  });
};
