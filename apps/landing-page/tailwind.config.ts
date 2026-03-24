import type { Config } from 'tailwindcss';
import preset from '@debridgers/shared-theme';

export default {
  presets: [preset],
  content: ['./app/**/*.{ts,tsx}']
} satisfies Config;