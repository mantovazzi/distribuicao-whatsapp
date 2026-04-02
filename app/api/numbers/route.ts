import { NextRequest, NextResponse } from "next/server";
import { redis, NUMBERS_KEY } from "@/lib/redis";

export async function GET() {
  try {
    const numbers = await redis.lrange(NUMBERS_KEY, 0, -1);
    return NextResponse.json({ numbers });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { number } = await req.json();

    if (!number || !/^\d{10,}$/.test(number)) {
      return NextResponse.json(
        { error: "Número inválido. Use apenas dígitos (mínimo 10)." },
        { status: 400 }
      );
    }

    await redis.rpush(NUMBERS_KEY, number);
    const numbers = await redis.lrange(NUMBERS_KEY, 0, -1);
    return NextResponse.json({ numbers });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { number } = await req.json();

    if (!number) {
      return NextResponse.json(
        { error: "Número é obrigatório" },
        { status: 400 }
      );
    }

    await redis.lrem(NUMBERS_KEY, 0, number);
    const numbers = await redis.lrange(NUMBERS_KEY, 0, -1);
    return NextResponse.json({ numbers });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { numbers } = await req.json();

    if (!Array.isArray(numbers)) {
      return NextResponse.json(
        { error: "Payload inválido" },
        { status: 400 }
      );
    }

    const pipeline = redis.pipeline();
    pipeline.del(NUMBERS_KEY);
    if (numbers.length > 0) {
      pipeline.rpush(NUMBERS_KEY, ...numbers);
    }
    await pipeline.exec();

    return NextResponse.json({ numbers });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
