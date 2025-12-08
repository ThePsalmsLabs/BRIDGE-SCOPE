"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchSubgraph } from "@/lib/subgraph";

export function useSubgraph<TData = unknown>(endpoint: string, query: string, variables?: Record<string, unknown>) {
  return useQuery({
    queryKey: ["subgraph", endpoint, query, variables],
    queryFn: () => fetchSubgraph<TData>(endpoint, query, variables),
    enabled: Boolean(endpoint && query),
  });
}

