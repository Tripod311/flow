# Flow Router

A minimalistic client-side router built on top of the native `history API`.  
Perfect for SPAs, easy to embed into any project, and just a few kilobytes in size.

---

## Features

- **Zero dependencies** — pure TypeScript/JavaScript.  
- **Supports static, parametric, and wildcard routes.**  
- **Automatic route prioritization (static > parametric > wildcard).**  
- **Direct control over the history API (`pushState`, `replaceState`).**  
- **Fallback handler for unmatched routes.**

---

## Installation

```bash
npm install flow-router
```

Or simply copy the file into your project.

---

## Example Usage

```ts
const router = new Flow();

router.add("/", () => {
  console.log("Home page");
});

router.add("/about", () => {
  console.log("About page");
});

router.add("/user/:id", (params) => {
  console.log("User page:", params.id);
});

router.add("/files/*", (params) => {
  console.log("Files path:", params[0]);
});

router.setFallback(() => {
  console.log("404 Not Found");
});

router.init();

// Navigate programmatically:
router.navigate("/about");
router.navigate("/user/42");
router.navigate("/files/images/avatar.png");
```

---

## API

### `router.init()`
Starts listening to `popstate` events and performs the initial route matching for the current URL.

### `router.deinit()`
Stops listening to `popstate` events.

### `router.add(path: string, handler: RouteHandler)`
Registers a new route.  
- `:param` — parametric segment.  
- `*` — wildcard segment (must be the last one).  

Examples:  
- `/user/:id` → `{ id: "42" }`  
- `/files/*` → `{ 0: "images/avatar.png" }`

### `router.setFallback(handler: () => void)`
Sets a fallback handler that runs when no routes match.

### `router.match(path: string)`
Performs a manual match of the given path (usually called internally).

### `router.navigate(path: string, replace: boolean = false)`
Changes the URL via `pushState` or `replaceState` and runs the matched route handler.

---

## License

MIT
