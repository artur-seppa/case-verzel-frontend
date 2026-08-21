"use client";

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import Link from "next/link";
import { EventSummary } from "../types";
import { formatEventDate } from "@/shared/utils/format-date";

function formatPrice(price: string): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(price),
  );
}

export function EventCard({ event }: { event: EventSummary }) {
  return (
    <Card
      component={Link}
      href={`/eventos/${event.id}`}
      sx={(theme) => ({
        textDecoration: "none",
        width: "100%",
        maxWidth: 340,
        mx: "auto",
        borderRadius: "16px",
        border: `2px solid ${theme.palette.divider}`,
        transition: "transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease",
        // O cartaz na caixa de luz do saguão: acende quando você chega perto.
        "&:hover": {
          transform: "translateY(-4px)",
          borderColor: "primary.main",
          boxShadow: "0 14px 34px rgba(0, 0, 0, 0.5)",
        },
        "&:hover img": { filter: "brightness(1.06)" },
        "@media (prefers-reduced-motion: reduce)": {
          transition: "none",
          "&:hover": { transform: "none" },
        },
      })}
    >
      <CardActionArea>
        {event.posterUrl ? (
          <Box
            sx={{
              position: "relative",
              aspectRatio: "2 / 3",
              borderRadius: "16px 16px 0 0",
              overflow: "hidden",
            }}
          >
            <Image
              src={event.posterUrl}
              alt={event.title}
              fill
              sizes="340px"
              style={{ objectFit: "cover", filter: "brightness(0.92)", transition: "filter 160ms ease" }}
            />
          </Box>
        ) : null}
        <CardContent>
          <Typography variant="subtitle1" component="h3">
            {event.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatEventDate(event.date)} · {event.location}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 0.75,
              fontFamily: "var(--font-geist-mono), monospace",
              fontWeight: 600,
              letterSpacing: "0.02em",
              color: "primary.main",
            }}
          >
            {formatPrice(event.price)}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
