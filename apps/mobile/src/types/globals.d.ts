// Hermes (RN 0.74) provides base64 helpers at runtime, but the React Native
// type definitions do not declare them and the DOM lib is intentionally
// excluded. Declare them here so strict TypeScript resolves the globals.
declare function atob(data: string): string;
declare function btoa(data: string): string;
