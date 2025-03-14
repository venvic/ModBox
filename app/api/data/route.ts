import { NextRequest, NextResponse } from "next/server";
import Redis from "ioredis";

const redis = new Redis({
    host: process.env.NEXT_PUBLIC_UPSTASH_ENDPOINT,
    port: Number(process.env.NEXT_PUBLIC_UPSTASH_PORT),
    password: process.env.NEXT_PUBLIC_UPSTASH_PASSWORD,
    maxRetriesPerRequest: 5,
    enableAutoPipelining: true,
    connectTimeout: 1500,
});

const CACHE_TTL = 1800;

export async function GET(req: NextRequest) {
    let redisAvailable = true;
    redis.on("error", (err) => {
        console.error("Redis Connection Error:", err);
        redisAvailable = false;
    });

    try {
        if (redisAvailable) {
            try {
                const currentTime = new Date().toISOString();
                await redis.set("latestUpdate", currentTime, "EX", CACHE_TTL);
                return NextResponse.json({ message: "latestUpdate stored successfully", time: currentTime }, { status: 200 });
            } catch (err) {
                console.error("Failed to cache latest update time in Redis:", err);
                return NextResponse.json({ error: "Failed to cache latest update time in Redis" }, { status: 500 });
            }
        } else {
            return NextResponse.json({ error: "Redis is not available" }, { status: 500 });
        }
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
