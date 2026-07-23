"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile as updateAuthProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";
import type { UserProfile } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (
    name: string,
    email: string,
    password: string
  ) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Rejeita se a promise não resolver a tempo (evita telas presas em celular). */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("tempo esgotado")), ms)
    ),
  ]);
}

/** Garante que users/{uid} existe; cria com defaults no primeiro login. */
async function ensureUserDoc(user: User, name?: string): Promise<UserProfile> {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return snap.data() as UserProfile;
  }
  const newProfile = {
    name: name ?? user.displayName ?? "",
    email: user.email ?? "",
    role: "seller" as const,
    company: "",
    // Nasce sem empresa: quem vincula é o master (as Rules exigem null aqui).
    companyId: null,
    salesRole: "",
    experience: "",
    attendanceTypes: [],
    mainDifficulty: "",
    goal: "",
    trainingStartDate: null,
    currentDay: 0,
    progressPercent: 0,
    averageScore: 0,
    currentLevel: 1,
    profileCompleted: false,
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, newProfile);
  const created = await getDoc(ref);
  return created.data() as UserProfile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;
    let settled = false;
    const stopLoading = () => {
      if (!settled) {
        settled = true;
        setLoading(false);
      }
    };

    // REDE DE SEGURANÇA (bug de celular): se o Firebase não resolver o estado
    // de auth — persistência bloqueada em alguns navegadores móveis, ou o
    // primeiro acesso ao Firestore travando na rede — a tela girava para
    // sempre. Passados 8s, liberamos: pior caso, cai no login em vez de travar.
    const failsafe = setTimeout(stopLoading, 8000);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Encerra o listener do perfil anterior ao trocar de usuário.
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (!firebaseUser) {
        setUser(null);
        setProfile(null);
        stopLoading();
        return;
      }

      // Já libera a navegação com o usuário; o perfil chega em seguida (ou
      // pela subscription). Assim um getDoc lento não segura a tela toda.
      setUser(firebaseUser);
      try {
        // Garante o doc. Corre contra um timeout: em rede móvel ruim, o
        // getDoc pode demorar demais, e a subscription abaixo preenche depois.
        const initial = await withTimeout(ensureUserDoc(firebaseUser), 6000);
        setProfile(initial);
      } catch (err) {
        console.error("Erro/atraso ao carregar perfil:", err);
      } finally {
        stopLoading();
      }

      // Mantém o perfil ao vivo (progresso, nível etc. atualizam sozinhos).
      unsubProfile = onSnapshot(
        doc(db, "users", firebaseUser.uid),
        (snap) => {
          if (snap.exists()) setProfile(snap.data() as UserProfile);
          stopLoading();
        },
        (err) => {
          console.error("Erro ao ouvir o perfil:", err);
          stopLoading();
        }
      );
    });

    return () => {
      clearTimeout(failsafe);
      if (unsubProfile) unsubProfile();
      unsubscribe();
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!auth.currentUser) return;
    const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
    if (snap.exists()) setProfile(snap.data() as UserProfile);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(auth, googleProvider);
  }, []);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      await signInWithEmailAndPassword(auth, email, password);
    },
    []
  );

  const signUpWithEmail = useCallback(
    async (name: string, email: string, password: string) => {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateAuthProfile(cred.user, { displayName: name });
      const userProfile = await ensureUserDoc(cred.user, name);
      setProfile(userProfile);
    },
    []
  );

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        resetPassword,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  }
  return ctx;
}
