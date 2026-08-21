import Box from "@mui/material/Box";
import { eventsApi } from "@/features/events/api/events-api";
import { EventDetailView } from "@/features/events/components/event-detail-view";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({ params }: PageProps<"/eventos/[id]">) {
  const { id } = await params;
  const event = await eventsApi.get(id);

  return (
    <Box component="main" sx={{ flex: 1, p: 4 }}>
      <EventDetailView event={event} />
    </Box>
  );
}
