import { Smile } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const GRUPOS: { nome: string; emojis: string[] }[] = [
  {
    nome: "Rostos",
    emojis: [
      "😀","😃","😄","😁","😊","🙂","😉","😍","😘","😗","🤗","🤔","😐","😑","😴","😪",
      "😢","😭","😤","😠","😅","😂","🤣","😎","🥳","🤩","😇","🙃","😬","🤝",
    ],
  },
  {
    nome: "Gestos",
    emojis: ["👍","👎","👌","👏","🙌","🙏","💪","✌️","🤞","👋","☝️","✍️","🫶","🤙"],
  },
  {
    nome: "Trabalho",
    emojis: ["✅","❌","⚠️","📌","📎","📁","📄","📊","📈","📉","🗓️","⏰","💼","🏢","🔎","💡","🚀","🎯","⭐","🔥","💬","📞","✉️","🧾"],
  },
  {
    nome: "Outros",
    emojis: ["❤️","🧡","💛","💚","💙","💜","🎉","🎊","☕","🍀","🌟","😻"],
  },
];

interface Props {
  onSelecionar: (emoji: string) => void;
}

/** Seletor de emojis leve, no padrão visual do Recruta+. */
export function SeletorEmoji({ onSelecionar }: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0 text-muted-foreground"
          aria-label="Inserir emoji"
        >
          <Smile className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[300px] p-2">
        <div className="max-h-64 space-y-3 overflow-y-auto">
          {GRUPOS.map((g) => (
            <div key={g.nome}>
              <p className="mb-1 px-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {g.nome}
              </p>
              <div className="grid grid-cols-8 gap-0.5">
                {g.emojis.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => onSelecionar(e)}
                    className="rounded-md p-1 text-lg leading-none transition-colors hover:bg-accent"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}