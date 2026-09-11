import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  beforeLoad: () => { throw redirect({ to: "/acesso", replace: true }); },
  head: () => ({ meta: [
    { title: "Acesso | RECRUTA+" },
    { name: "description", content: "Acesse com segurança o sistema RECRUTA+." },
    { property: "og:title", content: "Acesso | RECRUTA+" },
    { property: "og:description", content: "Acesse com segurança o sistema RECRUTA+." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
});