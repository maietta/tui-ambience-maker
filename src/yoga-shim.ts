// Shim to provide yoga.wasm for Ink in compiled binary
/// <reference types="bun-types" />

// @ts-ignore - Import attributes are experimental
import yogaWasmPath from '../node_modules/yoga-wasm-web/dist/yoga.wasm' with { type: "file" };

// Store the original fetch
const originalFetch: typeof fetch = globalThis.fetch;

// Override fetch to intercept yoga.wasm requests
// @ts-ignore - We're intentionally replacing fetch
globalThis.fetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
  const url = input.toString();
  
  // Check if this is a request for yoga.wasm
  if (url.includes('yoga.wasm') || url.endsWith('yoga.wasm')) {
    // Return the embedded wasm file
    const wasmFile = Bun.file(yogaWasmPath);
    return new Response(wasmFile, {
      headers: {
        'Content-Type': 'application/wasm',
      },
    });
  }
  
  // Otherwise use original fetch
  return originalFetch(input, init);
};

// Also intercept WebAssembly.instantiateStreaming if it tries to load yoga.wasm
const originalInstantiateStreaming: typeof WebAssembly.instantiateStreaming = WebAssembly.instantiateStreaming;
// @ts-ignore - We're intentionally replacing the function
WebAssembly.instantiateStreaming = async (
  source: Response | Promise<Response>, 
  importObject?: WebAssembly.Imports
): Promise<WebAssembly.WebAssemblyInstantiatedSource> => {
  const response = await source;
  const url = response.url;
  
  if (url && (url.includes('yoga.wasm') || url.endsWith('yoga.wasm'))) {
    // Load the embedded wasm and instantiate
    const wasmBuffer = await Bun.file(yogaWasmPath).arrayBuffer();
    return WebAssembly.instantiate(wasmBuffer, importObject || {});
  }
  
  return originalInstantiateStreaming(source, importObject);
};
