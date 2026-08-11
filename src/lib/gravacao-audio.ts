import { useEffect, useRef, useState } from "react";

/** Gravação de áudio pelo microfone, compatível com celular e computador. */
export function useGravadorAudio() {
  const [gravando, setGravando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const gravador = useRef<MediaRecorder | null>(null);
  const pedacos = useRef<Blob[]>([]);
  const cancelado = useRef(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearInterval(timer.current);
      gravador.current?.stream.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  async function iniciar() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const tipos = ["audio/webm", "audio/mp4", "audio/ogg"];
    const mime = tipos.find((t) => MediaRecorder.isTypeSupported(t));
    const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    pedacos.current = [];
    cancelado.current = false;
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) pedacos.current.push(e.data);
    };
    mr.start();
    gravador.current = mr;
    setSegundos(0);
    setGravando(true);
    timer.current = window.setInterval(() => setSegundos((s) => s + 1), 1000);
  }

  function encerrarTimer() {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
  }

  /** Finaliza a gravação e devolve o áudio (ou null quando cancelada). */
  function parar(): Promise<{ blob: Blob; duracaoMs: number } | null> {
    return new Promise((resolve) => {
      const mr = gravador.current;
      if (!mr) return resolve(null);
      const duracaoMs = segundos * 1000;
      mr.onstop = () => {
        mr.stream.getTracks().forEach((t) => t.stop());
        gravador.current = null;
        setGravando(false);
        encerrarTimer();
        if (cancelado.current) return resolve(null);
        const tipo = mr.mimeType || "audio/webm";
        resolve({ blob: new Blob(pedacos.current, { type: tipo }), duracaoMs });
      };
      mr.stop();
    });
  }

  function cancelar() {
    cancelado.current = true;
    void parar();
  }

  return { gravando, segundos, iniciar, parar, cancelar };
}