"use client";

import Link from "next/link";
import { NewProductRequest, NewProductRequestStatus } from "@/lib/types";

const getStatusColorClasses = (status: NewProductRequestStatus) => {
    switch (status) {
      case NewProductRequestStatus.ACCEPTE:
        return `bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-l-4 border-green-500`;
      case NewProductRequestStatus.REFUSE:
        return `bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-l-4 border-red-500`;
      default:
        return `bg-gray-100 dark:bg-gray-700/40 text-gray-600 dark:text-gray-300 border-l-4 border-gray-400 dark:border-gray-500`;
    }
};

export function NewProductRequestsTable({ requests }: { requests: NewProductRequest[] }) {
  if (!requests || requests.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-3">Demandes de Nouveaux Produits</h2>
        <p className="text-gray-600 dark:text-gray-400">Aucune demande.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
      <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Demandes de Nouveaux Produits</h2>
        <Link href="/dashboard/new-product-requests/all" className="text-sm font-medium text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors">
          Voir tout →
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr className="border-b border-gray-200 dark:border-gray-600">
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nom du Projet</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Demandeur</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date Soumission</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Statut</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {requests.slice(0, 5).map((req) => (
              <tr key={req.id} className={`${getStatusColorClasses(req.status)} hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors duration-150`}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{req.projectName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{req.initiator}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{new Date(req.submissionDate).toLocaleDateString('fr-CA')}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    req.status === NewProductRequestStatus.ACCEPTE
                      ? 'bg-green-100 dark:bg-green-600/20 text-green-700 dark:text-green-300'
                      : req.status === NewProductRequestStatus.REFUSE
                      ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300'
                      : 'bg-gray-200 dark:bg-gray-600/40 text-gray-700 dark:text-gray-200'
                  }`}>
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