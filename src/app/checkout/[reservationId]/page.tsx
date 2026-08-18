export default async function CheckoutPage({
  params,
}: PageProps<"/checkout/[reservationId]">) {
  const { reservationId } = await params;

  return (
    <main className="flex-1 p-8">
      <h1 className="text-2xl font-semibold">Pagamento — reserva {reservationId}</h1>
    </main>
  );
}
