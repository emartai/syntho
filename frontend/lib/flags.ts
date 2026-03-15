export const FLAGS = {
  MARKETPLACE: process.env.NEXT_PUBLIC_FLAG_MARKETPLACE === 'true',
  API_KEYS: process.env.NEXT_PUBLIC_FLAG_API_KEYS === 'true',
  GROQ_AI: process.env.NEXT_PUBLIC_FLAG_GROQ_AI === 'true',
  ADMIN_PANEL: process.env.NEXT_PUBLIC_FLAG_ADMIN_PANEL === 'true',
  NOTIFICATIONS: process.env.NEXT_PUBLIC_FLAG_NOTIFICATIONS === 'true',
  TEAM_ACCOUNTS: process.env.NEXT_PUBLIC_FLAG_TEAM_ACCOUNTS === 'true',
};