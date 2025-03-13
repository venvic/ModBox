import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";
import Redis from "ioredis";
import { getFirestore } from "firebase-admin/firestore";

const redis = new Redis({
    host: process.env.NEXT_PUBLIC_UPSTASH_ENDPOINT,
    port: Number(process.env.NEXT_PUBLIC_UPSTASH_PORT),
    password: process.env.NEXT_PUBLIC_UPSTASH_PASSWORD,
    maxRetriesPerRequest: 5,
    enableAutoPipelining: true,
    connectTimeout: 1500,
});

const CACHE_TTL = 1800; // Cache expiry in seconds (30 min)

const firebaseServiceAccount = process.env.NEXT_PUBLIC_SERVICE_ACCOUNT;

if (!firebaseServiceAccount) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is not set in environment variables.");
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(firebaseServiceAccount)),
    });
}

const db = getFirestore();

export async function GET(req: NextRequest) {
    const path = req.nextUrl.searchParams.get("path");
    const collectionName = req.nextUrl.searchParams.get("collection");
    const field = req.nextUrl.searchParams.get("field");
    const value = req.nextUrl.searchParams.get("value");

    if (!path && !(collectionName && field && value)) {
        return NextResponse.json({ error: "Provide either a path or a query." }, { status: 400 });
    }

    let cacheKey = path ? `firestore:${path}` : `query:${collectionName}:${field}:${value}`;

    // Listen for Redis errors, but don’t block the flow
    let redisAvailable = true;
    redis.on("error", (err) => {
        console.error("Redis Connection Error:", err);
        redisAvailable = false;
    });

    try {
        // 1️⃣ Check Redis cache only if Redis is available
        let cachedData;
        if (redisAvailable) {
            try {
                cachedData = await redis.get(cacheKey);
            } catch (err) {
                console.error("Redis fetch error:", err);
                redisAvailable = false; // Disable Redis for this request if fetch fails
            }
        }

        if (cachedData) {
            return NextResponse.json(JSON.parse(cachedData), { status: 200 });
        }

        let responseData;

        if (path) {
            // 2️⃣ Fetch document by path (Only Allows `/product/...`)
            if (!path.startsWith("product/")) {
                return NextResponse.json({ error: "Invalid path. Only /product/... is allowed" }, { status: 403 });
            }

            const docRef = db.doc(path);
            const docSnap = await docRef.get();

            if (!docSnap.exists) {
                return NextResponse.json({ error: "Document not found" }, { status: 404 });
            }

            responseData = { id: docSnap.id, ...docSnap.data() };
        } else {
            // 3️⃣ Query Firestore dynamically (Only Allowed Under `/product/`)
            if (collectionName !== "product") {
                return NextResponse.json({ error: "Only queries under 'product' are allowed." }, { status: 403 });
            }

            const collectionRef = db.collection(collectionName);
            if (!field || !value) {
                return NextResponse.json({ error: "Field and value must be provided for querying." }, { status: 400 });
            }
            const q = collectionRef.where(field, "==", value);
            const snapshot = await q.get();

            if (snapshot.empty) {
                return NextResponse.json({ error: "No matching documents found" }, { status: 404 });
            }

            responseData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }

        // 4️⃣ Store result in Redis cache only if Redis is available
        if (redisAvailable) {
            try {
                await redis.set(cacheKey, JSON.stringify(responseData), "EX", CACHE_TTL);
            } catch (err) {
                console.error("Failed to cache data in Redis:", err);
            }
        }

        return NextResponse.json(responseData, { status: 200 });

    } catch (error) {
        console.error("Error fetching data:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
