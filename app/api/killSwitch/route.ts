import { NextRequest, NextResponse } from "next/server";
import { getAuth, Auth } from "firebase-admin/auth";
import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore, FieldValue } from "firebase-admin/firestore";

const serviceAccount = JSON.parse(process.env.NEXT_PUBLIC_SERVICE_ACCOUNT || '{}');

// Initialize Firebase app and Firestore instance at the module level
let firebaseApp: App;
let firestore: Firestore;
let auth: Auth;

if (!getApps().length) {
    firebaseApp = initializeApp({
        credential: cert(serviceAccount),
    });
    firestore = getFirestore(firebaseApp);
    auth = getAuth(firebaseApp);
} else {
    firebaseApp = getApps()[0];
    firestore = getFirestore(firebaseApp);
    auth = getAuth(firebaseApp);
}

async function verifyToken(idToken: string) {
    try {
        return await auth.verifyIdToken(idToken);
    } catch (err) {
        console.error("Error verifying ID token:", err);
        throw new Error("Unauthorized");
    }
}

async function updateKillSwitch(db: Firestore) {
    const settingsRef = db.collection('global').doc('settings');
    await settingsRef.update({ modBoxActive: false });
}

async function logKillSwitch(db: Firestore, userId: string) {
    const logEntry = {
        uid: userId,
        action: 'KillSwitchActivated',
        itemId: '',
        extra: '',
        timestamp: new Date().toISOString()
    };

    const logDate = new Date().toISOString().split('T')[0];
    const logRef = db.collection('logs').doc(logDate);

    await logRef.set({
        date: logDate,
        logs: FieldValue.arrayUnion(logEntry)
    }, { merge: true });
}

export async function POST(req: NextRequest) {
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

        let decodedToken;
        try {
            decodedToken = await verifyToken(idToken);
        } catch (err) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        try {
            await updateKillSwitch(firestore);
            await logKillSwitch(firestore, decodedToken.uid);

            return NextResponse.json({ message: "Kill Switch activated and logged successfully" }, { status: 200 });
        } catch (err) {
            console.error("Failed to execute Kill Switch:", err);
            return NextResponse.json({ error: "Failed to execute Kill Switch" }, { status: 500 });
        }
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
