import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { EventSummary } from "../types";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(iso),
  );
}

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
      sx={{
        textDecoration: "none",
        width: 240,
        overflow: "hidden",
        transition: "transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease",
        // O cartaz na caixa de luz do saguão: acende quando você chega perto.
        "&:hover": {
          transform: "translateY(-4px)",
          borderColor: "primary.main",
          boxShadow: "0 14px 34px rgba(0, 0, 0, 0.5)",
        },
        "&:hover .MuiCardMedia-root": { filter: "brightness(1.06)" },
        "@media (prefers-reduced-motion: reduce)": {
          transition: "none",
          "&:hover": { transform: "none" },
        },
      }}
    >
      <CardActionArea>
        {event.posterUrl ? (
          <CardMedia
            component="img"
            image={event.posterUrl}
            alt={event.title}
            sx={{
              aspectRatio: "2 / 3",
              filter: "brightness(0.92)",
              transition: "filter 160ms ease",
            }}
          />
        ) : null}
        <CardContent>
          <Typography variant="subtitle1" component="h3">
            {event.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatDate(event.date)} · {event.location}
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
