"use client";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge"; // Import Badge

// Hardcoded product requests data
const productRequests = [
  {
    id: "PR001",
    productName: "Eco-Friendly Water Bottle",
    requestedBy: "Alice Wonderland",
    dateRequested: "2023-10-01",
    status: "Pending",
  },
  {
    id: "PR002",
    productName: "Smart Home Hub Mini",
    requestedBy: "Bob The Builder",
    dateRequested: "2023-10-05",
    status: "Approved",
  },
  {
    id: "PR003",
    productName: "Wireless Noise-Cancelling Headphones",
    requestedBy: "Carol Danvers",
    dateRequested: "2023-10-12",
    status: "In Progress",
  },
  {
    id: "PR004",
    productName: "Organic Cotton T-Shirt",
    requestedBy: "David Copperfield",
    dateRequested: "2023-10-15",
    status: "Rejected",
  },
  {
    id: "PR005",
    productName: "Portable Solar Charger",
    requestedBy: "Eve Harrington",
    dateRequested: "2023-10-20",
    status: "Completed",
  },
];

const getStatusBadgeVariant = (status: string) => {
  switch (status.toLowerCase()) {
    case 'approved':
    case 'completed':
      return 'default'; // Or use 'success' if you define a custom success variant
    case 'pending':
      return 'secondary';
    case 'in progress':
      return 'outline'; // Or a custom 'warning' variant
    case 'rejected':
      return 'destructive';
    default:
      return 'outline';
  }
};


export function ProductRequestsTable() {
  return (
    <div className="rounded-lg border shadow-sm bg-card">
      <Table>
        <TableCaption>A list of your recent product requests.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">ID</TableHead>
            <TableHead>Product Name</TableHead>
            <TableHead>Requested By</TableHead>
            <TableHead>Date Requested</TableHead>
            <TableHead className="text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {productRequests.map((request) => (
            <TableRow key={request.id}>
              <TableCell className="font-medium">{request.id}</TableCell>
              <TableCell>{request.productName}</TableCell>
              <TableCell>{request.requestedBy}</TableCell>
              <TableCell>{request.dateRequested}</TableCell>
              <TableCell className="text-right">
                <Badge variant={getStatusBadgeVariant(request.status)}>
                  {request.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}