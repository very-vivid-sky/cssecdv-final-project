import globals from "globals";

export default [
    {
        ignores: ["**/frontend/*", "**/backend/*", "eslint.config.mjs"],
    },
    {
        languageOptions: { sourceType: "commonjs" },
        rules: {
            // disable semicolon
            "semi": ["error", "never"],
            // 4 space indentation
            "indent": ["error", 4],
            // disallow mixing spaces and tabs
            "no-mixed-spaces-and-tabs": "error",
            // no dangling commas
            "comma-dangle": ["error", "always-multiline"],
            // no trailing spaces
            "no-trailing-spaces": "error",
            // no empty blocks
            "no-empty": "error",
            // no empty functions
            "no-empty-function": "error",
            // enforce camelcase
            "camelcase": "error",
            // enforce no unused vars
            "no-unused-vars": ["error", { args: "none" }],
            // enforce no unused expressions
            "no-unused-expressions": "error",
            // enforce no unused labels
            "no-unused-labels": "error",
            // enforce no useless return
            "no-useless-return": "error",
            // enforce no useless escape
            "no-useless-escape": "error",
            // enforce maximum 1 empty line
            "no-multiple-empty-lines": ["error", { "max": 1 }],
            // enforce single quotes
            "quotes": ["error", "single"],
        }
    },
    // { languageOptions: { globals: globals.node } },
];

