import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { ticketsApi } from "@/features/tickets/api/tickets-api";
import { TicketCard } from "@/features/tickets/components/ticket-card";

export const dynamic = "force-dynamic";

export default async function SharedTicketPage({
  params,
}: PageProps<"/ingressos/[shareToken]">) {
  const { shareToken } = await params;
  const ticket = await ticketsApi.getShared(shareToken);

  return (
    <Box component="main" sx={{ flex: 1, p: 4, display: "flex", flexDirection: "column", gap: 3 }}>
      <Typography variant="h4" component="h1">
        Ingresso compartilhado
      </Typography>
      <TicketCard ticket={ticket} />
    </Box>
  );
}
