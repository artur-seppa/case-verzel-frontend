import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { RoleGate } from "@/features/auth/components/role-gate";
import { GatekeeperView } from "@/features/gatekeeper/components/gatekeeper-view";

export default function GatekeeperPage() {
  return (
    <main className="flex-1 p-8">
      <RoleGate role="gatekeeper">
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <Typography variant="h4" component="h1">
            Portaria
          </Typography>
          <GatekeeperView />
        </Box>
      </RoleGate>
    </main>
  );
}
