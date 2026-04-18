#!/usr/bin/env node

// CRITICAL: This must run before ANY other imports
// It patches the module system to intercept yoga.wasm loading

// First, set up the yoga.wasm provider
import yogaWasmPath from '../node_modules/yoga-wasm-web/dist/yoga.wasm' with { type: "file" };
import { file } from 'bun';

// Pre-load the wasm buffer
const wasmBufferPromise = file(yogaWasmPath).arrayBuffer();

// Create a data URL from the wasm for inline loading
const wasmDataUrlPromise = wasmBufferPromise.then(buffer => {
  const base64 = Buffer.from(buffer).toString('base64');
  return `data:application/wasm;base64,${base64}`;
});

// Patch fetch before anything else loads
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
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
const originalInstantiateStreaming = WebAssembly.instantiateStreaming;
(WebAssembly as any).instantiateStreaming = async (source: any, importObject?: WebAssembly.Imports) => {
  // If source is a string/URL pointing to yoga.wasm, use our embedded version
  if (typeof source === 'string' && source.includes('yoga.wasm')) {
    const buffer = await wasmBufferPromise;
    return WebAssembly.instantiate(buffer, importObject || {});
  }
  
  // If source is a Response, check its URL
  if (source && typeof source === 'object') {
    const url = source.url || (await source).url;
    if (url && url.includes('yoga.wasm')) {
      const buffer = await wasmBufferPromise;
      return WebAssembly.instantiate(buffer, importObject || {});
    }
  }
  
  return originalInstantiateStreaming(source, importObject);
};

// Also try to intercept module loading
const Module = require('module') as any;
const originalLoad = Module._load;
Module._load = function(request: string, parent: any, isMain: boolean) {
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
