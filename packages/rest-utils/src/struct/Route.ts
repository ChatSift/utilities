import type { IError, Middleware, NextHandler, Polka, Request, Response } from 'polka';

/**
 * Valid HTTP methods
 */
export enum RouteMethod {
	get = 'get',
	post = 'post',
	put = 'put',
	delete = 'delete',
	patch = 'patch',
}

/**
 * Information about a route
 */
export interface RouteInfo {
	/**
	 * Path of this route on the webserver
	 */
	path: string;
	/**
	 * Method of this route
	 */
	method: RouteMethod;
}

/**
 * Represents a route on the server
 */
export abstract class Route {
	public abstract info: RouteInfo;

	/**
	 * Middleware to use for this route - needs to be overriden by subclasses
	 */
	public abstract middleware?: Middleware[];

	/**
	 * Handles a request to this route - if not defined all other handlers are ignored
	 */
	public abstract handle(req: Request, res: Response, next?: NextHandler): unknown;

	/**
	 * Registers this route
	 * @param server The Polka webserver to register this route onto
	 */
	public register(server: Polka): void {
		server[this.info.method](this.info.path, ...(this.middleware ?? []), async (req, res, next) => {
			try {
				await this.handle(req, res, next);
			} catch (e) {
				void next(e as IError);
			}
		});
	}
}
