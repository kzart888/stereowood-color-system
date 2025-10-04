import type { PantoneColor } from '@/features/pure-color/colorConverter';

export type PantoneEntryType = 'coated' | 'uncoated' | 'both';

export interface PantoneEntry extends PantoneColor {
  hex: string;
  type: PantoneEntryType;
}

export const PANTONE_BASIC_SET: PantoneEntry[] = [
  {
    code: '185 C',
    name: '185 C',
    hex: '#E4002B',
    rgb: {
      r: 228,
      g: 0,
      b: 43,
    },
    type: 'coated',
  },
  {
    code: '185 U',
    name: '185 U',
    hex: '#E6003C',
    rgb: {
      r: 230,
      g: 0,
      b: 60,
    },
    type: 'uncoated',
  },
  {
    code: '186 C',
    name: '186 C',
    hex: '#C8102E',
    rgb: {
      r: 200,
      g: 16,
      b: 46,
    },
    type: 'coated',
  },
  {
    code: '186 U',
    name: '186 U',
    hex: '#CE1141',
    rgb: {
      r: 206,
      g: 17,
      b: 65,
    },
    type: 'uncoated',
  },
  {
    code: 'Red 032 C',
    name: 'Red 032 C',
    hex: '#EF3340',
    rgb: {
      r: 239,
      g: 51,
      b: 64,
    },
    type: 'coated',
  },
  {
    code: 'Red 032 U',
    name: 'Red 032 U',
    hex: '#F04E45',
    rgb: {
      r: 240,
      g: 78,
      b: 69,
    },
    type: 'uncoated',
  },
  {
    code: '172 C',
    name: '172 C',
    hex: '#FF6432',
    rgb: {
      r: 255,
      g: 100,
      b: 50,
    },
    type: 'coated',
  },
  {
    code: '172 U',
    name: '172 U',
    hex: '#FF7043',
    rgb: {
      r: 255,
      g: 112,
      b: 67,
    },
    type: 'uncoated',
  },
  {
    code: '286 C',
    name: '286 C',
    hex: '#0033A0',
    rgb: {
      r: 0,
      g: 51,
      b: 160,
    },
    type: 'coated',
  },
  {
    code: '286 U',
    name: '286 U',
    hex: '#0047BB',
    rgb: {
      r: 0,
      g: 71,
      b: 187,
    },
    type: 'uncoated',
  },
  {
    code: '287 C',
    name: '287 C',
    hex: '#003DA5',
    rgb: {
      r: 0,
      g: 61,
      b: 165,
    },
    type: 'coated',
  },
  {
    code: '287 U',
    name: '287 U',
    hex: '#0053B5',
    rgb: {
      r: 0,
      g: 83,
      b: 181,
    },
    type: 'uncoated',
  },
  {
    code: '288 C',
    name: '288 C',
    hex: '#002D72',
    rgb: {
      r: 0,
      g: 45,
      b: 114,
    },
    type: 'coated',
  },
  {
    code: '288 U',
    name: '288 U',
    hex: '#003B7C',
    rgb: {
      r: 0,
      g: 59,
      b: 124,
    },
    type: 'uncoated',
  },
  {
    code: 'Reflex Blue C',
    name: 'Reflex Blue C',
    hex: '#001489',
    rgb: {
      r: 0,
      g: 20,
      b: 137,
    },
    type: 'coated',
  },
  {
    code: 'Reflex Blue U',
    name: 'Reflex Blue U',
    hex: '#001E62',
    rgb: {
      r: 0,
      g: 30,
      b: 98,
    },
    type: 'uncoated',
  },
  {
    code: '354 C',
    name: '354 C',
    hex: '#00B140',
    rgb: {
      r: 0,
      g: 177,
      b: 64,
    },
    type: 'coated',
  },
  {
    code: '354 U',
    name: '354 U',
    hex: '#00B74F',
    rgb: {
      r: 0,
      g: 183,
      b: 79,
    },
    type: 'uncoated',
  },
  {
    code: '355 C',
    name: '355 C',
    hex: '#009639',
    rgb: {
      r: 0,
      g: 150,
      b: 57,
    },
    type: 'coated',
  },
  {
    code: '355 U',
    name: '355 U',
    hex: '#00A044',
    rgb: {
      r: 0,
      g: 160,
      b: 68,
    },
    type: 'uncoated',
  },
  {
    code: '356 C',
    name: '356 C',
    hex: '#007A33',
    rgb: {
      r: 0,
      g: 122,
      b: 51,
    },
    type: 'coated',
  },
  {
    code: '356 U',
    name: '356 U',
    hex: '#008542',
    rgb: {
      r: 0,
      g: 133,
      b: 66,
    },
    type: 'uncoated',
  },
  {
    code: '376 C',
    name: '376 C',
    hex: '#84BD00',
    rgb: {
      r: 132,
      g: 189,
      b: 0,
    },
    type: 'coated',
  },
  {
    code: '376 U',
    name: '376 U',
    hex: '#8DC63F',
    rgb: {
      r: 141,
      g: 198,
      b: 63,
    },
    type: 'uncoated',
  },
  {
    code: 'Yellow C',
    name: 'Yellow C',
    hex: '#FEDD00',
    rgb: {
      r: 254,
      g: 221,
      b: 0,
    },
    type: 'coated',
  },
  {
    code: 'Yellow U',
    name: 'Yellow U',
    hex: '#FFE700',
    rgb: {
      r: 255,
      g: 231,
      b: 0,
    },
    type: 'uncoated',
  },
  {
    code: '116 C',
    name: '116 C',
    hex: '#FFCD00',
    rgb: {
      r: 255,
      g: 205,
      b: 0,
    },
    type: 'coated',
  },
  {
    code: '116 U',
    name: '116 U',
    hex: '#FFD700',
    rgb: {
      r: 255,
      g: 215,
      b: 0,
    },
    type: 'uncoated',
  },
  {
    code: '123 C',
    name: '123 C',
    hex: '#FFC72C',
    rgb: {
      r: 255,
      g: 199,
      b: 44,
    },
    type: 'coated',
  },
  {
    code: '123 U',
    name: '123 U',
    hex: '#FFD23E',
    rgb: {
      r: 255,
      g: 210,
      b: 62,
    },
    type: 'uncoated',
  },
  {
    code: '137 C',
    name: '137 C',
    hex: '#FFA300',
    rgb: {
      r: 255,
      g: 163,
      b: 0,
    },
    type: 'coated',
  },
  {
    code: '137 U',
    name: '137 U',
    hex: '#FFAD1D',
    rgb: {
      r: 255,
      g: 173,
      b: 29,
    },
    type: 'uncoated',
  },
  {
    code: 'Orange 021 C',
    name: 'Orange 021 C',
    hex: '#FE5000',
    rgb: {
      r: 254,
      g: 80,
      b: 0,
    },
    type: 'coated',
  },
  {
    code: 'Orange 021 U',
    name: 'Orange 021 U',
    hex: '#FF6A13',
    rgb: {
      r: 255,
      g: 106,
      b: 19,
    },
    type: 'uncoated',
  },
  {
    code: '151 C',
    name: '151 C',
    hex: '#FF8200',
    rgb: {
      r: 255,
      g: 130,
      b: 0,
    },
    type: 'coated',
  },
  {
    code: '151 U',
    name: '151 U',
    hex: '#FF8F1C',
    rgb: {
      r: 255,
      g: 143,
      b: 28,
    },
    type: 'uncoated',
  },
  {
    code: '165 C',
    name: '165 C',
    hex: '#FF671F',
    rgb: {
      r: 255,
      g: 103,
      b: 31,
    },
    type: 'coated',
  },
  {
    code: '165 U',
    name: '165 U',
    hex: '#FF7F32',
    rgb: {
      r: 255,
      g: 127,
      b: 50,
    },
    type: 'uncoated',
  },
  {
    code: '268 C',
    name: '268 C',
    hex: '#582C83',
    rgb: {
      r: 88,
      g: 44,
      b: 131,
    },
    type: 'coated',
  },
  {
    code: '268 U',
    name: '268 U',
    hex: '#6B3AA0',
    rgb: {
      r: 107,
      g: 58,
      b: 160,
    },
    type: 'uncoated',
  },
  {
    code: '269 C',
    name: '269 C',
    hex: '#512D6D',
    rgb: {
      r: 81,
      g: 45,
      b: 109,
    },
    type: 'coated',
  },
  {
    code: '269 U',
    name: '269 U',
    hex: '#653780',
    rgb: {
      r: 101,
      g: 55,
      b: 128,
    },
    type: 'uncoated',
  },
  {
    code: 'Violet C',
    name: 'Violet C',
    hex: '#440099',
    rgb: {
      r: 68,
      g: 0,
      b: 153,
    },
    type: 'coated',
  },
  {
    code: 'Violet U',
    name: 'Violet U',
    hex: '#5E2CA5',
    rgb: {
      r: 94,
      g: 44,
      b: 165,
    },
    type: 'uncoated',
  },
  {
    code: 'Black C',
    name: 'Black C',
    hex: '#000000',
    rgb: {
      r: 0,
      g: 0,
      b: 0,
    },
    type: 'coated',
  },
  {
    code: 'Black U',
    name: 'Black U',
    hex: '#2B2B2B',
    rgb: {
      r: 43,
      g: 43,
      b: 43,
    },
    type: 'uncoated',
  },
  {
    code: 'Cool Gray 11 C',
    name: 'Cool Gray 11 C',
    hex: '#53565A',
    rgb: {
      r: 83,
      g: 86,
      b: 90,
    },
    type: 'coated',
  },
  {
    code: 'Cool Gray 11 U',
    name: 'Cool Gray 11 U',
    hex: '#63666A',
    rgb: {
      r: 99,
      g: 102,
      b: 106,
    },
    type: 'uncoated',
  },
  {
    code: 'Warm Gray 11 C',
    name: 'Warm Gray 11 C',
    hex: '#6E6259',
    rgb: {
      r: 110,
      g: 98,
      b: 89,
    },
    type: 'coated',
  },
  {
    code: 'Warm Gray 11 U',
    name: 'Warm Gray 11 U',
    hex: '#7E736F',
    rgb: {
      r: 126,
      g: 115,
      b: 111,
    },
    type: 'uncoated',
  },
  {
    code: 'White',
    name: 'White',
    hex: '#FFFFFF',
    rgb: {
      r: 255,
      g: 255,
      b: 255,
    },
    type: 'both',
  },
  {
    code: 'Process Cyan C',
    name: 'Process Cyan C',
    hex: '#0085CA',
    rgb: {
      r: 0,
      g: 133,
      b: 202,
    },
    type: 'coated',
  },
  {
    code: 'Process Magenta C',
    name: 'Process Magenta C',
    hex: '#E31E51',
    rgb: {
      r: 227,
      g: 30,
      b: 81,
    },
    type: 'coated',
  },
  {
    code: 'Process Yellow C',
    name: 'Process Yellow C',
    hex: '#FDD900',
    rgb: {
      r: 253,
      g: 217,
      b: 0,
    },
    type: 'coated',
  },
  {
    code: 'Process Black C',
    name: 'Process Black C',
    hex: '#000000',
    rgb: {
      r: 0,
      g: 0,
      b: 0,
    },
    type: 'coated',
  },
  {
    code: '032 C',
    name: '032 C',
    hex: '#EF3340',
    rgb: {
      r: 239,
      g: 51,
      b: 64,
    },
    type: 'coated',
  },
  {
    code: '032 U',
    name: '032 U',
    hex: '#F04E45',
    rgb: {
      r: 240,
      g: 78,
      b: 69,
    },
    type: 'uncoated',
  },
  {
    code: '199 C',
    name: '199 C',
    hex: '#D50032',
    rgb: {
      r: 213,
      g: 0,
      b: 50,
    },
    type: 'coated',
  },
  {
    code: '199 U',
    name: '199 U',
    hex: '#DD003F',
    rgb: {
      r: 221,
      g: 0,
      b: 63,
    },
    type: 'uncoated',
  },
  {
    code: '301 C',
    name: '301 C',
    hex: '#004B87',
    rgb: {
      r: 0,
      g: 75,
      b: 135,
    },
    type: 'coated',
  },
  {
    code: '301 U',
    name: '301 U',
    hex: '#005A9C',
    rgb: {
      r: 0,
      g: 90,
      b: 156,
    },
    type: 'uncoated',
  },
  {
    code: '368 C',
    name: '368 C',
    hex: '#78BE20',
    rgb: {
      r: 120,
      g: 190,
      b: 32,
    },
    type: 'coated',
  },
  {
    code: '368 U',
    name: '368 U',
    hex: '#86C82F',
    rgb: {
      r: 134,
      g: 200,
      b: 47,
    },
    type: 'uncoated',
  },
  {
    code: '485 C',
    name: '485 C',
    hex: '#DA291C',
    rgb: {
      r: 218,
      g: 41,
      b: 28,
    },
    type: 'coated',
  },
  {
    code: '485 U',
    name: '485 U',
    hex: '#E03A3E',
    rgb: {
      r: 224,
      g: 58,
      b: 62,
    },
    type: 'uncoated',
  },
  {
    code: '877 C',
    name: '877 C',
    hex: '#8B8C89',
    rgb: {
      r: 139,
      g: 140,
      b: 137,
    },
    type: 'coated',
  },
  {
    code: '877 U',
    name: '877 U',
    hex: '#979897',
    rgb: {
      r: 151,
      g: 152,
      b: 151,
    },
    type: 'uncoated',
  },
];

export function getPantoneVariants(baseCode: string) {
  const coated = PANTONE_BASIC_SET.find((entry) => entry.code === `${baseCode} C`);
  const uncoated = PANTONE_BASIC_SET.find((entry) => entry.code === `${baseCode} U`);
  return { coated, uncoated };
}

export function getPantoneByType(type: PantoneEntryType) {
  return PANTONE_BASIC_SET.filter((entry) => entry.type === type || entry.type === 'both');
}
