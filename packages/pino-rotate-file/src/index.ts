import { once } from 'node:events';
import { constants as fsConstants } from 'node:fs';
import { readdir, unlink, access, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import build from 'pino-abstract-transport';
import { prettyFactory, PrettyOptions } from 'pino-pretty';
import { SonicBoom } from 'sonic-boom';

// Their typings don't include prettyFactory for whatever reason
declare module 'pino-pretty' {
	export function prettyFactory(options?: PrettyOptions): (chunk: Record<string, any>) => string;
}

const ONE_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_MAX_AGE_DAYS = 14;

/**
 * Options for the transport
 */
export interface PinoRotateFileOptions {
	dir: string;
	maxAgeDays?: number;
	mkdir?: boolean;
	prettyOptions?: PrettyOptions;
}

interface Dest {
	path: string;
	stream: SonicBoom;
}

function createFileName(time: number): string {
	return `${new Date(time).toISOString().split('T')[0]!}.log`;
}

async function cleanup(dir: string, maxAgeDays: number): Promise<void> {
	const files = await readdir(dir);
	const promises: Promise<void>[] = [];

	for (const file of files) {
		if (!file.endsWith('.log')) {
			continue;
		}

		const date = new Date(file.split('.')[0]!).getTime();
		const now = Date.now();

		if (now - date >= maxAgeDays * ONE_DAY) {
			promises.push(unlink(join(dir, file)));
		}
	}

	await Promise.all(promises);
}

async function createDest(path: string): Promise<Dest> {
	const stream = new SonicBoom({ dest: path });
	await once(stream, 'ready');

	return {
		path,
		stream,
	};
}

async function endStream(stream: SonicBoom) {
	stream.end();
	await once(stream, 'close');
}

export async function pinoRotateFile(options: PinoRotateFileOptions) {
	const pretty = prettyFactory(
		options.prettyOptions ?? {
			colorize: false,
			levelFirst: true,
			translateTime: true,
		},
	);

	if (options.mkdir) {
		try {
			await access(options.dir, fsConstants.F_OK);
		} catch (error) {
			await mkdir(options.dir);
		}
	}

	await access(options.dir, fsConstants.R_OK | fsConstants.W_OK);
	await cleanup(options.dir, options.maxAgeDays ?? DEFAULT_MAX_AGE_DAYS);

	let dest = await createDest(join(options.dir, createFileName(Date.now())));
	return build(
		async (source: AsyncIterable<{ time: number }>) => {
			for await (const payload of source) {
				const path = join(options.dir, createFileName(Date.now()));
				if (dest.path !== path) {
					await cleanup(options.dir, options.maxAgeDays ?? DEFAULT_MAX_AGE_DAYS);
					await endStream(dest.stream);
					dest = await createDest(path);
				}

				const toDrain = !dest.stream.write(pretty(payload));
				if (toDrain) {
					await once(dest.stream, 'drain');
				}
			}
		},
		{
			close: async () => {
				await cleanup(options.dir, options.maxAgeDays ?? DEFAULT_MAX_AGE_DAYS);
				await endStream(dest.stream);
			},
		},
	);
}

export default pinoRotateFile;
