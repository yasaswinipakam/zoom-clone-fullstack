import { redirect } from "next/navigation";

// Zoom's app goes straight to the home/dashboard — no marketing landing page
export default function Home() {
  redirect("/dashboard");
}
