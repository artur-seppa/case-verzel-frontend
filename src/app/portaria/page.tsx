import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { RoleGate } from "@/features/auth/components/role-gate";
import { GatekeeperView } from "@/features/gatekeeper/components/gatekeeper-view";

export default function GatekeeperPage() {
  return (
    <Box
      component="main"
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 3,
      }}
    >
      <RoleGate role="gatekeeper">
        <Card sx={{ width: "100%", maxWidth: 560 }}>
          <CardContent sx={{ p: 4, display: "flex", flexDirection: "column", gap: 3 }}>
            <Typography variant="h4" component="h1" sx={{ textAlign: "center" }}>
              Portaria
            </Typography>
            <GatekeeperView />
          </CardContent>
        </Card>
      </RoleGate>
    </Box>
  );
}
