const gbpFull = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0, maximumFractionDigits: 0 });
const gbpCompact = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', notation: 'compact', maximumFractionDigits: 1 });

/** Format a number as GBP, e.g. £12,500 */
export const formatGBP = (value: number): string => gbpFull.format(value);

/** Compact GBP, e.g. £12.5K */
export const formatGBPCompact = (value: number): string => gbpCompact.format(value);

/** Format a raw string for display in an input (adds commas), e.g. "12500" → "12,500" */
export const formatInputDisplay = (raw: string): string => {
  const num = raw.replace(/[^0-9.]/g, '');
  if (!num) return '';
  const parts = num.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

/** Strip formatting from a display string back to raw number string */
export const stripFormatting = (display: string): string => display.replace(/[^0-9.]/g, '');
