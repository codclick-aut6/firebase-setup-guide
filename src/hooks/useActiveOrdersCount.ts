import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { phoneVariants } from "@/utils/phoneUtils";

export const useActiveOrdersCount = () => {
  const { currentUser } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!currentUser) {
      setCount(0);
      return;
    }
    let unsubscribe: (() => void) | null = null;

    (async () => {
      try {
        const { data: userData } = await supabase
          .from("users")
          .select("phone")
          .eq("firebase_id", currentUser.uid)
          .maybeSingle();

        let phone = userData?.phone || currentUser.phoneNumber;
        if (!phone && currentUser.email) {
          const { data: customerData } = await supabase
            .from("customer_data")
            .select("phone")
            .eq("name", currentUser.displayName || currentUser.email)
            .maybeSingle();
          phone = customerData?.phone;
        }
        if (!phone) return;

        const variants = phoneVariants(phone);
        if (variants.length === 0) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = Timestamp.fromDate(today);

        const ordersQuery = query(
          collection(db, "orders"),
          where("customerPhone", "in", variants.slice(0, 30)),
          where("createdAt", ">=", todayTimestamp),
          orderBy("createdAt", "desc")
        );

        unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
          const active = snapshot.docs.filter((doc) => {
            const status = doc.data().status;
            return !["delivered", "cancelled"].includes(status);
          });
          setCount(active.length);
        });
      } catch (e) {
        console.error("useActiveOrdersCount erro:", e);
      }
    })();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser]);

  return count;
};
