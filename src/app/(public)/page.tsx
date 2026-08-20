import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { eventsApi } from "@/features/events/api/events-api";
import { EventCard } from "@/features/events/components/event-card";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const { data: events } = await eventsApi.list();

  return (
    <Box component="main" sx={{ flex: 1, p: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Eventos
      </Typography>
      {events.length === 0 ? (
        <Typography>Nenhum evento publicado no momento.</Typography>
      ) : (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </Box>
      )}
    </Box>
  );
}
