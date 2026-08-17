import { describe, expect, it } from 'vitest';
import { withBase } from './site';

describe('withBase', () => {
  it('joins root-relative paths to deployment subpaths', () => {
    expect(withBase('/topics/mcp/', '/ai-runs-here/')).toBe('/ai-runs-here/topics/mcp/');
  });

  it('normalizes base paths without a trailing slash', () => {
    expect(withBase('/about/', '/ai-runs-here')).toBe('/ai-runs-here/about/');
  });
});
