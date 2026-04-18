#!/usr/bin/env node

// CRITICAL: This must run before ANY other imports
// It patches the module system to intercept yoga.wasm loading
/// <reference types="bun-types" />

// @ts-ignore - Import attributes are experimental
import yogaWasmPath from '../node_modules/yoga-wasm-web/dist/yoga.wasm' with { type: "file" };

// Pre-load the wasm buffer
const wasmBufferPromise: Promise<ArrayBuffer> = Bun.file(yogaWasmPath).arrayBuffer();

// Create a data URL from the wasm for inline loading
const wasmDataUrlPromise = wasmBufferPromise.then((buffer: ArrayBuffer) => {
  const base64 = Buffer.from(buffer).toString('base64');
  return `data:application/wasm;base64,${base64}`;
});

// Patch fetch before anything else loads
const originalFetch: typeof fetch = globalThis.fetch;
// @ts-ignore - We're intentionally replacing fetch
globalThis.fetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
  const url = input.toString();
  
  if (url === './yoga.wasm' || url.includes('yoga.wasm')) {
    // Return the embedded wasm file
    const buffer = await wasmBufferPromise;
    return new Response(buffer, {
      headers: { 'Content-Type': 'application/wasm' },
    });
  }
  
  return originalFetch(input, init);
};

// Patch WebAssembly.instantiateStreaming
const originalInstantiateStreaming: typeof WebAssembly.instantiateStreaming = WebAssembly.instantiateStreaming;
// @ts-ignore - We're intentionally replacing the function
WebAssembly.instantiateStreaming = async (
  source: Response | Promise<Response> | string, 
  importObject?: WebAssembly.Imports
): Promise<WebAssembly.WebAssemblyInstantiatedSource> => {
  // If source is a string/URL pointing to yoga.wasm, use our embedded version
  if (typeof source === 'string' && source.includes('yoga.wasm')) {
    const buffer = await wasmBufferPromise;
    return WebAssembly.instantiate(buffer, importObject || {});
  }
  
  // If source is a Response, check its URL
  if (source && typeof source === 'object') {
    const response = await source;
    const url = response.url;
    if (url && url.includes('yoga.wasm')) {
      const buffer = await wasmBufferPromise;
      return WebAssembly.instantiate(buffer, importObject || {});
    }
  }
  
  return originalInstantiateStreaming(source as Response | Promise<Response>, importObject);
};

// Also try to intercept module loading
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Module = require('module') as { _load: (request: string, parent: unknown, isMain: boolean) => unknown };
const originalLoad = Module._load;
Module._load = function(request: string, parent: unknown, isMain: boolean): unknown {
  if (request === './yoga.wasm' || request.endsWith('yoga.wasm')) {
    // Return a promise that resolves to the wasm module
    return wasmBufferPromise.then((buffer: ArrayBuffer) => {
      return WebAssembly.compile(buffer);
    });
  }
  return originalLoad(request, parent, isMain);
};

// Now import the app
import { runApp } from './ui/app.js';
runApp();
