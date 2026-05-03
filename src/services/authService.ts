// authService.ts

import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  UserCredential,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { supabase } from "@/integrations/supabase/client";

// ============================================
// SIGN UP (com envio direto para n8n) - Rwmovido do n8n 08/04/2026
// ============================================
export async function signUp(
  email: string, 
  password: string, 
  name?: string, 
  phone?: string
): Promise<UserCredential> {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  
  if (result.user) {
    // Salva usuário no Firestore (coleção "users") com email e whatsapp
    try {
      await setDoc(
        doc(db, "users", result.user.uid),
        {
          uid: result.user.uid,
          email: result.user.email || email,
          name: name || "",
          whatsapp: phone || "",
          phone: phone || "",
          createdAt: serverTimestamp(),
          lastSignInAt: serverTimestamp(),
          role: "user",
        },
        { merge: true }
      );
      console.log("✅ Usuário salvo no Firestore com email e whatsapp");
    } catch (firestoreError) {
      console.error("❌ Erro ao salvar usuário no Firestore:", firestoreError);
    }

    // Salva usuário no Supabase com role "user"
    try {
      const { data, error: supabaseError } = await supabase
        .from('users')
        .upsert({
          firebase_id: result.user.uid,
          email: result.user.email || email,
          name: name || "",
          phone: phone || "",
          created_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
          role: "user",
        }, { onConflict: 'firebase_id' })
        .select()
        .single();

      if (supabaseError) {
        console.error("❌ Erro ao salvar usuário no Supabase:", supabaseError);
      } else {
        console.log("✅ Usuário criado no Supabase com role:", data?.role);
      }
    } catch (err) {
      console.error("⚠️ Falha ao salvar no Supabase:", err);
    }
  }
  
  return result;
}

// ============================================
// SIGN IN
// ============================================
export async function signIn(email: string, password: string): Promise<UserCredential> {
  const result = await signInWithEmailAndPassword(auth, email, password);
  
  if (result.user) {
    // Aqui você pode futuramente atualizar last_sign_in_at no n8n
    // await updateUserLastSignIn(result.user.uid);
  }
  
  return result;
}

// ============================================
// LOG OUT
// ============================================
export async function logOut(): Promise<void> {
  await signOut(auth);
}
