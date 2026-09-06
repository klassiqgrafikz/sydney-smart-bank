import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useAvatarUrl(path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    if (!path) {
      setUrl(null);
      return;
    }
    supabase.storage.from("avatars").createSignedUrl(path, 3600).then(({ data }) => {
      if (mounted) setUrl(data?.signedUrl ?? null);
    });
    return () => { mounted = false; };
  }, [path]);
  return url;
}