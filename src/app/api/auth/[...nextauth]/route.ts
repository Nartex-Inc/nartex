// NextAuth route handler for the App Router (NextAuth v4 style)
import NextAuth from "next-auth";
import { authOptions } from "@/auth";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
