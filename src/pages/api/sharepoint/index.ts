import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";

const EDITOR_ROLES = new Set(["ceo", "admin", "ti-exec", "direction-exec"]);

async function requireTenantApi(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions as any);
  if (!session?.user?.id) {
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }
  const userTenant = await prisma.userTenant.findFirst({
    where: { userId: (session.user as any).id },
    select: { tenantId: true },
  });
  if (!userTenant) {
    res.status(404).json({ error: "Tenant not found" });
    return null;
  }
  return { tenantId: userTenant.tenantId, session };
}

// GET /api/sharepoint  -> all nodes for the tenant
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const mech = await requireTenantApi(req, res);
  if (!mech) return;

  const nodes = await prisma.sharePointNode.findMany({
    where: { tenantId: mech.tenantId },
    orderBy: [{ parentId: "asc" }, { name: "asc" }],
  });

  return res.status(200).json(nodes);
}
