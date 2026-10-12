import { createFileRoute } from "@tanstack/react-router";
import { ExperiencesPublicPage } from "@/components/public/ExperiencesPublicPage";

export const Route = createFileRoute("/experiences")({
  head: () => ({
    meta: [
      { title: "Events & Experiences — HELITEJET" },
      {
        name: "description",
        content:
          "Share your event plans, timing, location and aviation requirements through the HELITEJET customer Events workflow.",
      },
      { property: "og:title", content: "Events & Experiences — HELITEJET" },
      {
        property: "og:description",
        content: "A single customer workflow for event and aviation enquiries.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ExperiencesPublicPage,
});
