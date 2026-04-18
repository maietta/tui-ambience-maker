// Shim to provide yoga.wasm for Ink in compiled binary
import yogaWasmPath from '../node_modules/yoga-wasm-web/dist/yoga.wasm' with { type: "file" };
import { file } from 'bun';

// Store the original fetch
const originalFetch = globalThis.fetch;

// Override fetch to intercept yoga.wasm requests
globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = input.toString();
  
  // Check if this is a request for yoga.wasm
  if (url.includes('yoga.wasm') || url.endsWith('yoga.wasm')) {
    // Return the embedded wasm file
    return new Response(file(yogaWasmPath), {
      headers: {
        'Content-Type': 'application/wasm',
      },
    });
  }
  
  // Otherwise use original fetch
  return originalFetch(input, init);
};

// Also intercept WebAssembly.instantiateStreaming if it tries to load yoga.wasm
const originalInstantiateStreaming = WebAssembly.instantiateStreaming;
(WebAssembly as any).instantiateStreaming = async (source: Response | Promise<Response>, importObject?: WebAssembly.Imports) => {
  const response = await source;
  const url = response.url;
  
  if (url && (url.includes('yoga.wasm') || url.endsWith('yoga.wasm'))) {
    // Load the embedded wasm and instantiate
    const wasmBuffer = await file(yogaWasmPath).arrayBuffer();
    return WebAssembly.instantiate(wasmBuffer, importObject || {});
  }
  
  return originalInstantiateStreaming(source, importObject);
};
