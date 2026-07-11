import { redirect } from "next/navigation";

// The Join flow is a modal on the dashboard — same as Zoom Mac.
// Direct navigation to /join redirects to dashboard which opens the modal automatically.
export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const query = new URLSearchParams({ join: "true" });
  if (code) query.set("code", code);
  redirect(`/dashboard?${query}`);
}
