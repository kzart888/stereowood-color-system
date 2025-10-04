import type { ColorSwatchMetadata } from '@/models/color';

export type SwatchKind = 'image' | 'solid' | 'empty';

export interface SwatchPayload {
  imageUrl?: string;
  pureColor?: ColorSwatchMetadata;
  fallbackColor?: string;
  isColorEssence?: boolean;
}

export function resolveSwatch(payload: SwatchPayload): {
  kind: SwatchKind;
  style: Record<string, string>;
} {
  if (payload.isColorEssence && payload.imageUrl) {
    return {
      kind: 'image',
      style: {
        backgroundImage: `url(${payload.imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      },
    };
  }

  if (payload.pureColor) {
    return {
      kind: 'solid',
      style: {
        '--swatch-color': payload.pureColor.hex,
        backgroundColor: payload.pureColor.hex,
      },
    };
  }

  if (payload.imageUrl) {
    return {
      kind: 'image',
      style: {
        backgroundImage: `url(${payload.imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      },
    };
  }

  return {
    kind: 'empty',
    style: {
      backgroundColor: payload.fallbackColor ?? '#e0e0e6',
    },
  };
}
