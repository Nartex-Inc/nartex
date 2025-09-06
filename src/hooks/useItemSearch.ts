import * as React from "react";

export function useItemSearch() {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<{id:number;code:string;label:string}[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/items/search?q=${encodeURIComponent(query)}&limit=10`);
        const j = await r.json();
        setResults(j.items || []);
      } finally { setLoading(false); }
    }, 250); // debounce
    return () => clearTimeout(t);
  }, [query]);

  return { query, setQuery, results, loading };
}
