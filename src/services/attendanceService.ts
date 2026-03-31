import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  getDoc, 
  setDoc,
  Timestamp,
  limit
} from 'firebase/firestore';
import { AttendanceRecord, QRToken, SystemSettings } from '../types';

export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

export const logAttendance = async (
  uid: string, 
  username: string, 
  type: 'check-in' | 'check-out', 
  token: string,
  location?: { lat: number; lng: number; accuracy: number }
) => {
  const tokenDoc = await getDoc(doc(db, 'qr_tokens', 'current'));
  if (!tokenDoc.exists()) {
    throw new Error('لم يتم العثور على رمز QR. يرجى التأكد من فتح شاشة الكود.');
  }

  const currentToken = tokenDoc.data() as QRToken;
  if (currentToken.token !== token) {
    throw new Error('رمز QR غير صالح أو منتهي الصلاحية');
  }

  // Check expiration (Firestore Timestamp)
  const expiresAt = currentToken.expiresAt instanceof Timestamp ? currentToken.expiresAt.toDate() : new Date(currentToken.expiresAt);
  if (expiresAt < new Date()) {
    throw new Error('رمز QR منتهي الصلاحية');
  }

  let isInsideRange = false;
  if (location) {
    const settings = await getSystemSettings();
    if (settings?.companyLocation) {
      const distance = calculateDistance(
        location.lat,
        location.lng,
        settings.companyLocation.lat,
        settings.companyLocation.lng
      );
      isInsideRange = distance <= settings.companyLocation.radius;
    }
  }

  const record: Omit<AttendanceRecord, 'id'> = {
    uid,
    username,
    timestamp: Timestamp.now(),
    type,
    location: location ? { ...location, isInsideRange } : undefined
  };

  await addDoc(collection(db, 'attendance'), record);
  return record;
};

export const updateSystemSettings = async (settings: SystemSettings) => {
  await setDoc(doc(db, 'settings', 'global'), settings);
};

export const getSystemSettings = async () => {
  const sDoc = await getDoc(doc(db, 'settings', 'global'));
  return sDoc.exists() ? (sDoc.data() as SystemSettings) : null;
};

export const subscribeToSystemSettings = (callback: (settings: SystemSettings) => void) => {
  return onSnapshot(doc(db, 'settings', 'global'), (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as SystemSettings);
    }
  });
};

export const getAttendanceHistory = (uid: string, callback: (records: AttendanceRecord[]) => void) => {
  const q = query(
    collection(db, 'attendance'), 
    where('uid', '==', uid),
    orderBy('timestamp', 'desc'),
    limit(50)
  );
  
  return onSnapshot(q, (snapshot) => {
    const records = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as AttendanceRecord));
    callback(records);
  });
};

export const getAllAttendance = (callback: (records: AttendanceRecord[]) => void) => {
  const q = query(
    collection(db, 'attendance'), 
    orderBy('timestamp', 'desc'),
    limit(100)
  );
  
  return onSnapshot(q, (snapshot) => {
    const records = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as AttendanceRecord));
    callback(records);
  });
};

export const updateQRToken = async (token: string) => {
  const qrToken: QRToken = {
    token,
    expiresAt: Timestamp.fromDate(new Date(Date.now() + 10000))
  };
  await setDoc(doc(db, 'qr_tokens', 'current'), qrToken);
};

export const subscribeToQRToken = (callback: (token: QRToken) => void) => {
  return onSnapshot(doc(db, 'qr_tokens', 'current'), (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as QRToken);
    }
  });
};
