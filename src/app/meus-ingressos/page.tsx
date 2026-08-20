"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import { useQuery } from "@tanstack/react-query";
import { RoleGate } from "@/features/auth/components/role-gate";
import { ticketsApi } from "@/features/tickets/api/tickets-api";
import { TicketCard } from "@/features/tickets/components/ticket-card";

function MyTicketsList() {
  const { data, isLoading } = useQuery({
    queryKey: ["tickets", "mine"],
    queryFn: () => ticketsApi.listMine(),
  });

  if (isLoading || !data) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (data.data.length === 0) {
    return <Typography>Você ainda não tem ingressos.</Typography>;
  }

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
      {data.data.map((ticket) => (
        <TicketCard key={ticket.ticket.id} ticket={ticket} />
      ))}
    </Box>
  );
}

export default function MyTicketsPage() {
  return (
    <main className="flex-1 p-8">
      <RoleGate role="client">
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <Typography variant="h4" component="h1">
            Meus ingressos
          </Typography>
          <MyTicketsList />
        </Box>
      </RoleGate>
    </main>
  );
}
