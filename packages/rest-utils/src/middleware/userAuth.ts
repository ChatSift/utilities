/* istanbul ignore file */

import { unauthorized } from '@hapi/boom';
import cookie from 'cookie';
import type { APIUser } from 'discord-api-types/v10';
import type { NextHandler, Request, Response } from 'polka';
import { request } from 'undici';

declare module 'polka' {
	export interface Request {
		user?: APIUser;
	}
}

export function userAuth(fallthrough = false) {
	return async (req: Request, _: Response, next: NextHandler) => {
		const cookies = cookie.parse(req.headers.cookie ?? '');
		const token = cookies.access_token ?? req.headers.authorization;

		if (!token) {
			return next(fallthrough ? undefined : unauthorized('missing authorization header', 'Bearer'));
		}

		const result = await request('https://discord.com/api/v10/users/@me', {
			headers: {
				authorization: `Bearer ${token}`,
			},
		});

		if (result.statusCode >= 200 && result.statusCode < 300) {
			const data = (await result.body.json()) as APIUser;
			req.user = data;
		}

		return next(req.user || fallthrough ? undefined : unauthorized('invalid discord access token'));
	};
}
