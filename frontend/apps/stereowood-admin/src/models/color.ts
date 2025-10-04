export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export interface CMYK {
  c: number;
  m: number;
  y: number;
  k: number;
}

export interface ColorSwatchMetadata {
  hex: string;
  rgb: RGB;
  hsl?: HSL;
  cmyk?: CMYK;
}
