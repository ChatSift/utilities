import type { BaseValidator } from '@sapphire/shapeshift';
import type { IError, Middleware, NextHandler, Polka, Request, Response } from 'polka';
import { jsonParser } from '../middleware/jsonParser';
import { validate } from '../middleware/validate';

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

export type TRequest<TBody> = Omit<Request, 'body'> & { body: TBody };

/**
 * Represents a route on the server
 */
export abstract class Route<TResult, TBody> {
	public readonly __internalOnlyHereForTypeInferrenceDoNotUse__!: { result: TResult; body: TBody };

	/**
	 * Base route information
	 */
	public abstract info: RouteInfo;

	/**
	 * Middleware to use for this route - needs to be overriden by subclasses
	 */
	public readonly middleware: Middleware[] = [];

	/**
	 * Schema to use for body validation. Implicitly appends a jsonParser to the middleware
	 */
	public readonly bodyValidationSchema: BaseValidator<TBody> | null = null;

	/**
	 * Handles a request to this route
	 */
	public abstract handle(req: TRequest<TBody>, res: Response, next?: NextHandler): unknown;

	public constructor() {
		if (this.bodyValidationSchema) {
			this.middleware.push(jsonParser(), validate(this.bodyValidationSchema, 'body'));
		}
	}

	/**
	 * Registers this route
	 * @param server The Polka webserver to register this route onto
	 */
	public register(server: Polka): void {
		const middleware = [];
		if (this.bodyValidationSchema) {
			middleware.push(jsonParser(), validate(this.bodyValidationSchema, 'body'));
		}

		middleware.push(...this.middleware);

		server[this.info.method](this.info.path, ...middleware, async (req, res, next) => {
			try {
				await this.handle(req as TRequest<TBody>, res, next);
			} catch (e) {
				void next(e as IError);
			}
		});
	}
}

export type ParseHttpPath<T extends string> = T extends `${infer Start}/:${string}/${infer End}`
	? ParseHttpPath<`${Start}/${string}/${End}`>
	: T extends `${infer Start}/:${string}`
	? ParseHttpPath<`${Start}/${string}`>
	: T;

export type InferRouteMethod<TRoute extends Route<any, any>> = TRoute['info']['method'];
export type InferRoutePath<TRoute extends Route<any, any>> = ParseHttpPath<TRoute['info']['path']>;
export type InferRouteResult<TRoute> = TRoute extends Route<infer TResult, any> ? TResult : never;
export type InferRouteBody<TRoute extends Route<any, any>> = TRoute['bodyValidationSchema'] extends BaseValidator<
	infer T
>
	? T
	: never;
