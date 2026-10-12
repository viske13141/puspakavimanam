import type { ReactNode } from "react";
import { WorkspaceProvider } from "../aviation/store";
export { useOperations } from "../aviation/store";
export function OperationsProvider({ children }: { children: ReactNode }) {
  return <WorkspaceProvider mode="operations">{children}</WorkspaceProvider>;
}
