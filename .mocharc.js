module.exports = {
    extension: ['ts'],
    require: [
        'ts-node/register/transpile-only',
        'tsconfig-paths/register',
    ],
    spec: "./**/*.spec.ts",
}
