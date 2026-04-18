declare module 'asciify-image' {
  interface AsciifyOptions {
    fit?: 'box' | 'width' | 'height' | 'original';
    width?: number;
    height?: number;
    color?: boolean;
    format?: 'string' | 'array';
  }

  function asciify(
    imagePath: string,
    options?: AsciifyOptions
  ): Promise<string | string[]>;

  export = asciify;
}
