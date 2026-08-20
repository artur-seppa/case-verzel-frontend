import { RoleGate } from "@/features/auth/components/role-gate";
import { CheckoutView } from "@/features/reservations/components/checkout-view";

export default async function CheckoutPage({
  params,
}: PageProps<"/checkout/[reservationId]">) {
  const { reservationId } = await params;

  return (
    <main className="flex-1 p-8">
      <RoleGate role="client">
        <CheckoutView reservationId={reservationId} />
      </RoleGate>
    </main>
  );
}
