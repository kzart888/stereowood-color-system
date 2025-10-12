export interface FormulaIngredient {
  name: string;
  base: number;
  unit: string;
  invalid: boolean;
}

export interface FormulaLine {
  name: string;
  amount: string;
  unit: string;
}

export interface StructuredFormula {
  lines: FormulaLine[];
  maxNameChars: number;
}
