import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

const BUCKET = "avatars";
const cache = new Map<string, string>();

/** Gera (e memoriza) uma URL assinada para o caminho da foto no armazenamento. */
export function useFotoPerfil(caminho?: string | null) {
  const [url, setUrl] = useState<string | null>(() => (caminho ? (cache.get(caminho) ?? null) : null));

  useEffect(() => {
    let ativo = true;
    if (!caminho) {
      setUrl(null);
      return;
    }
    const memo = cache.get(caminho);
    if (memo) {
      setUrl(memo);
      return;
    }
    void supabase.storage
      .from(BUCKET)
      .createSignedUrl(caminho, 60 * 60 * 12)
      .then(({ data }) => {
        if (!ativo || !data?.signedUrl) return;
        cache.set(caminho, data.signedUrl);
        setUrl(data.signedUrl);
      })
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, [caminho]);

  return url;
}

/** Envia a foto do usuário autenticado e devolve o caminho salvo no perfil. */
export async function enviarFotoPerfil(userId: string, arquivo: File) {
  const ext = (arquivo.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const caminho = `${userId}/perfil-${Date.now()}.${ext || "jpg"}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(caminho, arquivo, { upsert: true, contentType: arquivo.type || "image/jpeg" });
  if (error) throw error;
  const { error: erroPerfil } = await supabase
    .from("profiles")
    .update({ avatar_url: caminho })
    .eq("id", userId);
  if (erroPerfil) throw erroPerfil;
  return caminho;
}

/** Remove a foto atual do usuário autenticado. */
export async function removerFotoPerfil(userId: string, caminho?: string | null) {
  if (caminho) {
    await supabase.storage.from(BUCKET).remove([caminho]);
    cache.delete(caminho);
  }
  const { error } = await supabase.from("profiles").update({ avatar_url: "" }).eq("id", userId);
  if (error) throw error;
}
