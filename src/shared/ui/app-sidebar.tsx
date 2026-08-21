"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Drawer from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import { useCurrentUser } from "@/features/auth/api/use-current-user";
import { UserRole } from "@/features/auth/types";
import { isAuthRoute } from "./auth-routes";

export const SIDEBAR_WIDTH = 240;

interface NavLink {
  href: string;
  label: string;
}

const ROLE_LINKS: Record<UserRole, NavLink[]> = {
  client: [
    { href: "/", label: "Eventos" },
    { href: "/meus-ingressos", label: "Meus ingressos" },
  ],
  organizer: [
    { href: "/", label: "Eventos" },
    { href: "/organizador/eventos", label: "Meus eventos" },
  ],
  gatekeeper: [{ href: "/portaria", label: "Portaria" }],
};

const GUEST_LINKS: NavLink[] = [
  { href: "/", label: "Eventos" },
  { href: "/login", label: "Entrar" },
  { href: "/registro", label: "Criar conta" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { data: user } = useCurrentUser();
  const links = user ? ROLE_LINKS[user.role] : GUEST_LINKS;

  if (isAuthRoute(pathname)) return null;

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        "& .MuiDrawer-paper": { width: SIDEBAR_WIDTH, boxSizing: "border-box" },
      }}
    >
      <Box sx={{ p: 3 }}>
        <Typography
          variant="h6"
          component={Link}
          href="/"
          sx={{
            fontFamily: "var(--font-display)",
            letterSpacing: "0.02em",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          Verzel
        </Typography>
      </Box>
      <List sx={{ px: 1.5 }}>
        {links.map((link) => (
          <ListItemButton
            key={link.href}
            component={Link}
            href={link.href}
            selected={pathname === link.href}
            sx={{ borderRadius: 1, mb: 0.5 }}
          >
            <ListItemText primary={link.label} />
          </ListItemButton>
        ))}
      </List>
    </Drawer>
  );
}
