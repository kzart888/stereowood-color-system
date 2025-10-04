import type { ColorSwatchMetadata } from '@/models/color';

export interface PureColorSource {
  imageUrl: string;
  averageHex?: string;
  averageSwatch?: ColorSwatchMetadata;
  updatedAt?: string;
}

export interface PureColorComputationResult {
  hex: string;
  rgb: [number, number, number];
}

export interface PureColorAdapter {
  computeAverageColor(file: File): Promise<PureColorComputationResult>;
}

export function isPureColorAvailable(source: PureColorSource | undefined): boolean {
  return Boolean(source?.averageHex && source?.averageSwatch);
}
