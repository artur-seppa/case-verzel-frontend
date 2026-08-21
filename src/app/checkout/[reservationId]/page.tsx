import Box from "@mui/material/Box";
import { RoleGate } from "@/features/auth/components/role-gate";
import { CheckoutView } from "@/features/reservations/components/checkout-view";

export default async function CheckoutPage({
  params,
}: PageProps<"/checkout/[reservationId]">) {
  const { reservationId } = await params;

  return (
    <Box component="main" sx={{ flex: 1, p: 4 }}>
      <RoleGate role="client">
        <CheckoutView reservationId={reservationId} />
      </RoleGate>
    </Box>
  );
}
