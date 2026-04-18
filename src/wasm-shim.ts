// Shim to handle yoga.wasm embedding for Bun compile
import yogaWasmPath from '../node_modules/yoga-wasm-web/dist/yoga.wasm' with { type: "file" };

// Store the path globally so yoga-wasm-web can find it
if (typeof globalThis !== 'undefined') {
  (globalThis as any).YOGa_WASM_PATH = yogaWasmPath;
}

export default yogaWasmPath;
