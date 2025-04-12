
export type UserType = 'admin' | 'issuer';

export interface User {
  id: string;
  email: string;
  fullName: string;
  password?: string;
  userType: UserType;
  certificates: string[];
}
