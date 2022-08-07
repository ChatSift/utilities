import { Http2ServerResponse } from 'http2';
import { badData, badRequest, internal, unauthorized } from '@hapi/boom';
import { s } from '@sapphire/shapeshift';
import type { Response } from 'polka';
import { afterEach, expect, test, vi } from 'vitest';
import { sendBoom } from '../sendBoom';

vi.mock('http2');

const MockedResponse = Http2ServerResponse as unknown as new () => Response;

afterEach(() => {
	vi.clearAllMocks();
});

test('with bad request', () => {
	const error = badRequest();
	const res = new MockedResponse();
	sendBoom(error, res);

	expect(res.statusCode).toBe(400);
	expect(res.setHeader).toHaveBeenCalledTimes(0);
	expect(res.end).toHaveBeenCalledWith('{"statusCode":400,"error":"Bad Request","message":"Bad Request"}');
});

test('with internal server error', () => {
	const error = internal();
	const res = new MockedResponse();
	sendBoom(error, res);

	expect(res.statusCode).toBe(500);
	expect(res.setHeader).toHaveBeenCalledTimes(0);
	expect(res.end).toHaveBeenCalledWith(
		'{"statusCode":500,"error":"Internal Server Error","message":"An internal server error occurred"}',
	);
});

test('with headers', () => {
	const error = unauthorized('foo', ['abc', 'def']);
	const res = new MockedResponse();
	sendBoom(error, res);

	expect(res.statusCode).toBe(401);
	expect(res.setHeader).toHaveBeenCalledTimes(1);
	expect(res.setHeader).toHaveBeenCalledWith('WWW-Authenticate', 'abc, def');
	expect(res.end).toHaveBeenCalledWith('{"statusCode":401,"error":"Unauthorized","message":"foo"}');
});

test('shapeshift error edge case', () => {
	const schema = s.object({
		foo: s.string,
	}).strict;
	const shapeshiftError = schema.run({ foo: 123 }).error!;

	const error = badData(shapeshiftError.message, shapeshiftError);
	const res = new MockedResponse();

	sendBoom(error, res);
	expect(res.statusCode).toBe(422);
	expect(res.setHeader).toHaveBeenCalledTimes(0);
	expect(res.end).toHaveBeenCalledWith(
		JSON.stringify({
			statusCode: 422,
			error: 'Unprocessable Entity',
			message: 'Received one or more errors',
			errors: [['foo', { name: 'Error', validator: 's.string', given: 123 }]],
		}),
	);
});
