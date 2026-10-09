- Keep heterogeneous backup reads behind a narrow typed query boundary; expanding generated relationship types for a union of tables can exceed compiler limits.
- Validate Web Push endpoints through the shared browser-provider allowlist and forbid redirects before server requests; this prevents subscriptions from becoming arbitrary server-side requests.
- Determine internal notification activation from the authenticated user's server record, not just the browser subscription; portal and staff opt-ins share a browser but remain independent.
- Reuse the same live pending-action evaluator for push scheduling and final message delivery; resolved conditions must suppress delivery rather than produce generic fallback alerts.
- Scope attendance push alerts to the vacancy's assigned programmer while no separate validation assignee exists; tenant-wide permission is not evidence of individual responsibility.

- Create report-ready events only after successful report writes; quinzenal readiness requires every daily report in the period, and delivery rechecks the named administrator, tenant and notification permission.
- Use IANA user timezone with tenant fallback for push day boundaries and weekly greetings; claim queued batches atomically before delivery to prevent concurrent duplicate notifications.
