"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Link from "next/link";
import { RoleGate } from "@/features/auth/components/role-gate";
import { OrganizerEventsList } from "@/features/events/components/organizer-events-list";

export default function OrganizerEventsPage() {
  return (
    <main className="flex-1 p-8">
      <RoleGate role="organizer">
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h4" component="h1">
              Meus eventos
            </Typography>
            <Button component={Link} href="/organizador/eventos/novo" variant="contained">
              Novo evento
            </Button>
          </Box>
          <OrganizerEventsList />
        </Box>
      </RoleGate>
    </main>
  );
}
