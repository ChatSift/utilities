import { Boom } from '@hapi/boom';
import { s } from '@sapphire/shapeshift';
import type { Request, Response } from 'polka';
import { afterEach, expect, test, vi } from 'vitest';
import { validate } from '../validate.js';

const next = vi.fn();

afterEach(() => {
	vi.clearAllMocks();
});

const makeMockedRequest = (data: any) => data as Request;
const mockedResponse = {} as unknown as Response;

test('invalid schema', () => {
	const validator = validate(
		s.object({
			foo: s.string,
		}).strict,
	);

	void validator(makeMockedRequest({ body: { foo: 1 } }), mockedResponse, next);
	expect(next).toHaveBeenCalledWith(expect.any(Boom));
});

test('valid schema', () => {
	const validator = validate(
		s.object({
			foo: s.string,
			bar: s.number.default(5),
		}).strict,
	);

	const req = { body: { foo: 'bar' } };

	void validator(makeMockedRequest(req), mockedResponse, next);
	expect(next).toHaveBeenCalledWith();
	expect(req).toHaveProperty('body', { foo: 'bar', bar: 5 });
});
