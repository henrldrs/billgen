import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
  const [qc] = useState(() => {
    if (queryClient) return queryClient;
    // Alerts are a function of the data, so any successful write may have
    // changed them. One rule here beats an invalidation in every mutation
    // hook — and beats the one that gets forgotten.
    const created: { client: QueryClient | null } = { client: null };
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
      mutationCache: new MutationCache({
        onSuccess: () => {
          void created.client?.invalidateQueries({ queryKey: ["alerts"] });
        },
      }),
    });
    created.client = client;
    return client;
  });
  return (
    <ApiContext.Provider value={client}>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </ApiContext.Provider>
  );
}
