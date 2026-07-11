export default async function MeetingRoom({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  return (
    <main>
      <h1>Meeting Room</h1>
      <p>Meeting code: {code}</p>
      <p>Meeting room — TODO: Participant grid, toolbar, panels</p>
    </main>
  );
}
