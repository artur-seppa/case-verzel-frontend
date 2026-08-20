import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { RoleGate } from "@/features/auth/components/role-gate";
import { CreateEventForm } from "@/features/events/components/create-event-form";

export default function NewEventPage() {
  return (
    <main className="flex-1 p-8">
      <RoleGate role="organizer">
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <Typography variant="h4" component="h1">
            Novo evento
          </Typography>
          <CreateEventForm />
        </Box>
      </RoleGate>
    </main>
  );
}
