import type { FormulaIngredient } from '@/models/formula';

export interface FormulaDraftChange {
  value: string;
  tokens: FormulaIngredient[];
  hash: string | null;
  segments: string[];
  units: string[];
}

