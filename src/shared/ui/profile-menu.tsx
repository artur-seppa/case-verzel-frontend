"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Avatar from "@mui/material/Avatar";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import ListItemIcon from "@mui/material/ListItemIcon";
import LogoutIcon from "@mui/icons-material/Logout";
import Button from "@mui/material/Button";
import { useCurrentUser } from "@/features/auth/api/use-current-user";
import { authApi } from "@/features/auth/api/auth-api";
import { UserRole } from "@/features/auth/types";
import { isAuthRoute } from "./auth-routes";

const ROLE_LABELS: Record<UserRole, string> = {
  client: "Cliente",
  organizer: "Organizador",
  gatekeeper: "Portaria",
};

export function ProfileMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  async function handleLogout() {
    setAnchorEl(null);
    await authApi.logout().catch(() => undefined);
    await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    router.push("/login");
  }

  if (isAuthRoute(pathname)) return null;

  return (
    <Box sx={{ position: "fixed", top: 16, right: 24, zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      {user ? (
        <>
          <IconButton onClick={(event) => setAnchorEl(event.currentTarget)} aria-label="Conta">
            <Avatar sx={{ width: 36, height: 36, fontSize: "0.9rem" }}>
              {user.name.charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>
          <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
            <Box sx={{ px: 2, py: 1, minWidth: 200 }}>
              <Typography variant="subtitle2">{user.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {user.email}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {ROLE_LABELS[user.role] ?? user.role}
              </Typography>
            </Box>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Sair
            </MenuItem>
          </Menu>
        </>
      ) : (
        <Button component={Link} href="/login" variant="outlined" size="small">
          Entrar
        </Button>
      )}
    </Box>
  );
}
