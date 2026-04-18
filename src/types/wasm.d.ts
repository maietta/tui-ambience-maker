// Type declarations for Bun file imports
declare module '*.wasm' {
  const path: string;
  export default path;
}

// For files imported with type: "file"
declare module '*.wasm?type=file' {
  const path: string;
  export default path;
}
