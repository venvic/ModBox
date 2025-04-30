import { NextRequest, NextResponse } from "next/server";
import { getAuth, Auth } from "firebase-admin/auth";
import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore, FieldValue } from "firebase-admin/firestore";
import { getStorage, Storage } from "firebase-admin/storage";

const serviceAccount = JSON.parse(process.env.NEXT_PUBLIC_SERVICE_ACCOUNT || '{}');
const storageBucketName = process.env.NEXT_PUBLIC_STORAGE_BUCKET || '';

let firebaseApp: App;
let firestore: Firestore;
let auth: Auth;
let storage: Storage;

if (!getApps().length) {
    firebaseApp = initializeApp({
        credential: cert(serviceAccount),
        storageBucket: storageBucketName,
    });
    firestore = getFirestore(firebaseApp);
    auth = getAuth(firebaseApp);
    storage = getStorage(firebaseApp);
} else {
    firebaseApp = getApps()[0];
    firestore = getFirestore(firebaseApp);
    auth = getAuth(firebaseApp);
    storage = getStorage(firebaseApp);
}

async function verifyToken(idToken: string) {
    try {
        return await auth.verifyIdToken(idToken);
    } catch (err) {
        console.error("Error verifying ID token:", err);
        throw new Error("Unauthorized");
    }
}

async function requestDelete(db: Firestore, productId: string, moduleId?: string) {
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

async function deleteCollectionRecursive(db: Firestore, collectionRef: FirebaseFirestore.CollectionReference) {
    const snapshot = await collectionRef.get();
    for (const doc of snapshot.docs) {
        const subcollections = await doc.ref.listCollections();
        for (const subcollection of subcollections) {
            await deleteCollectionRecursive(db, subcollection);
        }
        await doc.ref.delete();
    }
}

async function verifyDeletion(ref: FirebaseFirestore.DocumentReference, retries = 3, delayMs = 100) {
    for (let i = 0; i < retries; i++) {
        const doc = await ref.get();
        if (!doc.exists) {
            return true; // Deletion verified
        }
        await new Promise(resolve => setTimeout(resolve, delayMs)); // Wait before retrying
    }
    return false; // Deletion not verified after retries
}

// Helper function to delete a folder in Firebase Storage
async function deleteFolder(storage: Storage, folderPath: string) {
    const bucket = storage.bucket(storageBucketName);
    const [files] = await bucket.getFiles({ prefix: folderPath });
    for (const file of files) {
        await file.delete();
    }
}

// Modified executeDelete function to handle updated PDF path
async function executeDelete(db: Firestore, productId: string, moduleId?: string) {
    const productRef = db.collection('product').doc(productId);
    const moduleRef = moduleId ? productRef.collection('modules').doc(moduleId) : null;

    if (moduleId) {
        // Delete storage folders for the module
        await deleteFolder(storage, `PDF/${productId}/${moduleId}/`);
        await deleteFolder(storage, `IMAGES/${moduleId}`);

        const subcollections = await moduleRef!.listCollections();
        for (const subcollection of subcollections) {
            await deleteCollectionRecursive(db, subcollection);
        }
        await moduleRef!.delete();

        // Verify module deletion
        const moduleDeleted = await verifyDeletion(moduleRef!);
        if (!moduleDeleted) {
            throw new Error(`Failed to delete module with ID ${moduleId}`);
        }
    } else {
        // Get all module IDs for the product
        const modulesSnapshot = await productRef.collection('modules').get();
        const moduleIds = modulesSnapshot.docs.map(doc => doc.id);

        // Delete storage folders for all modules
        for (const moduleId of moduleIds) {
            await deleteFolder(storage, `PDF/${productId}/${moduleId}/`);
            await deleteFolder(storage, `IMAGES/${moduleId}`);
        }

        const subcollections = await productRef.listCollections();
        for (const subcollection of subcollections) {
            await deleteCollectionRecursive(db, subcollection);
        }
        await productRef.delete();

        // Verify product deletion
        const productDeleted = await verifyDeletion(productRef);
        if (!productDeleted) {
            throw new Error(`Failed to delete product with ID ${productId}`);
        }
    }

    return true;
}

async function logDeletion(db: Firestore, userId: string, action: string, productId: string, moduleId?: string) {
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

        const infoRef = firestore.doc(`global/users/${decodedToken.uid}/info`);
        const infoSnap = await infoRef.get();
        if (!infoSnap.exists || !infoSnap.data()?.allowDeleteModule) {
            return NextResponse.json({ error: "Permission denied" }, { status: 403 });
        }

        const { searchParams } = req.nextUrl;
        const productId = searchParams.get('productId');
        const moduleId = searchParams.get('moduleId');

        if (!productId) {
            return NextResponse.json({ error: "productId is required" }, { status: 400 });
        }

        try {
            const pathExists = await requestDelete(firestore, productId, moduleId || undefined);
            if (!pathExists) {
                return NextResponse.json({ error: "Path does not exist" }, { status: 404 });
            }

            await executeDelete(firestore, productId, moduleId || undefined);
            await logDeletion(firestore, decodedToken.uid, moduleId ? 'DeleteModule' : 'DeleteProduct', productId, moduleId || undefined);

            return NextResponse.json({ message: "All functions executed successfully" }, { status: 200 });
        } catch (err) {
            console.error("Failed to execute functions:", err);
            return NextResponse.json({ error: "Failed to execute functions" }, { status: 500 });
        }
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}