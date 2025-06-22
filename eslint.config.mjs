import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import importPlugin from "eslint-plugin-import";
import tseslint from 'typescript-eslint';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
    baseDirectory: __dirname,
});

const eslintConfig = tseslint.config(
    ...compat.extends("next/core-web-vitals", "next/typescript"),
    tseslint.configs.strict,
    importPlugin.flatConfigs.typescript,
    {
        rules: {
            semi: [ 'error', 'always' ],
            'import/order': [ 'error', { alphabetize: { order: 'asc' } } ],
            '@typescript-eslint/no-non-null-assertion': ['off'],
        },
    },
);

export default eslintConfig;
