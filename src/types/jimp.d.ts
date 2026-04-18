declare module 'jimp' {
  export interface JimpInstance {
    width: number;
    height: number;
    resize(options: { w: number; h: number }): JimpInstance;
    getPixelColor(x: number, y: number): number;
    getBuffer(mime: string): Promise<Buffer>;
  }

  export const Jimp: {
    read(path: string): Promise<JimpInstance>;
  };
}
