export interface LoginCredentials {
  identifier: string;
  password: string;
}

export interface User {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  identifier: string;
  phone1: string;
  phone2: string;
  email_second: string;
  company_id: string;
  role_id: string;
  role: string;
  status_id: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

