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
| POST | `/products` | Admin | Create a database-backed product |
| GET | `/products/:slug` | Public | Fetch one active product from the catalogue |
| PUT | `/products/:slug` | Admin | Update a database-backed product |
| POST | `/products/price` | Public | Server-authoritative live price |
| GET | `/products/:slug/templates` | Public | List active templates for an active product |
| POST | `/products/:slug/templates` | Admin | Create a template for a product |
| GET | `/templates/:id` | Public | Fetch one active template |
| PUT | `/templates/:id` | Admin | Update a template |
| DELETE | `/templates/:id` | Admin | Delete a template |
| GET | `/designs` | Customer/Admin | List own designs; optionally filter by `status` or `productId` |
| POST | `/designs` | Customer/Admin | Create a design for an active product/template |
| GET | `/designs/:id` | Customer/Admin | Fetch an owned design |
| PUT | `/designs/:id` | Customer/Admin | Autosave or update an owned design |
| DELETE | `/designs/:id` | Customer/Admin | Delete an unused owned design |
| POST | `/files/upload` | Customer/Admin | Upload one file to the public `uploads` bucket and receive its public URL |
| DELETE | `/files` | Customer/Admin | Delete an owned public upload by its public URL; admins may delete any upload |
| POST | `/files/signed-url` | Customer/Admin | Replace an expired upload URL with a fresh signed URL |
| GET | `/cart` | Customer | Fetch own cart with current prices and totals |
| DELETE | `/cart` | Customer | Clear all items from own cart |
| POST | `/cart/items` | Customer | Add a configured product to own cart |
| PUT | `/cart/items/:id` | Customer | Update an owned cart item |
| DELETE | `/cart/items/:id` | Customer | Remove an owned cart item |
| GET | `/addresses` | Customer | List owned delivery addresses |
| POST | `/addresses` | Customer | Create a delivery address |
| GET | `/addresses/:id` | Customer | Fetch one owned address |
| PUT | `/addresses/:id` | Customer | Update one owned address |
| DELETE | `/addresses/:id` | Customer | Delete one owned address |
| PUT | `/addresses/:id/default` | Customer | Make an owned address the default |
| GET | `/orders` | Customer | Own order history |
| POST | `/orders` | Customer | Capture an atomically priced multi-product order |
| GET | `/orders/:id` | Customer | Fetch one owned order |
| POST | `/orders/:id/reorder` | Customer | Duplicate an owned order |
| POST | `/proofs/:id/approve` | Customer | Approve exact proof version |
| POST | `/proofs/:id/change-request` | Customer | Request a revision |
| POST | `/proofs/orders/:orderId` | Admin | Add versioned proof |
| GET | `/admin/jobs` | Admin | Searchable production queue |
| PUT | `/admin/jobs/:id/status` | Admin | Advance pipeline with approval gate |
| GET | `/admin/jobs/:id/production-file` | Admin | Generate/download production PDF |
| GET | `/admin/analytics` | Admin | Order and revenue metrics |

Send Supabase access tokens as `Authorization: Bearer <token>`. In local demo mode, omit the token; customer access is assumed. For admin endpoints only, add `x-demo-role: admin`.

Interactive Swagger UI: `http://localhost:4000/api/docs`  
OpenAPI JSON: `http://localhost:4000/api/docs.json`

