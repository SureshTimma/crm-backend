import { initializeApp, cert, getApps, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let app: App;

export const initializeFirebase = (): App => {
  if (!getApps().length) {
    app = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
    console.log("🔥 Firebase Admin initialized successfully");
  }
  return app;
};

export const verifyFirebaseToken = async (idToken: string) => {
  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error("Firebase token verification failed:", error);
    throw new Error("Invalid Firebase token");
  }
};
