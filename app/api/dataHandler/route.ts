import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const serviceAccount = JSON.parse(process.env.NEXT_PUBLIC_SERVICE_ACCOUNT || '{}');

let db: FirebaseFirestore.Firestore;

function initializeFirebase() {
    if (!getApps().length) {
        initializeApp({
            credential: cert(serviceAccount),
        });
    }
    db = getFirestore();
}

async function requestDelete(productId: string, moduleId?: string) {
    initializeFirebase();
    const productRef = db.collection('product').doc(productId);
    const moduleRef = moduleId ? productRef.collection('modules').doc(moduleId) : null;

    const productDoc = await productRef.get();
    if (!productDoc.exists) {
        console.error(`Product with ID ${productId} does not exist.`);
        return false;
    }

    if (moduleId) {
        const moduleDoc = await moduleRef!.get();
        if (!moduleDoc.exists) {
            console.error(`Module with ID ${moduleId} does not exist.`);
            return false;
        }
    }

    return true;
}

async function executeDelete(productId: string, moduleId?: string) {
    initializeFirebase();
    const productRef = db.collection('product').doc(productId);
    const moduleRef = moduleId ? productRef.collection('modules').doc(moduleId) : null;

    if (moduleId) {
        await moduleRef!.delete();
    } else {
        await productRef.delete();
    }

    return true;
}

async function logDeletion(userId: string, action: string, productId: string, moduleId?: string) {
    initializeFirebase();
    const logEntry = {
        uid: userId,
        action: action,
        itemId: productId,
        extra: moduleId || '',
        timestamp: new Date().toISOString()
    };

    const logDate = new Date().toISOString().split('T')[0];
    const logRef = db.collection('logs').doc(logDate);

    await logRef.set({
        date: logDate,
        logs: FieldValue.arrayUnion(logEntry)
    }, { merge: true });
}

export async function GET(req: NextRequest) {
    initializeFirebase();
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            console.error("Authorization header is missing");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const idToken = authHeader.split("Bearer ")[1];
        if (!idToken) {
            console.error("Bearer token is missing");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        console.log("ID Token:", idToken);

        let decodedToken;
        try {
            decodedToken = await getAuth().verifyIdToken(idToken);
            console.log("Decoded token:", decodedToken);
        } catch (err) {
            console.error("Error verifying ID token:", err);
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const productId = searchParams.get('productId');
        const moduleId = searchParams.get('moduleId');

        if (!productId) {
            return NextResponse.json({ error: "productId is required" }, { status: 400 });
        }

        if (decodedToken) {
            try {
                const pathExists = await requestDelete(productId, moduleId || undefined);
                if (!pathExists) {
                    return NextResponse.json({ error: "Path does not exist" }, { status: 404 });
                }

                await executeDelete(productId, moduleId || undefined);
                logDeletion(decodedToken.uid, moduleId ? 'DeleteModule' : 'DeleteProduct', productId, moduleId || undefined);

                return NextResponse.json({ message: "All functions executed successfully" }, { status: 200 });
            } catch (err) {
                console.error("Failed to execute functions:", err);
                return NextResponse.json({ error: "Failed to execute functions" }, { status: 500 });
            }
        } else {
            console.error("Token verification failed");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
