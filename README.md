# CV CRUD Portal

Full-stack MERN application where applicants submit CV information and admins review, approve, reject, or delete entries. The stack includes an Express API with MongoDB, JWT authentication, bcrypt-secured passwords, and a React (Vite) frontend.

## Features

- User registration/login with **dynamic JWT** + bcrypt (first user auto-promoted to admin)
- **Refresh token support** with automatic token renewal
- Built-in default admin (`admin@123` / `password@123`) plus user registration/login
- Authenticated CV submission, edit (while pending), and deletion
- Admin dashboard to list, approve, reject, or delete CVs
- Form validation on both server (Joi) and client (HTML constraints)
- API service helpers and token persistence on the frontend

## Recent Changes (What's new)

- Fixed: Login validation no longer blocks existing passwords that don't match a client-side regex. The password format requirements are now enforced only at registration to avoid blocking valid existing passwords. See: [client/src/components/AuthForms.jsx](client/src/components/AuthForms.jsx)
- Feature: Real-time admin notifications using websockets (socket.io).
	- Server: Integrates `socket.io` in [src/server.js](src/server.js) and exposes the `io` instance to route handlers.
	- Emitters: `src/routes/cv.js` now emits `cv:created` and `cv:updated` events; `src/routes/admin.js` emits `cv:statusUpdated` events on status changes.
	- Client: Added `client/src/hooks/useRealtimeNotifications.js` and `client/src/components/RealtimeToast.jsx`.
	- Admin Panel: `client/src/components/AdminPanel.jsx` subscribes to realtime events, refreshes the CV list, and displays live notification toasts.
	- Dependencies: `socket.io` (server package) and `socket.io-client` (client package) are now required.

## Why this change?
- Administrative workflows become more efficient: admins can react to new CV submissions and status updates instantly without manual refreshes.
- Fixing client-side login validation ensures existing users are not blocked by overly-strict HTML patterns that were intended only for registration.

## Prerequisites

- Node.js 18+
- MongoDB instance (local or Atlas). Use MongoDB Compass to inspect collections if desired.
 - Node.js 18+ (recommended)

## Backend Setup

```bash
cd C:\Users\nayak\Downloads\CRUD INt
# Create .env file with:
# MONGODB_URI=mongodb://localhost:27017/crud_int
# PORT=4000
# 
# Dynamic JWT Configuration (all optional, defaults provided):
# JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
# JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
# JWT_EXPIRES_IN=1h                    # Access token expiration (e.g., '15m', '1h', '2h', '1d')
# JWT_REFRESH_EXPIRES_IN=7d            # Refresh token expiration
# JWT_ALGORITHM=HS256                  # Options: HS256, HS384, HS512, RS256, etc.
# 
# Admin Configuration (optional):
# ADMIN_EMAIL=admin@123
# ADMIN_PASSWORD=password@123
npm install
npm run dev            # runs nodemon on port 4000 by default
```

> If `.env.example` is unavailable, create `.env` manually with the variables above.

## Frontend Setup

```bash
cd client
cp .env.example .env   # optional; set VITE_API_URL=http://localhost:4000
npm install
npm run dev            # serves Vite app (default http://localhost:5173)
```

Set `VITE_API_URL` if the backend runs on a non-default host/port.

### Socket.io / Realtime Configuration
- Set `CLIENT_ORIGIN` to the frontend origin in the server `.env` file (defaults to `http://localhost:5173` in server); this is used when creating the socket.io CORS config.
- Set `VITE_API_URL` on the client (this is also used by the websocket hook to connect).
- Example `.env` additions:
```
CLIENT_ORIGIN=http://localhost:5173
VITE_API_URL=http://localhost:4000
```

## Development Workflow

1. Start MongoDB (e.g., `mongod` locally or connect to Atlas/Compass).
2. Run backend: `npm run dev`.
3. In another terminal, run frontend: `cd client && npm run dev`.
4. Open the Vite URL in the browser.

The first registered account becomes an admin, and a default admin user (`admin@123` / `password@123`) is also provisioned automatically for quick access. Use the portal toggle in the navbar to switch between user and admin login flows.

