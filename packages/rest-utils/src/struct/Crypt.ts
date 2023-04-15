import { Buffer } from 'node:buffer';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { singleton, inject } from 'tsyringe';

@singleton()
export class Crypt {
	public static readonly kEncryptionKey = Symbol('crypt encryption key');

	public constructor(@inject(Crypt.kEncryptionKey) private readonly encryptionKey: string) {}

	public encrypt(data: string) {
		const key = Buffer.from(this.encryptionKey, 'base64');
		const iv = randomBytes(16);

		const cipher = createCipheriv('aes-256-ctr', key, iv);
		return Buffer.concat([iv, cipher.update(data, 'utf8'), cipher.final()]).toString('base64');
	}

	public decrypt(data: string) {
		const buffer = Buffer.from(data, 'base64');

		const key = Buffer.from(this.encryptionKey, 'base64');
		const iv = buffer.slice(0, 16);

		const decipher = createDecipheriv('aes-256-ctr', key, iv);

		return Buffer.concat([decipher.update(buffer.slice(16, buffer.length)), decipher.final()]).toString('utf8');
	}
}
