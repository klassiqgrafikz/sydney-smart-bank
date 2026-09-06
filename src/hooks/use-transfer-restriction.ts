import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";

export interface TransferRestriction {
  restoreDate: string | null; // YYYY-MM-DD or null for indefinite
  restoreLabel: string | null;
  statusText: string;
  message: string;
}

export function useTransferRestriction(): TransferRestriction | null {
  const { data: profile } = useProfile();
  const accountNumber = profile?.account_number;
  const { data } = useQuery({
    enabled: !!accountNumber,
    queryKey: ["my-transfer-restriction", accountNumber],
    queryFn: async (): Promise<TransferRestriction | null> => {
      const { data } = await supabase
        .from("transfer_restrictions")
        .select("restore_date, status_text, message")
        .eq("account_number", accountNumber!)
        .maybeSingle();
      if (!data) return null;
      const today = new Date().toISOString().slice(0, 10);
      if (data.restore_date && data.restore_date <= today) return null;
      const restoreLabel = data.restore_date
        ? new Date(data.restore_date + "T00:00:00").toLocaleDateString(
            undefined,
            { year: "numeric", month: "long", day: "numeric" },
          )
        : null;
      return {
        restoreDate: data.restore_date ?? null,
        restoreLabel,
        statusText: (data.status_text ?? "").trim(),
        message: (data.message ?? "").trim(),
      };
    },
    staleTime: 30_000,
  });
  return data ?? null;
}
