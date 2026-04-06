import { NextRequest, NextResponse } from "next/server";
import { redis, NUMBERS_KEY, COUNTER_KEY } from "@/lib/redis";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const pipe = redis.pipeline();
    pipe.lrange(NUMBERS_KEY, 0, -1);
    pipe.incr(COUNTER_KEY);
    const [numbers, counter] = await pipe.exec<[string[], number]>();

    if (!numbers || numbers.length === 0) {
      return NextResponse.json(
        { error: "Nenhum número cadastrado" },
        { status: 503 }
      );
    }

    const index = (counter - 1) % numbers.length;
    const number = String(numbers[index]);

    const { searchParams } = req.nextUrl;
    const textParam = searchParams.get("text");

    let message: string;

    if (textParam) {
      message = textParam;
    } else {
      const utmSource = searchParams.get("utm_source") || "";
      const utmCampaign = searchParams.get("utm_campaign") || "";
      const utmContent = searchParams.get("utm_content") || "";
      const utmTerm = searchParams.get("utm_term") || "";

      message = `Olá! Vim do anúncio. src=${utmSource} camp=${utmCampaign} content=${utmContent} term=${utmTerm}`;
    }

    const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

    return NextResponse.redirect(url, 302);
  } catch {
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}
