import { describe, expect, it } from "vitest";
import { endpointPushValido } from "./push-endpoint";

describe("destinos Web Push seguros", () => {
  it("aceita os serviços de Chrome, Firefox, Apple e Windows", () => {
    for (const host of ["fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com", "db5.notify.windows.com.wns.windows.com"]) {
      expect(endpointPushValido(`https://${host}/push/example`)).toBe(true);
    }
  });
  it("recusa rede interna, hosts falsos, credenciais e protocolos inseguros", () => {
    for (const endpoint of ["https://127.0.0.1/", "https://localhost/", "https://fcm.googleapis.com.evil.example/", "https://user:pass@fcm.googleapis.com/", "http://fcm.googleapis.com/", "https://fcm.googleapis.com:8443/"]) {
      expect(endpointPushValido(endpoint)).toBe(false);
    }
  });
});