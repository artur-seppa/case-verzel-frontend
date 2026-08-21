"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useCurrentUser } from "@/features/auth/api/use-current-user";
import { isAuthRoute } from "./auth-routes";

const GATEKEEPER_HOME = "/portaria";

export function GatekeeperGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user } = useCurrentUser();

  const shouldRedirect =
    user?.role === "gatekeeper" && pathname !== GATEKEEPER_HOME && !isAuthRoute(pathname);

  useEffect(() => {
    if (shouldRedirect) router.replace(GATEKEEPER_HOME);
  }, [shouldRedirect, router]);

  return null;
}
