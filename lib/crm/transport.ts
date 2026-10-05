// The Pages distribution explicitly substitutes a local synthetic transport.
// Server builds always use HTTP; this switch is not a security boundary.
type Transport = (path: string, body?: unknown) => Promise<unknown>;
let localTransport: Transport | undefined;
export function installDemoTransport(transport: Transport) {
  localTransport = transport;
}
export function isBrowserDemo() {
  return localTransport !== undefined;
}
export function demoRequest(path: string, body?: unknown) {
  return localTransport?.(path, body);
}
export function routeHref(href?: string) {
  return localTransport && href?.startsWith("/") ? `#${href}` : href;
}
