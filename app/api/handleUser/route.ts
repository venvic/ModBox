import { NextRequest, NextResponse } from "next/server";
import { getAuth, Auth } from "firebase-admin/auth";
import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore, FieldValue } from "firebase-admin/firestore";
import nodemailer from 'nodemailer';

const serviceAccount = JSON.parse(process.env.NEXT_PUBLIC_SERVICE_ACCOUNT || '{}');

let firebaseApp: App;
let firestore: Firestore;
let auth: Auth;

if (!getApps().length) {
  firebaseApp = initializeApp({ credential: cert(serviceAccount) });
  firestore = getFirestore(firebaseApp);
  auth = getAuth(firebaseApp);
} else {
  firebaseApp = getApps()[0];
  firestore = getFirestore(firebaseApp);
  auth = getAuth(firebaseApp);
}

const transporter = nodemailer.createTransport({
        host: process.env.NEXT_PUBLIC_SMTP_HOST,
        port: parseInt(process.env.NEXT_PUBLIC_SMTP_PORT || '587', 10),
        auth: {
            user: process.env.NEXT_PUBLIC_SMTP_USER,
            pass: process.env.NEXT_PUBLIC_SMTP_PASS
        },
        from: process.env.NEXT_PUBLIC_SMTP_FROM,
        secure: false,
        name: 'cosmema.de',
        tls: {
            rejectUnauthorized: false,
        },
    });


export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Authorization header is missing");
      return NextResponse.json({ error: "Unauthorized: Missing Authorization header" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    if (!idToken) {
      console.error("Bearer token is missing");
      return NextResponse.json({ error: "Unauthorized: Missing Bearer token" }, { status: 401 });
    }

    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      console.log('Decoded token:', decodedToken);
    } catch (error) {
      console.error("Error verifying ID token:", error);
      return NextResponse.json({ error: "Unauthorized: Invalid ID token" }, { status: 401 });
    }

    const productsSnapshot = await firestore.collection('product').get();
    const projects = productsSnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
    }));

    console.log('Fetched projects from Firestore:', projects);

    return NextResponse.json({ projects }, { status: 200 });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    if (!idToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decodedToken = await auth.verifyIdToken(idToken);
    const { email, projectAccess, sendPasswordReset } = await req.json();

    if (!email || !projectAccess) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const userRecord = await auth.createUser({ email });
    const uid = userRecord.uid;

    const userRef = firestore.collection('global').doc('users').collection(uid).doc('info');
    await userRef.set({
      projects: projectAccess.includes('all') ? 'all' : projectAccess,
      createdAt: new Date().toISOString(),
      createdBy: decodedToken.uid,
      email
    });

    const logDate = new Date().toISOString().split('T')[0];
    const logRef = firestore.collection('logs').doc(logDate);
    await logRef.set({
      date: logDate,
      logs: FieldValue.arrayUnion({
        uid: decodedToken.uid,
        action: 'userCreate',
        itemId: uid,
        timestamp: new Date().toISOString()
      })
    }, { merge: true });

    if (sendPasswordReset) {
      try {
        const resetLink = await auth.generatePasswordResetLink(email);

        const mailOptions = {
          from: process.env.NEXT_PUBLIC_SMTP_FROM,
          to: email,
          subject: 'ModBox - Passwort erstellen',
          html: `
            <p>Hallo,</p>
            <p>Sie haben ein Konto erstellt. Bitte setzen Sie Ihr Passwort über den folgenden Link zurück:</p>
            <a href="${resetLink}">${resetLink}</a>
            <p>Wenn du diese Email erhalten hast, ohne eine Anfrage gestellt zu haben, wende dich bitte an die Entwickler unter akos.szabo@cosmema.de.<p/>
            <p>Vielen Dank!</p>
            <p>Ihr Heimat Info Team</p>
          `
        };

        // Send the email
        await transporter.sendMail(mailOptions);
        console.log(`Password reset email sent to ${email}`);
      } catch (error) {
        console.error("Error sending password reset email:", error);
        return NextResponse.json({ error: "Failed to send password reset email" }, { status: 500 });
      }
    }

    return NextResponse.json({ message: "User created successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
