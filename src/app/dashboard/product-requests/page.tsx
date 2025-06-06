import { ProductRequestsTable } from "@/components/product-requests-table";

export default function ProductRequestsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">All Product Requests</h1>
      <ProductRequestsTable />
    </div>
  );
}