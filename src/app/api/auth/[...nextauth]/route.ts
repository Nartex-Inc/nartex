// src/app/api/auth/[...nextauth]/route.ts

// The auth file is now at the root. We go up 5 levels to reach it.
import { handlers } from "../../../../../auth";

export const { GET, POST } = handlers;
