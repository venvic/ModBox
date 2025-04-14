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
    const usersSnapshot = await firestore.collection('global').doc('users').listCollections();
    const users = await Promise.all(
      usersSnapshot.map(async (userCollection) => {
        const userDoc = await userCollection.doc('info').get();
        return { uid: userCollection.id, email: userDoc.data()?.email };
      })
    );

    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    console.error("Error fetching users:", error);
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
    const { action, uid, email, projectAccess, sendPasswordReset } = await req.json();

    if (action === 'resetPassword') {
      const userDoc = await firestore.collection('global').doc('users').collection(uid).doc('info').get();
      const email = userDoc.data()?.email;

      if (!email) {
        return NextResponse.json({ error: "User email not found" }, { status: 404 });
      }

      const resetLink = await auth.generatePasswordResetLink(email);
      console.log(`Password reset link for ${email}: ${resetLink}`);
      return NextResponse.json({ message: "Password reset link sent" }, { status: 200 });
    }

    if (action === 'deactivateUser') {
      await auth.updateUser(uid, { disabled: true });
      return NextResponse.json({ message: "User deactivated" }, { status: 200 });
    }

    if (!email || !projectAccess) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const userRecord = await auth.createUser({ email });
    const newUid = userRecord.uid;

    const userRef = firestore.collection('global').doc('users').collection(newUid).doc('info');
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
        itemId: newUid,
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

export async function PUT(req: NextRequest) {
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
    const { uid, projectAccess } = await req.json();

    if (!uid || !projectAccess) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const userRef = firestore.collection('global').doc('users').collection(uid).doc('info');
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await userRef.update({
      projects: projectAccess.includes('all') ? 'all' : projectAccess,
      updatedAt: new Date().toISOString(),
      updatedBy: decodedToken.uid,
    });

    const logDate = new Date().toISOString().split('T')[0];
    const logRef = firestore.collection('logs').doc(logDate);
    await logRef.set({
      date: logDate,
      logs: FieldValue.arrayUnion({
        uid: decodedToken.uid,
        action: 'userUpdateProjects',
        itemId: uid,
        timestamp: new Date().toISOString(),
      }),
    }, { merge: true });

    return NextResponse.json({ message: "User projects updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error updating user projects:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { uid } = await req.json();

    await auth.deleteUser(uid);
    await firestore.collection('global').doc('users').collection(uid).doc('info').delete();

    return NextResponse.json({ message: "User deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
