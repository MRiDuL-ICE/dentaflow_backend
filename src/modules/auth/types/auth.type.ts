export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string | null;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: Date;
}

export interface ClinicMemberRecord {
  userId: string;
  clinicId: string;
  roleId: number;
  roleName: string;
}
