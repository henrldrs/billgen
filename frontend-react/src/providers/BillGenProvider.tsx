import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useContext, useState, type ReactNode } from "react";

import { ApiClient } from "../lib/apiClient";

const ApiContext = createContext<ApiClient | null>(null);

export function useApi(): ApiClient {
  const client = useContext(ApiContext);
  if (!client) {
    throw new Error("useApi must be used inside <BillGenProvider>");
  }
  return client;
}

export interface BillGenProviderProps {
  client: ApiClient;
  children: ReactNode;
  queryClient?: QueryClient;
}

export function BillGenProvider({ client, children, queryClient }: BillGenProviderProps) {
  const [qc] = useState(
    () =>
      queryClient ??
      new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
      }),
  );
  return (
    <ApiContext.Provider value={client}>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </ApiContext.Provider>
  );
}
