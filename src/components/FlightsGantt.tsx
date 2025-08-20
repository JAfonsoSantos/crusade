import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Props = { companyId: string };

export default function FlightsGantt({ companyId }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("v_flights_gantt")
        .select("*")
        .eq("company_id", companyId);

      if (!error) setRows(data ?? []);
      setLoading(false);
    }
    if (companyId) load();
  }, [companyId]);

  if (loading) return <div>Loading timeline…</div>;
  if (!rows.length) return <div>No flights found.</div>;

  return (
    <div className="w-full">
      <pre className="text-xs">{JSON.stringify(rows, null, 2)}</pre>
      {/* aqui substituis depois pelo teu Gantt chart UI */}
    </div>
  );
}