export type UserRole = 'admin' | 'employee' | 'qr_display';

export interface UserProfile {
  uid: string;
  username: string;
  role: UserRole;
  displayName: string;
  permissions: {
    canViewHistory: boolean;
  };
}

export interface AttendanceRecord {
  id?: string;
  uid: string;
  username: string;
  timestamp: any; // Firestore Timestamp
  type: 'check-in' | 'check-out';
  location?: {
    lat: number;
    lng: number;
    accuracy: number;
    isInsideRange: boolean;
  };
}

export interface SystemSettings {
  companyLocation: {
    lat: number;
    lng: number;
    radius: number; // In meters
  };
}

export interface QRToken {
  token: string;
  expiresAt: any; // Firestore Timestamp
}
