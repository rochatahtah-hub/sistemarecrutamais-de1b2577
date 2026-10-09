/** Only browser push services may be contacted; never arbitrary HTTPS hosts. */
export function endpointPushValido(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    if (url.protocol !== "https:" || url.username || url.password || url.port || url.hash) return false;
    return url.hostname === "fcm.googleapis.com"
      || url.hostname === "updates.push.services.mozilla.com"
      || url.hostname === "web.push.apple.com"
      || url.hostname === "wns.windows.com"
      || url.hostname.endsWith(".wns.windows.com")
      || url.hostname.endsWith(".push.apple.com");
  } catch {
    return false;
  }
}