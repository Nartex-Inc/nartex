import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth"; // <-- Points to the correct file now

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
