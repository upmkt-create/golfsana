import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDocFromServer, setDoc, type DocumentReference } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);

// CRITICAL: The app will break if this does not pass the correct database ID
const _dbId = firebaseConfig.firestoreDatabaseId;
export const db = (!_dbId || _dbId === "(default)")
  ? getFirestore(app)
  : getFirestore(app, _dbId);
export const auth = getAuth(app);

// ----------------------------------------------------------------------------
// cleanUndefined: Firestore REBUTJA qualsevol valor `undefined`. Aquesta funció
// elimina recursivament tots els camps undefined d'un objecte abans d'escriure.
// Soluciona l'error "Unsupported field value: undefined (found in field X)"
// que feia caure l'app en mode offline.
// ----------------------------------------------------------------------------
export function cleanUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => cleanUndefined(item)) as unknown as T;
  }
  if (typeof obj === "object") {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (value === undefined) continue; // saltar undefined
      cleaned[key] = cleanUndefined(value);
    }
    return cleaned as T;
  }
  return obj;
}

// saveDoc: wrapper segur de setDoc que neteja undefined automàticament.
// Usa'l en lloc de setDoc per a qualsevol escriptura de dades de l'app.
export async function saveDoc(ref: DocumentReference, data: any, options?: { merge?: boolean }) {
  const clean = cleanUndefined(data);
  return options ? setDoc(ref, clean, options) : setDoc(ref, clean);
}

// Connectivity validation check as requested by skill
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("La configuració de Firebase indica que el client està fora de línia o inabastable.");
    }
  }
}
testConnection();

// Mandatory Error Handling Types & Helper Function
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error("Firestore Error logged: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
