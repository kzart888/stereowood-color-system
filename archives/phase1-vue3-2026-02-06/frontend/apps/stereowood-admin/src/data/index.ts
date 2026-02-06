export { PANTONE_BASIC_SET, getPantoneByType, getPantoneVariants } from './pantone-basic';

export async function loadPantoneFullSet() {
  const module = await import('./pantone-full');
  return module.PANTONE_FULL_SET;
}
