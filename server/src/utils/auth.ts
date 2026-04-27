import type { Request, Response, NextFunction } from "express";
import { config } from "../config.js";
import { log } from "./log.js";

interface FirebaseAdminLike {
  auth: () => { verifyIdToken: (token: string) => Promise<{ uid: string; email?: string }> };
}

let firebaseAdmin: FirebaseAdminLike | null = null;
let firebaseInitTried = false;

async function loadFirebaseAdmin(): Promise<FirebaseAdminLike | null> {
  if (firebaseAdmin || firebaseInitTried) return firebaseAdmin;
  firebaseInitTried = true;
  if (!config.FIREBASE_PROJECT_ID) {
    log.warn("Firebase not configured — auth will fall back to dev passthrough.");
    return null;
  }
  try {
    const admin = (await import("firebase-admin")).default;
    if (admin.apps.length === 0) {
      let credential;
      if (config.FIREBASE_SERVICE_ACCOUNT_JSON) {
        const raw = config.FIREBASE_SERVICE_ACCOUNT_JSON.trim();
        const parsed = raw.startsWith("{")
          ? JSON.parse(raw)
          : JSON.parse(await (await import("node:fs/promises")).readFile(raw, "utf8"));
        credential = admin.credential.cert(parsed);
      } else {
        credential = admin.credential.applicationDefault();
      }
      admin.initializeApp({ credential, projectId: config.FIREBASE_PROJECT_ID });
    }
    firebaseAdmin = admin as unknown as FirebaseAdminLike;
    return firebaseAdmin;
  } catch (err) {
    log.error({ err }, "Failed to initialize firebase-admin");
    return null;
  }
}

export interface AuthedUser {
  uid: string;
  email?: string;
  source: "firebase" | "dev-header";
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthedUser;
    }
  }
}

/** Verify an Authorization header (Bearer <firebase-id-token>) or, in dev, a raw user id header. */
export async function verifyToken(authHeader: string | undefined, devHeader?: string): Promise<AuthedUser | null> {
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) return null;
    const admin = await loadFirebaseAdmin();
    if (admin) {
      try {
        const decoded = await admin.auth().verifyIdToken(token);
        return { uid: decoded.uid, email: decoded.email, source: "firebase" };
      } catch (err) {
        log.warn({ err }, "Failed to verify Firebase ID token");
        return null;
      }
    }
    if (config.NODE_ENV !== "production") {
      // Dev fallback: trust the token as the user id.
      return { uid: token, source: "dev-header" };
    }
    return null;
  }
  if (devHeader && config.NODE_ENV !== "production") {
    return { uid: devHeader, source: "dev-header" };
  }
  return null;
}

export function requireAuth() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = await verifyToken(req.header("authorization"), req.header("x-aqualibria-user"));
    if (!user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    req.user = user;
    next();
  };
}
