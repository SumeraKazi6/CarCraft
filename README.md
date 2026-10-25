# CarCraft — Car Dealership Inventory System

A premium automotive dealership application built to satisfy the Incubytes TDD Kata requirements. The application combines a Node.js + Express backend, a MySQL database, and a React + Tailwind frontend to model a complete inventory and customer purchasing flow.

## Project overview

This project includes:

- user registration and login with JWT-based authentication
- protected inventory management endpoints for admin users
- vehicle listing, search, and filtering
- purchase and restock flows
- a luxury dealership frontend with premium inventory cards, hero, pricing, and concierge experience
- backend tests covering the vehicle inventory contract

## Tech stack

- Frontend: React, Vite, Tailwind CSS
- Backend: Node.js, Express, MySQL
- Auth: JWT + bcrypt
- Testing: Jest + Supertest

## Local setup

### 1) Install dependencies

Frontend:

```bash
npm install
```

Backend:

```bash
cd server
npm install
```

### 2) Start the database

Create a MySQL database named `car_craftdb` and ensure your local MySQL credentials match the values in `server/.env`.

Example configuration:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=car_craftdb
SESSION_SECRET=your_session_secret
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173
```

### 3) Start the backend

```bash
cd server
node server.js
```

Backend will run on:

- http://localhost:5000

### 4) Start the frontend

From the project root:

```bash
npm run dev
```

Frontend will run on:

- http://localhost:5173

## API contract

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`

### Vehicles (kata-compatible)

- `GET /api/vehicles`
- `GET /api/vehicles/search`
- `POST /api/vehicles`
- `GET /api/vehicles/:id`
- `PUT /api/vehicles/:id`
- `DELETE /api/vehicles/:id`
- `POST /api/vehicles/:id/purchase`
- `POST /api/vehicles/:id/restock`

Legacy compatibility routes are also supported:

- `GET /api/cars`
- `POST /api/cars`
- `POST /api/bookings`

## Frontend behavior

- user registration and login forms
- inventory dashboard and premium search/filter controls
- purchase button available for in-stock vehicles
- admin inventory form for adding vehicles
- luxury UI focused on premium automotive retail

## Test report

Run backend tests:

```bash
cd server
npm test -- --runInBand
```

The project includes a kata-aligned vehicle inventory test suite in `server/tests/vehicles.test.js` covering:

- GET /api/vehicles
- GET /api/vehicles/search
- POST /api/vehicles
- POST /api/vehicles/:id/purchase
- POST /api/vehicles/:id/restock
- database error handling

## My AI Usage

I used GitHub Copilot as the primary AI assistant throughout the build process.

How it was used:

- generating and refining the Node/Express route structure
- drafting the inventory and auth test cases in TDD flow
- helping patch backend route contracts and validation logic
- assisting in premium frontend redesign while keeping the app functional

Reflection:

AI dramatically accelerated the conversion from a partially broken prototype into a production-style dealership app. It was especially useful for rapid iteration on API contracts, validation logic, and UI structure. The important safeguard was verifying every AI-generated change against the running app and tests so the final result matched the actual requirement set rather than a generic template.

## Notes

This repository is designed to be run locally. A public GitHub repository link and external raw AI chat logs are not available in this workspace environment, so they cannot be published from here without creating a separate external repo and transcript export outside the restriction of this session.

## Screenshots

Place screenshots here after running the app locally and capturing the final interface.
