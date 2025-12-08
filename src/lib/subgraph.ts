import axios from "axios";

export async function fetchSubgraph<T = unknown>(endpoint: string, query: string, variables?: Record<string, unknown>) {
  const { data } = await axios.post<T>(endpoint, { query, variables });
  return data;
}

