import { Overview, Directory } from "../aviation/pages";
import { Schedule } from "../aviation/schedule";
import { Monitoring, Preparation } from "../aviation/workflows";
import { Messages, ProfilePage, Reports } from "../aviation/management";
export function OperatorPage({ page }: { page: string }) {
  if (page === "dashboard") return <Overview />;
  if (page === "availability") return <Schedule availability />;
  if (page === "schedule") return <Schedule />;
  if (page === "preparation") return <Preparation />;
  if (page === "flights") return <Monitoring />;
  if (page === "messages") return <Messages />;
  if (page === "reports") return <Reports />;
  if (page === "profile") return <ProfilePage />;
  return <Directory key={page} page={page} />;
}
