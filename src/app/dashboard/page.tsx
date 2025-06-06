import { WelcomeBanner } from "@/components/welcome-banner";
import { ProductRequestsTable } from "@/components/product-requests-table";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <WelcomeBanner />
      <div>
        <h2 className="text-xl font-semibold mb-4">Product Requests</h2>
        <ProductRequestsTable />
      </div>
    </div>
  );
}