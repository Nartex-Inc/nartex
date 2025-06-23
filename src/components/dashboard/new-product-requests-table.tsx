// src/components/dashboard/new-product-requests-table.tsx
"use client";

import Link from "next/link";
import { NewProductRequest, NewProductRequestStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const getStatusBadgeVariant = (status: NewProductRequestStatus): "default" | "destructive" | "outline" | "secondary" => {
  switch (status) {
    case NewProductRequestStatus.ACCEPTE:
      return "default";
    case NewProductRequestStatus.REFUSE:
      return "destructive";
    case NewProductRequestStatus.EN_ATTENTE:
      return "secondary";
    default:
      return "outline";
  }
};

export function NewProductRequestsTable({ requests }: { requests: NewProductRequest[] }) {
  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
      <div className="p-5 flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Demandes de Nouveaux Produits</h2>
        <Link href="/dashboard/product-requests" className="text-sm font-medium text-primary hover:underline">
          Voir tout →
        </Link>
      </div>
      <div className="border-t">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">NOM DU PROJET</TableHead>
              <TableHead>DEMANDEUR</TableHead>
              <TableHead>DATE SOUMISSION</TableHead>
              <TableHead className="text-right">STATUT</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.slice(0, 5).map((req) => (
              <TableRow key={req.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">{req.projectName}</TableCell>
                <TableCell className="text-muted-foreground">{req.initiator}</TableCell>
                <TableCell className="text-muted-foreground">{new Date(req.submissionDate).toLocaleDateString('fr-CA')}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={getStatusBadgeVariant(req.status)}>{req.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div> {/* <-- THIS IS THE FIX: The missing closing div tag is added here */}
    </div>
  );
}
