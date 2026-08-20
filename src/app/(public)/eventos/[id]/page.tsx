import { eventsApi } from "@/features/events/api/events-api";
import { EventDetailView } from "@/features/events/components/event-detail-view";

export default async function EventDetailPage({ params }: PageProps<"/eventos/[id]">) {
  const { id } = await params;
  const event = await eventsApi.get(id);

  return (
    <main className="flex-1 p-8">
      <EventDetailView event={event} />
    </main>
  );
}
