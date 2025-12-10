type SubgraphResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

export async function fetchSubgraph<T>(
  endpoint: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`Subgraph request failed (${res.status}): ${await res.text()}`);
  }

  const json = (await res.json()) as SubgraphResponse<T>;
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('; '));
  }
  if (!json.data) {
    throw new Error('Subgraph response missing data');
  }
  return json.data;
}

export async function fetchSubgraphSafe<T>(
  endpoint: string | undefined,
  query: string,
  variables: Record<string, unknown> | undefined,
  fallback: T
): Promise<T> {
  if (!endpoint) return fallback;
  try {
    return await fetchSubgraph<T>(endpoint, query, variables);
  } catch (err) {
    console.error('Subgraph fetch failed', err);
    return fallback;
  }
}

