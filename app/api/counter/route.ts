import { NextResponse } from "next/server";
import { redis, COUNTER_KEY } from "@/lib/redis";

export async function DELETE() {
  try {
    await redis.set(COUNTER_KEY, 0);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
