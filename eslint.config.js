// Só as regras recomendadas dos hooks do React (dependências de efeito, regras dos hooks).
// Sem regras de estilo: a formatação fica por conta de quem escreve.
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default [
  { ignores: ['dist', 'public'] },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { parser: tseslint.parser },
    ...reactHooks.configs.flat.recommended,
  },
];
