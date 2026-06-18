export interface JwtPayload {
  sub: string; // user id
  email: string;
  roles: string[];
  clinicId: string | null; // null for super_admin
  iat?: number;
  exp?: number;
}
