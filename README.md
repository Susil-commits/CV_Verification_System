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

## Prerequisites

- Node.js 18+
- MongoDB instance (local or Atlas). Use MongoDB Compass to inspect collections if desired.

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

## Development Workflow

1. Start MongoDB (e.g., `mongod` locally or connect to Atlas/Compass).
2. Run backend: `npm run dev`.
3. In another terminal, run frontend: `cd client && npm run dev`.
4. Open the Vite URL in the browser.

The first registered account becomes an admin, and a default admin user (`admin@123` / `password@123`) is also provisioned automatically for quick access. Use the portal toggle in the navbar to switch between user and admin login flows.

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

## Next Ideas

- Add pagination/search for admin CV list.
- Send email notifications on approval/rejection.
- Support file uploads (PDF resumes) via S3/GridFS.


