"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { useCurrentUser } from "../api/use-current-user";
import { UserRole } from "../types";

export function RoleGate({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const router = useRouter();
  const { data: user, isLoading, isError } = useCurrentUser();

  useEffect(() => {
    if (isLoading) return;
    if (isError || !user) {
      router.replace("/login");
      return;
    }
    if (user.role !== role) {
      router.replace("/");
    }
  }, [isLoading, isError, user, role, router]);

  if (isLoading || isError || !user || user.role !== role) {
    return (
      <Box display="flex" justifyContent="center" p={8}>
        <CircularProgress />
      </Box>
    );
  }

  return <>{children}</>;
}
