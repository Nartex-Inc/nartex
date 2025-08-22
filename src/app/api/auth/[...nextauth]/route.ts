// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth"; // This import will now work
export const { GET, POST } = handlers;
