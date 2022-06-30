import { vi } from 'vitest';

export function Http2ServerResponse() {
	return {
		setHeader: vi.fn(),
		getHeader: vi.fn(),
		end: vi.fn(),
	};
}
