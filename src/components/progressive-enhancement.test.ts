import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';

const componentPath = (name: string) => fileURLToPath(new URL(`./${name}.astro`, import.meta.url));

function componentSource(name: string) {
  const path = componentPath(name);
  expect(existsSync(path), `${name}.astro should exist`).toBe(true);
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

function codeCopyScript() {
  const source = componentSource('CodeCopy');
  const match = source.match(/<script>([\s\S]*?)<\/script>/);
  expect(match, 'CodeCopy should contain one executable script').not.toBeNull();
  return match?.[1] ?? '';
}

class FakeButton {
  className = '';
  textContent = '';
  type = '';
  attributes = new Map<string, string>();
  listener?: () => Promise<void>;

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }

  addEventListener(_event: string, listener: () => Promise<void>) {
    this.listener = listener;
  }

  async click() {
    await this.listener?.();
  }
}

function runCodeCopy(clipboard: { writeText(value: string): Promise<void> }) {
  const button = new FakeButton();
  const code = { textContent: 'oc whoami' };
  const pre = {
    dataset: {} as Record<string, string>,
    insertBefore(node: FakeButton) {
      expect(node).toBe(button);
    }
  };
  Object.assign(code, { parentElement: pre });

  const document = {
    querySelectorAll(selector: string) {
      expect(selector).toBe('pre > code');
      return [code];
    },
    createElement(tag: string) {
      expect(tag).toBe('button');
      return button;
    }
  };

  const script = codeCopyScript();
  new Function('document', 'navigator', 'setTimeout', script)(document, { clipboard }, setTimeout);
  return { button, code };
}

describe('CodeCopy progressive enhancement', () => {
  it('copies code, announces success, and restores its label after 1.5 seconds', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    const { button } = runCodeCopy({ writeText });

    expect(button.type).toBe('button');
    expect(button.textContent).toBe('Copy code');
    expect(button.attributes.get('aria-live')).toBe('polite');

    await button.click();

    expect(writeText).toHaveBeenCalledWith('oc whoami');
    expect(button.textContent).toBe('Copied');
    vi.advanceTimersByTime(1_500);
    expect(button.textContent).toBe('Copy code');
    vi.useRealTimers();
  });

  it('reports a clipboard failure without changing the code', async () => {
    const { button, code } = runCodeCopy({ writeText: vi.fn().mockRejectedValue(new Error('denied')) });

    await button.click();

    expect(button.textContent).toBe('Copy failed');
    expect(code.textContent).toBe('oc whoami');
  });
});

describe('Giscus resilience contract', () => {
  it('keeps an explicit fallback and an eight-second iframe timeout', () => {
    const source = componentSource('GiscusComments');

    expect(source).toContain('Comments will be available after the public GitHub Discussions repository is connected.');
    expect(source).toContain('Comments are currently unavailable. The article remains available above.');
    expect(source).toMatch(/8_?000/);
    expect(source).toContain("addEventListener('load'");
  });
});
