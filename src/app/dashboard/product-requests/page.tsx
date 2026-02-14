"use client";

// FIX: Change 'ProductRequestsTable' to 'NewProductRequestsTable'
import { NewProductRequestsTable } from "@/components/dashboard/new-product-requests-table";
import { mockNewProductRequestsData } from "@/lib/data"; // Assuming you want to use the mock data here

export default function ProductRequestsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-[hsl(var(--text-primary))]">Demandes de nouveaux produits</h1>
      {/* 
        You are now correctly importing the component.
        You can use it here and pass the required 'requests' prop.
      */}
      <NewProductRequestsTable requests={mockNewProductRequestsData} />
    </div>
  );
}