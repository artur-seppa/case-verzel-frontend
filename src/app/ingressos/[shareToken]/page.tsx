export default async function SharedTicketPage({
  params,
}: PageProps<"/ingressos/[shareToken]">) {
  const { shareToken } = await params;

  return (
    <main className="flex-1 p-8">
      <h1 className="text-2xl font-semibold">Ingresso compartilhado {shareToken}</h1>
    </main>
  );
}
