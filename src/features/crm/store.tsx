import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { createFixtures } from "./fixtures";
import { mockRepository } from "./repository";
import type { CrmData } from "./model";
type Store = {
  data: CrmData;
  loading: boolean;
  error: string;
  busy: boolean;
  mutate: (fn: (draft: CrmData) => void, message?: string) => Promise<boolean>;
  retry: () => void;
  failNext: () => void;
};
const Context = createContext<Store | null>(null);
export function CrmProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(createFixtures);
  const ref = useRef(data);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const failure = useRef(false);
  const retry = () => {
    setLoading(true);
    mockRepository
      .load()
      .then((d) => {
        ref.current = d;
        setData(d);
        setError("");
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  };
  useEffect(retry, []);
  const mutate = async (fn: (draft: CrmData) => void, message = "Saved locally") => {
    if (lock.current) {
      toast.error("Please wait for the current change to finish.");
      return false;
    }
    if (error) {
      toast.error("Resolve the storage error before making changes.");
      return false;
    }
    lock.current = true;
    setBusy(true);
    const old = ref.current;
    try {
      const next = structuredClone(old);
      fn(next);
      ref.current = next;
      setData(next);
      await Promise.resolve();
      if (failure.current) {
        failure.current = false;
        throw new Error("Simulated save failure. Your change was rolled back.");
      }
      await mockRepository.save(next);
      if (message) toast.success(message);
      return true;
    } catch (e) {
      ref.current = old;
      setData(old);
      toast.error(e instanceof Error ? e.message : "Unable to save. Changes rolled back.");
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <Context.Provider
      value={{
        data,
        loading,
        error,
        busy,
        mutate,
        retry,
        failNext: () => {
          failure.current = true;
          toast.info("The next save will fail to demonstrate rollback.");
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useCrm() {
  const value = useContext(Context);
  if (!value) throw new Error("CRM provider missing");
  return value;
}
