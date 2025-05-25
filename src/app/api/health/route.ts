// src/app/api/health/route.ts
export async function GET() {
    return new Response(JSON.stringify({ healthy: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  