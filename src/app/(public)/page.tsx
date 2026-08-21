import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { eventsApi } from "@/features/events/api/events-api";
import { EventsCarousel } from "@/features/events/components/events-carousel";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const { data: events } = await eventsApi.list(1, 100);

  return (
    <Box component="main" sx={{ flex: 1, p: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Eventos
      </Typography>
      {events.length === 0 ? (
        <Typography>Nenhum evento publicado no momento.</Typography>
      ) : (
        <EventsCarousel events={events} />
      )}
    </Box>
  );
}
