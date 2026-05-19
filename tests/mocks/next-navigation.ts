import { vi } from 'vitest';

export const mockSearchParams = vi.fn(() => new URLSearchParams());
export const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams(),
  useRouter: () => ({ push: mockPush, replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  usePathname: () => '/',
  redirect: vi.fn(),
}));
