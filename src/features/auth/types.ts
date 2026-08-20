export type UserRole = "organizer" | "client" | "gatekeeper";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}
