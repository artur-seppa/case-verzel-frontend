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
    <Card
      sx={(theme) => ({
        maxWidth: 360,
        width: "100%",
        p: 2,
        position: "relative",
        overflow: "hidden",
        // Borda picotada: o canhoto destacado na portaria.
        "&::after": {
          content: '""',
          position: "absolute",
          insetInline: 0,
          bottom: -7,
          height: 14,
          background: `radial-gradient(circle at 7px 7px, ${theme.palette.background.default} 6.5px, transparent 7px) 0 0 / 14px 14px repeat-x`,
          pointerEvents: "none",
        },
      })}
    >
      <CardContent
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 1.25,
          alignItems: "center",
          // O QR precisa da própria zona clara pra ser lido — então vira um selo impresso.
          "& > svg": {
            mt: 0.5,
            p: 1.25,
            borderRadius: 1,
            backgroundColor: "#fff",
          },
        }}
      >
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
        <Typography
          sx={{
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: "0.875rem",
            letterSpacing: "0.08em",
          }}
        >
          Assento {ticket.seat.label}
        </Typography>
        <QRCodeSVG value={ticket.ticket.qrToken} size={200} />
      </CardContent>
    </Card>
  );
}
