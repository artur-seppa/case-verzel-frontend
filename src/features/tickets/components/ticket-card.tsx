"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import ShareIcon from "@mui/icons-material/Share";
import { TicketDetail } from "../types";
import { useToast } from "@/shared/ui/toast-provider";
import { formatEventDate } from "@/shared/utils/format-date";

function shareUrl(shareToken: string): string {
  return `${window.location.origin}/ingressos/${shareToken}`;
}

export function TicketCard({ ticket }: { ticket: TicketDetail }) {
  const { showToast } = useToast();
  const [showQrCode, setShowQrCode] = useState(false);

  async function handleShare() {
    const url = shareUrl(ticket.ticket.shareToken);
    if (navigator.share) {
      try {
        await navigator.share({ title: ticket.event.title, url });
      } catch {
        // Usuário cancelou o compartilhamento nativo — não é um erro a reportar.
      }
      return;
    }
    await navigator.clipboard.writeText(url);
    showToast("Link do ingresso copiado!", "success");
  }

  return (
    <Card
      sx={(theme) => ({
        width: "100%",
        p: 3,
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
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
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
          {formatEventDate(ticket.event.date)} · {ticket.event.location}
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
      </CardContent>

      <CardActions sx={{ justifyContent: "center", gap: 1, pb: 2 }}>
        <Button
          size="small"
          startIcon={<QrCode2Icon />}
          onClick={() => setShowQrCode((current) => !current)}
        >
          {showQrCode ? "Ocultar QR Code" : "Ver QR Code"}
        </Button>
        <Button size="small" startIcon={<ShareIcon />} onClick={handleShare}>
          Compartilhar
        </Button>
      </CardActions>

      {showQrCode ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1,
            pb: 2,
            // O QR precisa da própria zona clara pra ser lido — então vira um selo impresso.
            "& > svg": {
              p: 1.25,
              borderRadius: 1,
              backgroundColor: "#fff",
            },
          }}
        >
          <QRCodeSVG value={ticket.ticket.qrToken} size={200} />
          <Typography
            color="text.secondary"
            sx={{
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: "0.75rem",
              letterSpacing: "0.04em",
              wordBreak: "break-all",
              textAlign: "center",
              px: 2,
            }}
          >
            {ticket.ticket.qrToken}
          </Typography>
        </Box>
      ) : null}
    </Card>
  );
}
