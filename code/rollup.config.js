import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';

export default {
    input: './index.ts',
    output: {
        file: '../1satordinalsbsv.js',
        format: 'iife',
        name: 'ord',
        plugins: [terser()],
    },
    plugins: [
        resolve(),
        commonjs(),
        typescript(),
    ],
};
