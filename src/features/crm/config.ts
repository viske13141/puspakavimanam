import {
  LayoutDashboard,
  ChartNoAxesCombined,
  Users,
  Kanban,
  UserRound,
  UserRoundCheck,
  Copy,
  ClipboardList,
  FileText,
  Plane,
  CalendarClock,
  ListTodo,
  Megaphone,
  Share2,
  MessageCircle,
  Globe,
  Plug,
  Inbox,
  Mail,
  MessagesSquare,
  ChartColumn,
  Trophy,
  Download,
  Settings,
  History,
} from "lucide-react";
export const navigation = [
  {
    name: "Overview",
    items: [
      ["dashboard", "Dashboard", LayoutDashboard],
      ["analytics", "Analytics", ChartNoAxesCombined],
    ],
  },
  {
    name: "Leads & customers",
    items: [
      ["leads", "All leads", Users],
      ["pipeline", "Sales pipeline", Kanban],
      ["customers", "Customers", UserRound],
      ["assignments", "Assignments", UserRoundCheck],
      ["duplicates", "Duplicate review", Copy],
    ],
  },
  {
    name: "Sales management",
    items: [
      ["enquiries", "Enquiries", ClipboardList],
      ["quotations", "Quotations", FileText],
      ["bookings", "Bookings", Plane],
      ["followups", "Follow-ups", CalendarClock],
      ["tasks", "Tasks & activities", ListTodo],
    ],
  },
  {
    name: "Marketing & integrations",
    items: [
      ["campaigns", "Campaigns", Megaphone],
      ["social-leads", "Social leads", Share2],
      ["whatsapp-leads", "WhatsApp leads", MessageCircle],
      ["website-leads", "Website leads", Globe],
      ["integrations", "Integrations", Plug],
    ],
  },
  {
    name: "Communication",
    items: [
      ["inbox", "Unified inbox", Inbox],
      ["email-sms", "Email & SMS", Mail],
      ["conversations", "Conversations", MessagesSquare],
    ],
  },
  {
    name: "Insights",
    items: [
      ["reports", "Reports", ChartColumn],
      ["performance", "Sales performance", Trophy],
      ["exports", "Export center", Download],
    ],
  },
  {
    name: "Administration",
    items: [
      ["settings", "CRM settings", Settings],
      ["audit-logs", "Audit logs", History],
    ],
  },
] as const;
export type Page = (typeof navigation)[number]["items"][number][0];
export const pageTitle = (page: string) =>
  navigation.flatMap((g) => [...g.items]).find((i) => i[0] === page)?.[1] ?? "Dashboard";
