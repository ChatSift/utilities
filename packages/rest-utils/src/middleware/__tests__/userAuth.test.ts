import { Boom } from '@hapi/boom';
import type { Request, Response } from 'polka';
import { request as rawRequest } from 'undici';
import { afterEach, describe, expect, Mock, test, vi } from 'vitest';
import { userAuth } from '../userAuth';

type RecursivePartial<T> = {
	[P in keyof T]?: T[P] extends (infer U)[]
		? RecursivePartial<U>[]
		: T[P] extends object
		? RecursivePartial<T[P]>
		: T[P];
};
type PartializePromise<T extends Promise<any>> = Promise<RecursivePartial<Awaited<T>>>;

vi.mock('undici');
const request = rawRequest as unknown as Mock<
	Parameters<typeof rawRequest>,
	PartializePromise<ReturnType<typeof rawRequest>>
>;

const next = vi.fn();

afterEach(() => {
	vi.clearAllMocks();
});

const makeMockedRequest = (data: any) => data as Request;
const mockedResponse = {} as unknown as Response;

test('logged in', async () => {
	const auth = userAuth();
	request.mockReturnValue(Promise.resolve({ statusCode: 200, body: { json: () => Promise.resolve({ id: '123' }) } }));

	await auth(makeMockedRequest({ headers: { authorization: 'owo' } }), mockedResponse, next);
	expect(request).toHaveBeenCalledWith('https://discord.com/api/v10/users/@me', {
		headers: {
			authorization: 'Bearer owo',
		},
	});
	expect(next).toHaveBeenCalledWith(undefined);
});

describe('not logged in', () => {
	test('no auth header', async () => {
		const auth = userAuth();

		await auth(makeMockedRequest({ headers: {} }), mockedResponse, next);
		expect(request).not.toHaveBeenCalled();
		expect(next).toHaveBeenCalledWith(expect.any(Boom));
	});

	test('non-2xx response', async () => {
		const auth = userAuth();
		request.mockReturnValue(Promise.resolve({ statusCode: 401 }));

		await auth(makeMockedRequest({ headers: { authorization: 'owo' } }), mockedResponse, next);
		expect(request).toHaveBeenCalledWith('https://discord.com/api/v10/users/@me', {
			headers: {
				authorization: 'Bearer owo',
			},
		});
		expect(next).toHaveBeenCalledWith(expect.any(Boom));
	});

	test('fallthrough', async () => {
		const auth = userAuth(true);
		request.mockReturnValue(Promise.resolve({ statusCode: 401 }));

		await auth(makeMockedRequest({ headers: { authorization: 'owo' } }), mockedResponse, next);
		expect(request).toHaveBeenCalledWith('https://discord.com/api/v10/users/@me', {
			headers: {
				authorization: 'Bearer owo',
			},
		});
		expect(next).toHaveBeenCalledWith(undefined);
	});
});
