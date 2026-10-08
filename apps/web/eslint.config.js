import base from '@chess3d/eslint-config';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  ...base,
  { ignores: ['public/**', 'next-env.d.ts'] },
  { files: ['scripts/**'], languageOptions: { globals: { console: 'readonly' } } },
  reactHooks.configs.flat['recommended-latest'],
];
