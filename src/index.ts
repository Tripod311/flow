export type RouteHandler = (routeParams: Record<string, string>, urlParams: URLSearchParams) => void;

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
			this.match(location.pathname);
		}
	}

	init () {
		window.addEventListener("popstate", this.stateListener);

		this.match(location.pathname);
	}

	deinit () {
		window.removeEventListener("popstate", this.stateListener);
	}

	setFallback (handler: () => void) {
		this.fallback = handler;
	}

	add (path: string, handler: RouteHandler) {
		const { pattern, keys } = Flow.pathToRegex(path);
		const route: Route = {
			pathname: path,
			pattern: pattern,
			keys: keys,
			staticParts: 0,
			parametricParts: 0,
			handler: handler
		};
		let isWildCard = false;

		const sp = path.split('/');

		for (const hop of sp) {
			if (hop === "*") {
				if (sp.indexOf(hop) !== sp.length - 1) {
					console.warn(`Wildcard '*' should be last hop: ${path}`);
				}
				isWildCard = true;
			} else if (hop.charAt(0) === ':') {
				route.parametricParts++;
			} else {
				route.staticParts++;
			}
		}

		if (isWildCard) {
			this.injectRoute(route, this.wildcardRoutes);
		} else if (route.parametricParts > 0) {
			this.injectRoute(route, this.parametricRoutes);
		} else {
			this.injectRoute(route, this.staticRoutes);
		}
	}

	private injectRoute (route: Route, collection: Route[]) {
		let index = 0;

		while (index < collection.length) {
			const r = collection[index];

			if ((r.parametricParts < route.parametricParts) ||
				(r.parametricParts === route.parametricParts && r.staticParts < route.staticParts)) {

				collection.splice(index, 0, route);
				return;
			}

			index++;
		}

		collection.push(route);
	}

	private static pathToRegex (path: string) {
		const keys: string[] = [];

		const regex = path
			.split("/")
			.map(seg => {
				if (seg.startsWith(":")) {
					keys.push(seg.slice(1));
					return "([^/]+)";
				}
				if (seg === "*") {
					return "(.*)?";
				}
				return seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // escape
			})
			.join("/");

		return { 
			pattern: new RegExp("^" + regex + "$"), 
			keys 
		};
	}

	match (path: string) {
		const [pathname, search = ""] = path.split("?");
		const params = new URLSearchParams(search);

		for (const route of this.staticRoutes) {
			if (pathname === route.pathname) {
				route.handler({}, params);
				return;
			}
		}

		for (const route of this.parametricRoutes) {
			const match = pathname.match(route.pattern);

			if (match !== null) {
				const routeParams: Record<string, string> = {};

				for (let i=0; i<route.keys.length; i++) {
					routeParams[route.keys[i]] = match[i+1];
				}

				route.handler(routeParams, params);
				return;
			}
		}

		for (const route of this.wildcardRoutes) {
			const match = pathname.match(route.pattern);

			if (match !== null) {
				const routeParams: Record<string, string> = {};

				for (let i=0; i<route.keys.length; i++) {
					routeParams[route.keys[i]] = match[i+1];
				}

				route.handler(routeParams, params);
				return;
			}
		}

		if (this.fallback !== undefined) this.fallback();
	}

	navigate (path: string, replace: boolean = false) {
		if (replace) {
			history.replaceState(null, "", path);
		} else {
			history.pushState(null, "", path);
		}

		this.match(path);
	}
}