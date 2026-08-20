import { QRCodeSVG } from "qrcode.react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import { TicketDetail } from "../types";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(iso),
  );
}

export function TicketCard({ ticket }: { ticket: TicketDetail }) {
  return (
    <Card sx={{ maxWidth: 360, p: 2 }}>
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1, alignItems: "center" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
          <Typography variant="h6" component="h3">
            {ticket.event.title}
          </Typography>
          <Chip
            label={ticket.ticket.status === "used" ? "Utilizado" : "Válido"}
            color={ticket.ticket.status === "used" ? "default" : "success"}
            size="small"
          />
        </Box>
        <Typography color="text.secondary">
          {formatDate(ticket.event.date)} · {ticket.event.location}
        </Typography>
        <Typography>Assento {ticket.seat.label}</Typography>
        <QRCodeSVG value={ticket.ticket.qrToken} size={200} />
      </CardContent>
    </Card>
  );
}
