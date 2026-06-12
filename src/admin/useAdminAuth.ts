import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, MASTER_ADMIN } from "../firebase";

export function useAdminAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null); // null = a verificar
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setAuthorized(false);
        setLoading(false);
        return;
      }
      if (u.email === MASTER_ADMIN) {
        setAuthorized(true);
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "starlinkAdmins", u.email!));
        setAuthorized(snap.exists());
      } catch {
        setAuthorized(false);
      }
      setLoading(false);
    });
  }, []);

  return { user, authorized, loading, isMaster: user?.email === MASTER_ADMIN };
}
