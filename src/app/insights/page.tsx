import { permanentRedirect } from "next/navigation";

/** The Live Insights agent and the AI copilot were unified at /assistant. */
export default function InsightsPage() {
  permanentRedirect("/assistant");
}
