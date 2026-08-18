export default async function EventDetailPage({
  params,
}: PageProps<"/eventos/[id]">) {
  const { id } = await params;

  return (
    <main className="flex-1 p-8">
      <h1 className="text-2xl font-semibold">Evento {id}</h1>
    </main>
  );
}
