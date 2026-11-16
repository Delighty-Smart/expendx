import {
  type Firestore,
  type QueryConstraint,
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";

/**
 * Firestore rejects a query that combines equality filters with `orderBy`
 * unless a matching composite index exists. When that happens the client
 * receives a 400 FAILED_PRECONDITION ("The query requires an index") — which
 * would otherwise surface as an empty list because callers fall back to cache.
 *
 * This helper retries the query without the composite-index-dependent parts so
 * the data still loads, and lets the caller order and filter the rows locally.
 */
export function isMissingIndexError(error: unknown): boolean {
  const message =
    (error as { message?: string } | null)?.message ?? String(error ?? "");

  return /requires an index|FAILED_PRECONDITION/i.test(message);
}

export async function getDocsWithIndexFallback(
  db: Firestore,
  collectionName: string,
  constraints: QueryConstraint[],
  sort: QueryConstraint = orderBy("date", "desc"),
  fallbackConstraints?: QueryConstraint[]
) {
  try {
    return await getDocs(query(collection(db, collectionName), ...constraints, sort));
  } catch (error) {
    if (!isMissingIndexError(error)) throw error;

    // No composite index yet — refetch with only the always-indexed filters.
    const safe = fallbackConstraints ?? constraints;
    return await getDocs(query(collection(db, collectionName), ...safe));
  }
}

export function sortByDateDesc<T extends { date?: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")));
}

type Filterable = {
  archived?: boolean;
  type?: string;
  category?: string;
  date?: string;
};

export function filterTransactions<T extends Filterable>(
  rows: T[],
  filter?: { type?: string; category?: string; includeArchived?: boolean },
  startDate?: string | null,
  endDate?: string | null
): T[] {
  return rows.filter((row) => {
    if (!filter?.includeArchived && row.archived) return false;
    if (filter?.type && filter.type !== "all" && row.type !== filter.type) return false;
    if (filter?.category && filter.category !== "All" && row.category !== filter.category) return false;
    if (startDate && String(row.date ?? "") < startDate) return false;
    if (endDate && String(row.date ?? "") > endDate) return false;
    return true;
  });
}