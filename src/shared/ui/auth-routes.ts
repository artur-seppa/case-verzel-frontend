export const AUTH_ROUTES = ["/login", "/registro"];

export function isAuthRoute(pathname: string | null): boolean {
  return AUTH_ROUTES.includes(pathname ?? "");
}
