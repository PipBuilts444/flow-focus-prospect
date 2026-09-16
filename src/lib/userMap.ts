// Maps Supabase auth emails to owner names shown in the app.
// Update these to the exact emails used when creating accounts.
export const EMAIL_TO_OWNER: Record<string, string> = {
  'pippa@co-ex.com': 'Pippa Bradley-Dixon',
  'craig@weareorbis.com': 'Craig Davies',
  'adam.s@weareorbis.com': 'Adam Solomons',
  'henry@weareorbis.com': 'Henry Hickley',
  'lucy@weareorbis.com': 'COEX',
};

// Accounts with admin privileges (wired up when admin features are added).
export const ADMIN_EMAILS = ['lucy@weareorbis.com'];
