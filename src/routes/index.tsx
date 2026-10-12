import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/components/public/HomePage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HELITEJET — Private Aviation Charter" },
      { name: "description", content: "Premium helicopter and private jet charter experiences, thoughtfully arranged around your journey." },
      { property: "og:title", content: "HELITEJET — Private Aviation Charter" },
      { property: "og:description", content: "Premium helicopter and private jet charter experiences, thoughtfully arranged around your journey." },
      { property: "og:type", content: "website" },
      { name: "theme-color", content: "#ffffff" },
    ],
  }),
  component: HomePage,
});
