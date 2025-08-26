export default async function PollDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-3xl w-full py-10">
      <h1 className="text-2xl font-semibold mb-2">Poll #{id}</h1>
      <p className="text-sm text-foreground/70">Placeholder for poll details and voting UI.</p>
    </div>
  );
}


