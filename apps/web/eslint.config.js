import base from '@chess3d/eslint-config';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  ...base,
  { ignores: ['public/**', 'next-env.d.ts'] },
  { files: ['scripts/**'], languageOptions: { globals: { console: 'readonly' } } },
  reactHooks.configs.flat['recommended-latest'],
  {
    // react-three-fiber mutates three.js objects (uniforms, positions) inside the frame
    // loop by design; the React Compiler immutability rule does not apply there.
    files: ['src/components/{board,scene,scenery}/**/*.tsx'],
    rules: { 'react-hooks/immutability': 'off' },
  },
];
