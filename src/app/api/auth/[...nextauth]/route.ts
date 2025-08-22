// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth"; // <-- Import from the new root auth.ts file
export const { GET, POST } = handlers;
