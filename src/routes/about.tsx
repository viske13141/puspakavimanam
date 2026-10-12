import { createFileRoute } from "@tanstack/react-router";
import { AboutPublicPage } from "@/components/public/AboutPublicPage";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About HELITEJET — Aviation Charter Enquiries" },
      {
        name: "description",
        content:
          "Explore HELITEJET aviation charter enquiry, aircraft catalogue and customer request workflows.",
      },
      { property: "og:title", content: "About HELITEJET" },
      {
        property: "og:description",
        content: "Learn how to submit and continue an aviation charter enquiry.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: AboutPublicPage,
});
