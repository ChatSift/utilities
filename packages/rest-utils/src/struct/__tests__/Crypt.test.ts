import 'reflect-metadata';
import { Buffer } from 'node:buffer';
import { randomBytes } from 'node:crypto';
import { container } from 'tsyringe';
import { expect, test, vi } from 'vitest';
import { Crypt } from '../Crypt.js';

vi.mock('crypto', async () => {
	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	const original: typeof import('crypto') = await vi.importActual('crypto');
	// eslint-disable-next-line unicorn/consistent-function-scoping
	const randomBytes = (len: number) => Buffer.from(Array.from<number>({ length: len }).fill(1));
	return {
		...original,
		randomBytes,
	};
});

container.register<string>(Crypt.kEncryptionKey, {
	useValue: randomBytes(32).toString('base64'),
});
const crypt = container.resolve(Crypt);

const PLAIN_DATA = 'this is very sensitive';
const SECRET_DATA = crypt.encrypt(PLAIN_DATA);

test('encrypt', () => {
	expect(SECRET_DATA).toBe('AQEBAQEBAQEBAQEBAQEBAejE/bWU7BLYic/V/zbJLfwqp2c5B/8=');
});

test('decrypt', () => {
	expect(crypt.decrypt(SECRET_DATA)).toBe(PLAIN_DATA);
});
