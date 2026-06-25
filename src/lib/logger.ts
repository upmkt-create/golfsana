import { db } from "../firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { UserProfile } from "../types";

export async function logActivity(user: UserProfile, action: string, meta?: any) {
  try {
    const logData: any = {
      userId: user.id,
      userName: user.name,
      email: user.email,
      action,
      timestamp: Timestamp.now(),
    };
    if (meta !== undefined) {
      logData.meta = meta;
    }
    console.log("Logging activity to Firebase:", logData);
    await addDoc(collection(db, "logs"), logData);
  } catch (error) {
    console.error("Error logging activity: ", error);
  }
}
