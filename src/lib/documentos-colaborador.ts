import { supabase } from "@/integrations/supabase/client";

/** Área privada de armazenamento dos documentos pessoais dos colaboradores. */
export const BUCKET_DOCUMENTOS = "documentos-colaboradores";

export const TIPOS_DOCUMENTO = ["image/jpeg", "image/png", "application/pdf"] as const;
export const TAMANHO_MAXIMO_DOCUMENTO = 10 * 1024 * 1024;

export function documentoValido(arquivo: File) {
  if (!TIPOS_DOCUMENTO.includes(arquivo.type as (typeof TIPOS_DOCUMENTO)[number])) {
    return "Envie o documento em JPG, PNG ou PDF.";
  }
  if (arquivo.size > TAMANHO_MAXIMO_DOCUMENTO) return "O arquivo deve ter até 10 MB.";
  return null;
}

/**
 * Envia o documento de identidade. O caminho começa sempre pelo identificador
 * da empresa (tenant), que é o que as regras de acesso do armazenamento validam.
 */
export async function enviarDocumentoIdentidade(tenantId: string, colaboradorId: string, arquivo: File) {
  const erroValidacao = documentoValido(arquivo);
  if (erroValidacao) throw new Error(erroValidacao);
  const ext = (arquivo.name.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const caminho = `${tenantId}/${colaboradorId}/identidade-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET_DOCUMENTOS)
    .upload(caminho, arquivo, { upsert: false, contentType: arquivo.type });
  if (error) throw error;
  return { caminho, nome: arquivo.name.slice(0, 160) };
}

/** Remove o arquivo do armazenamento privado (ignora caminho vazio). */
export async function removerDocumentoIdentidade(caminho: string) {
  if (!caminho) return;
  const { error } = await supabase.storage.from(BUCKET_DOCUMENTOS).remove([caminho]);
  if (error) throw error;
}

/** URL assinada de curta duração — nunca há URL pública para documentos. */
export async function urlDocumentoIdentidade(caminho: string) {
  const { data, error } = await supabase.storage.from(BUCKET_DOCUMENTOS).createSignedUrl(caminho, 300);
  if (error) throw error;
  return data.signedUrl;
}
