// Simple test to verify the Ink TUI implementation works

describe('Ink TUI Implementation', () => {
  it('should have correct package configuration', () => {
    const pkg = require('../package.json');
    
    expect(pkg.name).toBe('aifs-commander-tui-ink');
    expect(pkg.type).toBe('module');
    expect(pkg.dependencies.ink).toBeDefined();
    expect(pkg.dependencies.react).toBeDefined();
  });

  it('should have correct TypeScript configuration', () => {
    const tsconfig = require('../tsconfig.json');
    
    expect(tsconfig.compilerOptions.target).toBe('ES2020');
    expect(tsconfig.compilerOptions.module).toBe('ESNext');
    expect(tsconfig.compilerOptions.jsx).toBe('react-jsx');
  });

  it('should have correct Jest configuration', () => {
    const jestConfig = require('../jest.config.js');
    
    expect(jestConfig.preset).toBe('ts-jest/presets/default-esm');
    expect(jestConfig.testEnvironment).toBe('node');
    expect(jestConfig.extensionsToTreatAsEsm).toContain('.ts');
    expect(jestConfig.extensionsToTreatAsEsm).toContain('.tsx');
  });
});
