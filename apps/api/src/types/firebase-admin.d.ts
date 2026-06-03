// Stub declarations so the API compiles before firebase-admin is installed.
// Replaced by the real package types once `pnpm install` is run.
declare module 'firebase-admin/app' {
  export function initializeApp(options: unknown, name?: string): unknown
  export function getApps(): unknown[]
  export function cert(options: unknown): unknown
}
declare module 'firebase-admin/messaging' {
  export function getMessaging(app?: unknown): unknown
}
