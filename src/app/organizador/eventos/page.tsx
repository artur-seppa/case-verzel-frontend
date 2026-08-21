"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { RoleGate } from "@/features/auth/components/role-gate";
import { OrganizerEventsList } from "@/features/events/components/organizer-events-list";
import { CreateEventDrawer } from "@/features/events/components/create-event-drawer";

export default function OrganizerEventsPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <Box component="main" sx={{ flex: 1, p: 4 }}>
      <RoleGate role="organizer">
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              pr: { xs: 0, sm: 10 },
            }}
          >
            <Typography variant="h4" component="h1">
              Meus eventos
            </Typography>
            <Button variant="contained" onClick={() => setDrawerOpen(true)}>
              Novo evento
            </Button>
          </Box>
          <OrganizerEventsList />
        </Box>
      </RoleGate>
      <CreateEventDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </Box>
  );
}
