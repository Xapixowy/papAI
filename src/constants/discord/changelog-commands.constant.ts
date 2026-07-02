export const CHANGELOG_COMMAND_CONFIG = {
  name: 'changelog',
  description: "View what's new in each bot version",
} as const;

export const CHANGELOG_TYPE_LABELS: Record<string, string> = {
  feat: '✨ New',
  fix: '🐛 Fix',
  improve: '⚡ Improve',
  remove: '🗑️ Remove',
};
