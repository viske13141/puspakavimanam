import { Overview, Directory } from "../aviation/pages";
import { Schedule } from "../aviation/schedule";
import { Assignments, Checkin, Monitoring, Preparation } from "../aviation/workflows";
import { ProfilePage, Reports } from "../aviation/management";
export function OperationsPage({ page }: { page: string }) {
  if (page === "dashboard") return <Overview />;
  if (page === "schedule") return <Schedule />;
  if (page === "assignments") return <Assignments />;
  if (page === "preparation") return <Preparation />;
  if (page === "checkin") return <Checkin />;
  if (page === "monitoring") return <Monitoring />;
  if (page === "reports") return <Reports />;
  if (page === "profile") return <ProfilePage />;
  return <Directory key={page} page={page} />;
}
