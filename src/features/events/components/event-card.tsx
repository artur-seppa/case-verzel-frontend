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
    <Card component={Link} href={`/eventos/${event.id}`} sx={{ textDecoration: "none", width: 240 }}>
      <CardActionArea>
        {event.posterUrl ? (
          <CardMedia
            component="img"
            image={event.posterUrl}
            alt={event.title}
            sx={{ aspectRatio: "2 / 3" }}
          />
        ) : null}
        <CardContent>
          <Typography variant="subtitle1" component="h3">
            {event.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatDate(event.date)} · {event.location}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatPrice(event.price)}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
