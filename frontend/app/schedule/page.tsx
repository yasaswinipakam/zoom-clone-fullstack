import { redirect } from "next/navigation";

// Schedule meeting is a modal on the dashboard — same as Zoom Mac.
export default function SchedulePage() {
  redirect("/dashboard?schedule=true");
}
