// src/app/dashboard/sales-per-rep/page.tsx
import { pg } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Row = { name: string };

const qCamel = `SELECT "Name" AS name FROM public."Salesrep" ORDER BY "Name";`;
const qLower = `SELECT name         AS name FROM salesrep          ORDER BY name;`; // fallback if you ever move to lowercase tables

async function load(): Promise<Row[]> {
  try {
    const { rows } = await pg.query<Row>(qCamel);
    return rows;
  } catch {
    const { rows } = await pg.query<Row>(qLower);
    return rows;
  }
}

export default async function SalesRepsPage() {
  const reps = await load();

  return (
    <main className="p-6 max-w-2xl">
      <h1 className="text-xl font-semibold mb-4">Sales reps</h1>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="text-left border-b py-2">Name</th>
          </tr>
        </thead>
        <tbody>
          {reps.map((r, i) => (
            <tr key={i}>
              <td className="border-b py-2">{r.name}</td>
            </tr>
          ))}

          {reps.length === 0 && (
            <tr>
              <td className="py-6 text-muted-foreground">No reps found</td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
