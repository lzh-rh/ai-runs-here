import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { isPublished } from '../src/lib/posts';

const sourcePath = (relativePath: string) => fileURLToPath(new URL(`../${relativePath}`, import.meta.url));

function source(relativePath: string) {
  const path = sourcePath(relativePath);
  expect(existsSync(path), `${relativePath} should exist`).toBe(true);
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

describe('production publication boundary', () => {
  it('excludes drafts from every downstream production query', () => {
    const draft = { id: 'private-draft', data: { draft: true } } as never;
    expect(isPublished(draft, 'production')).toBe(false);
  });

  it('applies the same production boundary to RSS before sorting', () => {
    const feed = source('src/pages/rss.xml.ts');

    expect(feed).toContain("isPublished(post, 'production')");
    expect(feed).toMatch(/sortNewest\([\s\S]*getPostCollection\(\)[\s\S]*\.filter/);
    expect(feed).toContain("link: `/articles/${post.id}/`");
  });
});

describe('newsletter progressive enhancement', () => {
  function setupNewsletterScript(fetchImpl: typeof fetch) {
    const component = source('src/components/NewsletterForm.astro');
    const script = component.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? '';
    expect(script, 'NewsletterForm should contain one executable script').not.toBe('');

    class FakeElement {
      textContent = '';
    }
    class FakeInput extends FakeElement {
      value = 'reader@example.com';
    }
    class FakeForm extends FakeElement {
      action = 'https://buttondown.com/api/emails/embed-subscribe/test';
      method = 'post';
      email = new FakeInput();
      status = new FakeElement();
      listener?: (event: { preventDefault(): void }) => Promise<void>;
      elements = { namedItem: (name: string) => (name === 'email' ? this.email : null) };

      querySelector(selector: string) {
        return selector === '[data-newsletter-status]' ? this.status : null;
      }

      addEventListener(_event: string, listener: (event: { preventDefault(): void }) => Promise<void>) {
        this.listener = listener;
      }
    }

    const form = new FakeForm();
    const document = { querySelectorAll: vi.fn().mockReturnValue([form]) };
    const preventDefault = vi.fn();
    const FakeFormData = vi.fn();

    new Function(
      'document',
      'fetch',
      'FormData',
      'HTMLFormElement',
      'HTMLInputElement',
      'HTMLElement',
      script
    )(document, fetchImpl, FakeFormData, FakeForm, FakeInput, FakeElement);

    return { form, preventDefault, submit: () => form.listener?.({ preventDefault }) };
  }

  it('clears the email only after an enhanced subscription succeeds', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    const { form, preventDefault, submit } = setupNewsletterScript(fetchImpl);

    await submit();

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(fetchImpl).toHaveBeenCalledWith(
      form.action,
      expect.objectContaining({ method: 'POST', body: expect.anything() })
    );
    expect(form.email.value).toBe('');
    expect(form.status.textContent).toBe('Subscribed. Check your inbox to confirm.');
  });

  it.each([
    ['network failure', () => Promise.reject(new Error('offline'))],
    ['non-success response', () => Promise.resolve({ ok: false })]
  ])('retains the email after %s', async (_name, response) => {
    const { form, submit } = setupNewsletterScript(vi.fn(response) as never);

    await submit();

    expect(form.email.value).toBe('reader@example.com');
    expect(form.status.textContent).toBe('Subscription did not complete. Check your connection and try again.');
  });

  it('keeps a native Buttondown POST and an accessible status region', () => {
    const component = source('src/components/NewsletterForm.astro');

    expect(component).toContain('https://buttondown.com/api/emails/embed-subscribe/');
    expect(component).toMatch(/<form[^>]*method="post"/);
    expect(component).toMatch(/<input[^>]*name="email"[^>]*type="email"[^>]*required/);
    expect(component).toContain('name="embed"');
    expect(component).toContain('value="1"');
    expect(component).toContain('aria-live="polite"');
  });
});

describe('article metadata', () => {
  it('publishes article dates while retaining site-derived canonical URLs', () => {
    const baseLayout = source('src/layouts/BaseLayout.astro');
    const postLayout = source('src/layouts/PostLayout.astro');

    expect(baseLayout).toContain('publishedDate?: Date');
    expect(baseLayout).toContain('updatedDate?: Date');
    expect(baseLayout).toContain('property="article:published_time"');
    expect(baseLayout).toContain('property="article:modified_time"');
    expect(baseLayout).toContain('new URL(Astro.url.pathname, Astro.site)');
    expect(postLayout).toContain('publishedDate={post.data.draft ? undefined : post.data.publishedDate}');
    expect(postLayout).toContain('updatedDate={post.data.updatedDate}');
  });
});
