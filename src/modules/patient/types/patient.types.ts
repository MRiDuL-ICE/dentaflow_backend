export interface PatientRecord {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  address: Record<string, unknown>;
  medicalHistory: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
