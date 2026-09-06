export type RouteHandler = (
	routeParams: Record<string, string>,
	urlParams: URLSearchParams
) => void;

export interface Route {
	pathname: string;
	pattern: RegExp;
	keys: string[];
	staticParts: number;
	parametricParts: number;
	handler: RouteHandler;
}

export class Flow {
	private staticRoutes: Route[] = [];
	private parametricRoutes: Route[] = [];
	private wildcardRoutes: Route[] = [];
	private fallback?: () => void;
	private stateListener: () => void;

	constructor () {
		this.stateListener = () => {
			this.match(
				location.pathname + location.search
			);
		};
	}

	init () {
		window.addEventListener(
			"popstate",
			this.stateListener
		);

		this.match(
			location.pathname + location.search
		);
	}

	deinit () {
		window.removeEventListener(
			"popstate",
			this.stateListener
		);
	}

	setFallback (handler: () => void) {
		this.fallback = handler;
	}

	add (path: string, handler: RouteHandler) {
		const {
			pattern,
			keys,
			staticParts,
			parametricParts,
			isWildcard
		} = Flow.pathToRegex(path);

		const route: Route = {
			pathname: path,
			pattern,
			keys,
			staticParts,
			parametricParts,
			handler
		};

		if (isWildcard) {
			this.injectRoute(
				route,
				this.wildcardRoutes
			);
		} else if (parametricParts > 0) {
			this.injectRoute(
				route,
				this.parametricRoutes
			);
		} else {
			this.injectRoute(
				route,
				this.staticRoutes
			);
		}
	}

	private injectRoute (
		route: Route,
		collection: Route[]
	) {
		let index = 0;

		while (index < collection.length) {
			const current = collection[index];

			const isMoreSpecific =
				route.staticParts > current.staticParts ||
				(
					route.staticParts === current.staticParts &&
					route.parametricParts <
						current.parametricParts
				);

			if (isMoreSpecific) {
				collection.splice(index, 0, route);
				return;
			}

			index++;
		}

		collection.push(route);
	}

	private static pathToRegex (path: string) {
		if (!path.startsWith("/")) {
			throw new Error(
				`Route must start with "/": ${path}`
			);
		}

		if (path.includes("?") || path.includes("#")) {
			throw new Error(
				`Route must not contain query or hash: ${path}`
			);
		}

		const keys: string[] = [];
		const usedKeys = new Set<string>();

		let staticParts = 0;
		let parametricParts = 0;
		let isWildcard = false;

		const segments =
			path === "/"
				? []
				: path.slice(1).split("/");

		if (segments.some(segment => segment.length === 0)) {
			throw new Error(
				`Route contains an empty segment: ${path}`
			);
		}

		let regex = "^";

		if (segments.length === 0) {
			regex += "/";
		}

		for (let i = 0; i < segments.length; i++) {
			const segment = segments[i];

			if (segment === "*") {
				if (i !== segments.length - 1) {
					throw new Error(
						`Wildcard "*" must be the last segment: ${path}`
					);
				}

				isWildcard = true;
				keys.push("0");

				if (i === 0) {
					regex += "/(.*)";
				} else {
					regex += "(?:/(.*))?";
				}

				continue;
			}

			regex += "/";

			if (segment.startsWith(":")) {
				const key = segment.slice(1);

				if (key.length === 0) {
					throw new Error(
						`Route parameter name cannot be empty: ${path}`
					);
				}

				if (usedKeys.has(key)) {
					throw new Error(
						`Duplicate route parameter "${key}": ${path}`
					);
				}

				usedKeys.add(key);
				keys.push(key);
				parametricParts++;

				regex += "([^/]+)";
			} else {
				staticParts++;

				regex += segment.replace(
					/[.*+?^${}()|[\]\\]/g,
					"\\$&"
				);
			}
		}

		regex += "$";

		return {
			pattern: new RegExp(regex),
			keys,
			staticParts,
			parametricParts,
			isWildcard
		};
	}

	match (path: string) {
		const url = new URL(path, location.href);
		const pathname = url.pathname;
		const params = url.searchParams;

		for (const route of this.staticRoutes) {
			if (pathname === route.pathname) {
				route.handler({}, params);
				return;
			}
		}

		if (
			this.matchCollection(
				pathname,
				params,
				this.parametricRoutes
			)
		) {
			return;
		}

		if (
			this.matchCollection(
				pathname,
				params,
				this.wildcardRoutes
			)
		) {
			return;
		}

		this.fallback?.();
	}

	private matchCollection (
		pathname: string,
		urlParams: URLSearchParams,
		collection: Route[]
	): boolean {
		for (const route of collection) {
			const match = pathname.match(route.pattern);

			if (!match) continue;

			const routeParams: Record<string, string> =
				Object.create(null);

			for (let i = 0; i < route.keys.length; i++) {
				const value = match[i + 1] ?? "";

				try {
					routeParams[route.keys[i]] =
						decodeURIComponent(value);
				} catch {
					routeParams[route.keys[i]] = value;
				}
			}

			route.handler(routeParams, urlParams);

			return true;
		}

		return false;
	}

	navigate (
		path: string,
		replace: boolean = false
	) {
		if (replace) {
			history.replaceState(null, "", path);
		} else {
			history.pushState(null, "", path);
		}

		/*
		 * Match the URL resolved by History API rather
		 * than the original potentially relative path.
		 */
		this.match(
			location.pathname + location.search
		);
	}
}