## How to test the new realtime notifications

1. Start the backend:
	 ```bash
	 npm install
	 npm run dev
	 ```
2. Start the frontend in a separate shell:
	 ```bash
	 cd client
	 npm install
	 npm run dev
	 ```
3. Open an Admin panel tab and login as Admin (default `admin@123` / `password@123` or your first registered user if it's an admin).
4. Open a separate User tab and submit a new CV (or update an existing CV while `status` is `pending`).
5. The Admin tab should receive a live toast notification and the CV list will refresh automatically.

You can also run the `scripts/spam-admin.js` helper (it hits admin endpoints to stress test rate-limiting and load):
```bash
node scripts/spam-admin.js --url=http://localhost:4000 --count=10 --token=<adminToken>
```

## Developer notes / Changed files (high-level)
- Server:
	- [src/server.js](src/server.js): Adds socket.io setup and exposes `io` instance via `app.set('io', io)`.
	- [src/routes/cv.js](src/routes/cv.js): Emits `cv:created` and `cv:updated` events.
	- [src/routes/admin.js](src/routes/admin.js): Emits `cv:statusUpdated` event.
- Client:
	- [client/src/components/AuthForms.jsx](client/src/components/AuthForms.jsx): Fix: pattern now applied for registration only.
	- [client/src/hooks/useRealtimeNotifications.js](client/src/hooks/useRealtimeNotifications.js): New websocket helper.
	- [client/src/components/RealtimeToast.jsx](client/src/components/RealtimeToast.jsx): Lightweight toast UI.
	- [client/src/components/AdminPanel.jsx](client/src/components/AdminPanel.jsx): Subscribes to realtime events and shows toasts.
	- [client/src/App.css](client/src/App.css): Styles for toasts.
	- Updated `client/package.json` & root `package.json` to add `socket.io-client` and `socket.io` dependencies respectively.

## Linting and build
- Frontend lint rules with `npm run lint` are present; ensure you run `npm run lint` from `client` to see and fix styling issues.
- Build the frontend to produce `client/dist` for production: `cd client && npm run build`.

## Changelog
- 2025-12-13: Fixed password login validation; added realtime admin notifications with socket.io; updated front-end Admin Panel to show live toasts and auto-refresh course list; added docs and test helpers.

## Security / Considerations
- Make sure `JWT_SECRET` and `JWT_REFRESH_SECRET` are strong and not checked into version control.
- Restrict `CLIENT_ORIGIN` to known hosts in production.
- Socket authentication is basic and accepts an auth token during connection (see `client/src/hooks/useRealtimeNotifications.js`). In a production app, you should validate and scope socket connections on the server (allow admin-only events only to authenticated admin sockets).

## Helpful commands
- Start backend: `npm run dev`
- Start client: `cd client && npm run dev`
- Build client: `cd client && npm run build`
- Lint client: `cd client && npm run lint`
- Test spam script: `node scripts/spam-admin.js --url=http://localhost:4000 --count=200 --token=<adminToken>`

---
If you'd like, I can:
- Add tests to validate realtime events
- Harden websocket authentication so admin events are only delivered to admin sockets
- Add a pending-badge in the UI to show `pending` CV count in `PortalNav`

If you'd like any of the follow-ups, tell me which one and I'll add it next.

### Inspecting data with MongoDB Compass

- Launch MongoDB Compass and connect using the same `MONGODB_URI`.
- Browse the `crud_int` database to view `users` and `cvs` collections.
- Use Compass filters (e.g., `{ status: "pending" }`) to cross-check what the enhanced admin dashboard shows or to run aggregations for reporting.

## Production Builds

- Backend: `npm start`.
- Frontend: `cd client && npm run build` (outputs static files in `client/dist`).

Serve the frontend build with any static host (e.g., Nginx) and point it to the deployed API via `VITE_API_URL`.

## Testing / Validation

- `client` build succeeds (see `npm run build` result).
- API routes expect valid JWT tokens; unauthorized requests return `401/403`.


