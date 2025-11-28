import { defineConfig } from 'tsup';

export default defineConfig({
  // 入口文件
  entry: ['src/index.ts'],
  
  // 输出格式：ESM 和 CommonJS
  format: ['esm', 'cjs'],
  
  // 生成类型声明文件
  dts: true,
  
  // 生成 sourcemap
  sourcemap: true,
  
  // 清理输出目录
  clean: true,
  
  // 代码分割
  splitting: false,
  
  // 压缩代码
  minify: false,
  
  // 外部依赖（不打包）
  external: [],
  
  // 目标环境
  target: 'es2022',
  
  // 平台
  platform: 'browser',
  
  // 输出目录
  outDir: 'dist',
  
  // 启用 tree-shaking
  treeshake: true,
  
  // 输出文件命名
  outExtension({ format }) {
    return {
      js: format === 'esm' ? '.mjs' : '.js',
    };
  },
});

