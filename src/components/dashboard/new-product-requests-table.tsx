// src/components/dashboard/new-product-requests-table.tsx

"use client";

import Link from "next/link";
import { NewProductRequest, NewProductRequestStatus } from "@/lib/types";
import { cn } from "@/lib/utils"; // Import cn utility

// Refined color logic for bolder, more accessible colors
const getStatusRowClass = (status: NewProductRequestStatus) => {
  switch (status) {
    case NewProductRequestStatus.ACCEPTE:
      // Bolder green that works in both light and dark mode
      return "bg-green-500/10 dark:bg-green-500/20 text-green-800 dark:text-green-300";
    case NewProductRequestStatus.REFUSE:
      // Bolder red
      return "bg-red-500/10 dark:bg-red-500/20 text-red-800 dark:text-red-300";
    default:
      return "bg-background hover:bg-muted/50";
  }
};

export function NewProductRequestsTable({ requests }: { requests: NewProductRequest[] }) {
  if (!requests || requests.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-5 text-card-foreground shadow-sm">
        <h2 className="text-xl font-semibold">Demandes de Nouveaux Produits</h2>
        <p className="mt-2 text-muted-foreground">Aucune demande.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="p-5 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Demandes de Nouveaux Produits</h2>
        <Link href="/dashboard/product-requests" className="text-sm font-medium text-primary hover:underline">
          Voir tout →
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="border-b">
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">NOM DU PROJET</th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">DEMANDEUR</th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">DATE SOUMISSION</th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">STATUT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {requests.slice(0, 5).map((req) => (
              <tr key={req.id} className={cn("transition-colors", getStatusRowClass(req.status))}>
                <td className="p-4 align-middle font-medium text-foreground">{req.projectName}</td>
                <td className="p-4 align-middle text-muted-foreground">{req.initiator}</td>
                <td className="p-4 align-middle text-muted-foreground">{new Date(req.submissionDate).toLocaleDateString('fr-CA')}</td>
                <td className="p-4 align-middle">
                  <span className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    req.status === NewProductRequestStatus.ACCEPTE && "bg-green-500/20 text-green-900 dark:text-green-200",
                    req.status === NewProductRequestStatus.REFUSE && "bg-red-500/20 text-red-900 dark:text-red-200",
                    req.status === NewProductRequestStatus.EN_ATTENTE && "bg-amber-500/20 text-amber-900 dark:text-amber-200"
                  )}>
                    {req.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}