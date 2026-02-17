export const queryKeys = {
  programs: {
    all: ['programs'] as const,
    detail: (id: string): readonly ['programs', string] => ['programs', id] as const,
  },
  catalog: {
    all: ['catalog'] as const,
  },
} as const;
