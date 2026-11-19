# API contract

Base URL: `http://localhost:4000/api`

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | Public | Runtime/database readiness |
| POST | `/auth/signup` | Public | Create a Supabase customer account |
| POST | `/auth/login` | Public | Exchange email/password for a session |
| POST | `/auth/refresh` | Public | Refresh an access token |
| POST | `/auth/logout` | Customer/Admin | Revoke all sessions |
| GET | `/auth/me` | Customer/Admin | Fetch the authenticated user and role |
| GET | `/products` | Public | Active parameter-driven catalogue |
| POST | `/products/price` | Public | Server-authoritative live price |
| GET | `/orders` | Customer | Own order history |
| POST | `/orders` | Customer | Capture a priced order |
| GET | `/orders/:id` | Customer | Fetch one owned order |
| POST | `/orders/:id/reorder` | Customer | Duplicate an owned order |
| POST | `/proofs/:id/approve` | Customer | Approve exact proof version |
| POST | `/proofs/:id/change-request` | Customer | Request a revision |
| POST | `/proofs/orders/:orderId` | Admin | Add versioned proof |
| GET | `/admin/jobs` | Admin | Searchable production queue |
| PATCH | `/admin/jobs/:id/status` | Admin | Advance pipeline with approval gate |
| GET | `/admin/jobs/:id/production-file` | Admin | Generate/download production PDF |
| GET | `/admin/analytics` | Admin | Order and revenue metrics |

Send Supabase access tokens as `Authorization: Bearer <token>`. In local demo mode, omit the token; customer access is assumed. For admin endpoints only, add `x-demo-role: admin`.

Interactive Swagger UI: `http://localhost:4000/api/docs`  
OpenAPI JSON: `http://localhost:4000/api/docs.json`

