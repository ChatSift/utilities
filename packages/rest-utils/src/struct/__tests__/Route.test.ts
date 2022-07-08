/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/consistent-type-assertions */

import { ServerResponse } from 'http';
import { Middleware, NextHandler, Polka, Request } from 'polka';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { Route, RouteMethod } from '../Route';

const serverMock = {
	get: vi.fn(),
	post: vi.fn(),
	put: vi.fn(),
	delete: vi.fn(),
	patch: vi.fn(),
};

afterEach(() => {
	vi.clearAllMocks();
});

const server = serverMock as unknown as Polka;

class NoMiddlewareTestRoute extends Route<void, never> {
	public info = { method: RouteMethod.get, path: '/' } as const;
	public middleware: Middleware[] = [];

	public handle = vi.fn();
}

test('registering a route', () => {
	const route = new NoMiddlewareTestRoute();
	route.register(server);

	expect(serverMock.get).toHaveBeenCalled();
	expect(serverMock.get).toHaveBeenCalledWith('/', expect.any(Function));
});

describe('route handler', () => {
	test('without middleware', async () => {
		const route = new NoMiddlewareTestRoute();
		route.register(server);

		const handle: Middleware = serverMock.get.mock.calls[0][1];
		const handleParams = [{} as Request, {} as ServerResponse, vi.fn()] as const;

		expect(await handle(...handleParams)).toBe(undefined);

		expect(route.handle).toHaveBeenCalled();
		expect(route.handle).toHaveBeenCalledWith(...handleParams);
	});

	test('with middleware and error', async () => {
		const middleware = (_: Request, __: ServerResponse, next: NextHandler) => next();

		class TestRoute extends Route<void, never> {
			public info = { method: RouteMethod.get, path: '/owo' } as const;

			public middleware: Middleware[] = [middleware];

			public handle = vi.fn(() => {
				throw new Error('test');
			});
		}

		const route = new TestRoute();
		route.register(server);

		expect(serverMock.get).toHaveBeenCalled();
		expect(serverMock.get).toHaveBeenCalledWith('/owo', middleware, expect.any(Function));

		const handle: Middleware = serverMock.get.mock.calls[0][2];
		const next = vi.fn();
		const handleParams = [{} as Request, {} as ServerResponse, next] as const;

		expect(await handle(...handleParams)).toBe(undefined);
		expect(route.handle).toHaveBeenCalled();
		expect(route.handle).toHaveBeenCalledWith(...handleParams);
		expect(next).toHaveBeenCalled();
		expect(next).toHaveBeenCalledWith(new Error('test'));
	});
});
