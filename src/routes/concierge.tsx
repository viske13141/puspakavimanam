import { createFileRoute } from "@tanstack/react-router";
import { ContactPublicPage } from "@/components/public/ContactPublicPage";

export const Route = createFileRoute("/concierge")({
  head: () => ({
    meta: [
      { title: "Contact HELITEJET — Aviation Enquiries" },
      {
        name: "description",
        content: "Send HELITEJET a charter or aviation experience enquiry.",
      },
      { property: "og:title", content: "Contact HELITEJET" },
      {
        property: "og:description",
        content: "Contact HELITEJET about your aviation travel plans.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ContactPublicPage,
});
