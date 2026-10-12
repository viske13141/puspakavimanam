import { createFileRoute } from "@tanstack/react-router";
import { DestinationsPublicPage } from "@/components/public/DestinationsPublicPage";

export const Route = createFileRoute("/destinations")({
  head: () => ({
    meta: [
      { title: "Destinations & Routes — HELITEJET" },
      {
        name: "description",
        content:
          "Share your departure point, destination, dates and passenger details for an individual HELITEJET charter enquiry.",
      },
      { property: "og:title", content: "Destinations & Routes — HELITEJET" },
      {
        property: "og:description",
        content: "Explore a destination-focused aviation charter enquiry.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: DestinationsPublicPage,
});
