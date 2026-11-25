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
| GET | `/notifications` | Customer/Admin | List own notifications with pagination and optional unread/type filters |
| GET | `/notifications/unread-count` | Customer/Admin | Fetch own unread notification count |
| PATCH | `/notifications/read-all` | Customer/Admin | Mark all own notifications as read |
| PATCH | `/notifications/:id/read` | Customer/Admin | Mark one owned notification as read |
| DELETE | `/notifications/:id` | Customer/Admin | Delete one owned notification |
| POST | `/user-activities` | Public | Record an anonymous activity with client location and server-derived IP |
| POST | `/proofs/:id/approve` | Customer | Approve exact proof version |
| POST | `/proofs/:id/change-request` | Customer | Request a revision |
| POST | `/proofs/orders/:orderId` | Admin | Add versioned proof |
| GET | `/admin/customers` | Admin | List customers with orders, order counts, and unfinished job counts |
| GET | `/admin/jobs` | Admin | Searchable production queue with design/template placeholder and thumbnail data |
| PUT | `/admin/jobs/:id/status` | Admin | Advance pipeline by order UUID or order number, with approval gate |
| GET | `/admin/jobs/:id/production-file` | Admin | Generate once, privately store, record, and download order artwork rendered from its template and placeholder values |
| GET | `/admin/analytics` | Admin | Order and revenue metrics |

Send Supabase access tokens as `Authorization: Bearer <token>`. In local demo mode, omit the token; customer access is assumed. Add `x-demo-role: admin` for admin endpoints or to use the admin inbox on the shared notification endpoints.

In-app notifications are created automatically for order placement/reorders, proof readiness, proof approval/change requests, and order status changes. Customer and admin inboxes are isolated by the authenticated profile ID.

User activity requests accept `activity` (a lowercase identifier such as `product.viewed`) and a `location` object containing a coordinate pair and/or named location fields. No token is required. `userId` and `ipAddress` are never accepted from the client; the server derives the IP address. The activity table has no foreign keys to other tables.

Production PDFs are stored in the private Supabase bucket configured by `SUPABASE_PRODUCTION_BUCKET` (default: `production`). Apply `supabase/schema.sql` or create this private bucket before generating a production file.

Interactive Swagger UI: `http://localhost:4000/api/docs`  
OpenAPI JSON: `http://localhost:4000/api/docs.json`

