import { createContext, useContext, useMemo, useReducer, useState, type ReactNode } from "react";
import { createDemoData, createOperatorData } from "./fixtures";
import { canApplyCompanyAction, companyData, reducer, type Action, type State } from "./model";
export type Mode = "operations" | "operator";
interface Workspace {
  state: State;
  dispatch: (action: Action) => void;
  mode: Mode;
  company: string;
  setCompany: (id: string) => void;
  companies: { id: string; name: string }[];
}
const Context = createContext<Workspace | null>(null);
export function WorkspaceProvider({ children, mode }: { children: ReactNode; mode: Mode }) {
  const [raw, send] = useReducer(reducer, undefined, () => ({
    data: mode === "operator" ? createOperatorData() : createDemoData(),
    revision: 0,
  }));
  const [company, setCompany] = useState("OP-001");
  const state = useMemo(
    () => ({ ...raw, data: mode === "operator" ? companyData(raw.data, company) : raw.data }),
    [raw, mode, company],
  );
  function dispatch(action: Action) {
    if (mode === "operator") {
      if (!canApplyCompanyAction(raw.data, company, action))
        throw new Error("This demo action is outside the active company's scope.");
      if (action.type === "read-all") {
        state.data.notifications.forEach((n) =>
          send({
            type: "patch",
            kind: "notifications",
            id: n.id,
            status: "Read",
            message: "Marked read",
          }),
        );
        return;
      }
    }
    send(action);
  }
  return (
    <Context.Provider
      value={{
        state,
        dispatch,
        mode,
        company,
        setCompany,
        companies: raw.data.operators.map((o) => ({ id: o.id, name: o.name })),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useOperations() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("WorkspaceProvider is required");
  return ctx;
}
