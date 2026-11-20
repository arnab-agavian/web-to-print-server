import { env } from "./env.js";

const idParameter = {
  name: "id",
  in: "path",
  required: true,
  description: "Resource UUID (demo data may use readable IDs).",
  schema: { type: "string" },
};

const demoAdminHeader = {
  name: "x-demo-role",
  in: "header",
  required: false,
  description: "Set to `admin` when calling admin endpoints in local demo mode without a bearer token.",
  schema: { type: "string", enum: ["admin"] },
};

const jsonContent = (schema, example) => ({
  "application/json": {
    schema,
    ...(example ? { example } : {}),
  },
});

const dataResponse = (description, dataSchema, example) => ({
  description,
  content: jsonContent(
    {
      allOf: [
        { $ref: "#/components/schemas/SuccessResponse" },
        {
          type: "object",
          properties: {
            response: {
              type: "object",
              properties: { data: dataSchema },
              required: ["data"],
            },
          },
        },
      ],
    },
    example,
  ),
});

const errorResponse = (description) => ({
  description,
  content: jsonContent({ $ref: "#/components/schemas/ErrorResponse" }),
});

export const swaggerSpec = {
  openapi: "3.0.3",
  info: {
    title: "Digital Heroes API",
    version: "1.0.0",
    description:
      "Interactive documentation for the Digital Heroes ordering and production API. " +
      "Protected endpoints accept a Supabase access token using **Authorize**. In local demo mode, " +
      "customer endpoints work without a token; admin endpoints also require `x-demo-role: admin`.",
  },
  servers: [{ url: env.apiBaseUrl, description: "API server" }],
  tags: [
    { name: "System", description: "Runtime status" },
    { name: "Authentication", description: "Supabase account and session lifecycle" },
    { name: "Products", description: "Product catalogue and pricing" },
    { name: "Templates", description: "Product canvas templates" },
    { name: "Files", description: "Private Supabase Storage uploads" },
    { name: "Cart", description: "Customer shopping cart" },
    { name: "Addresses", description: "Customer delivery address book" },
    { name: "Orders", description: "Customer orders" },
    { name: "Proofs", description: "Artwork proof workflow" },
    { name: "Admin", description: "Production administration" },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["System"],
        summary: "Check API health",
        operationId: "getHealth",
        responses: {
          200: dataResponse("Runtime status.", { $ref: "#/components/schemas/Health" }, {
            status: 200,
            success: true,
            message: "API health fetched successfully.",
            response: {
              data: {
                status: "ok",
                database: "demo",
                uptime: 125.42,
                timestamp: "2026-11-19T10:30:00.000Z",
              },
            },
          }),
        },
      },
    },
    "/auth/signup": {
      post: {
        tags: ["Authentication"],
        summary: "Create a customer account",
        description:
          "Creates a Supabase Auth user. When email confirmation is enabled in Supabase, `session` is null until the user confirms their email.",
        operationId: "signup",
        requestBody: {
          required: true,
          content: jsonContent(
            { $ref: "#/components/schemas/SignupRequest" },
            {
              email: "maya@example.com",
              password: "StrongPassword123!",
              fullName: "Maya Brooks",
              phone: "+919876543210",
              role: "customer",
            },
          ),
        },
        responses: {
          201: dataResponse("Account created.", { $ref: "#/components/schemas/AuthResult" }),
          400: errorResponse("Validation or Supabase signup failed."),
          429: errorResponse("Too many authentication attempts."),
          503: errorResponse("Supabase Auth is not configured."),
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "Log in with email and password",
        operationId: "login",
        requestBody: {
          required: true,
          content: jsonContent(
            { $ref: "#/components/schemas/LoginRequest" },
            { email: "maya@example.com", password: "StrongPassword123!" },
          ),
        },
        responses: {
          200: dataResponse("Login succeeded.", { $ref: "#/components/schemas/AuthResult" }),
          400: errorResponse("Validation failed."),
          401: errorResponse("Invalid email or password."),
          429: errorResponse("Too many authentication attempts."),
          503: errorResponse("Supabase Auth is not configured."),
        },
      },
    },
    "/auth/refresh": {
      post: {
        tags: ["Authentication"],
        summary: "Refresh an access token",
        operationId: "refreshSession",
        requestBody: {
          required: true,
          content: jsonContent(
            { $ref: "#/components/schemas/RefreshRequest" },
            { refreshToken: "refresh-token-returned-by-login" },
          ),
        },
        responses: {
          200: dataResponse("Session refreshed.", { $ref: "#/components/schemas/AuthResult" }),
          400: errorResponse("Validation failed."),
          401: errorResponse("Invalid or expired refresh token."),
          429: errorResponse("Too many authentication attempts."),
          503: errorResponse("Supabase Auth is not configured."),
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Authentication"],
        summary: "Log out from all sessions",
        description: "Revokes the bearer token through Supabase Auth.",
        operationId: "logout",
        security: [{ bearerAuth: [] }],
        responses: {
          200: dataResponse("Logout succeeded.", {
            type: "object",
            properties: { loggedOut: { type: "boolean", enum: [true] } },
            required: ["loggedOut"],
          }),
          401: errorResponse("Authentication required."),
          503: errorResponse("Supabase server credentials are not configured."),
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Authentication"],
        summary: "Get the authenticated user",
        operationId: "getCurrentUser",
        security: [{ bearerAuth: [] }],
        responses: {
          200: dataResponse("Current user.", {
            type: "object",
            properties: { user: { $ref: "#/components/schemas/CurrentUser" } },
            required: ["user"],
          }),
          401: errorResponse("Authentication required."),
        },
      },
    },
    "/products": {
      get: {
        tags: ["Products"],
        summary: "List active products",
        operationId: "getProducts",
        responses: {
          200: dataResponse("Active product catalogue.", {
            type: "array",
            items: { $ref: "#/components/schemas/Product" },
          }),
          500: errorResponse("Unexpected server error."),
          503: errorResponse("Database is not configured."),
        },
      },
      post: {
        tags: ["Products"],
        summary: "Create a product",
        description:
          "Admin only. Persists the product in PostgreSQL through Prisma; this operation is unavailable when the API has no database configured.",
        operationId: "createProduct",
        security: [{ bearerAuth: [] }],
        parameters: [demoAdminHeader],
        requestBody: {
          required: true,
          content: jsonContent(
            { $ref: "#/components/schemas/CreateProductRequest" },
            {
              slug: "event-banners",
              name: "Event Banners",
              family: "labels",
              description: "Large-format banners for races and events.",
              basePrice: 25,
              minQuantity: 1,
              minWidth: 100,
              maxWidth: 2000,
              minHeight: 100,
              maxHeight: 1000,
              defaultWidth: 1000,
              defaultHeight: 500,
              bleedMm: 5,
              resolutionDpi: 300,
              configurationSchema: {
                materials: ["vinyl", "mesh"],
                orientations: ["landscape", "portrait"],
              },
              active: true,
              sortOrder: 7,
            },
          ),
        },
        responses: {
          201: dataResponse("Product created.", { $ref: "#/components/schemas/Product" }),
          400: errorResponse("Validation failed."),
          401: errorResponse("Authentication required."),
          403: errorResponse("Admin access required."),
          409: errorResponse("A product with this slug already exists."),
          503: errorResponse("Database is not configured."),
        },
      },
    },
    "/products/{slug}": {
      get: {
        tags: ["Products"],
        summary: "Get an active product by slug",
        operationId: "getProductBySlug",
        parameters: [
          {
            name: "slug",
            in: "path",
            required: true,
            schema: { type: "string" },
            example: "labels",
          },
        ],
        responses: {
          200: dataResponse("Active product.", { $ref: "#/components/schemas/Product" }),
          404: errorResponse("Product not found."),
          500: errorResponse("Unexpected server error."),
          503: errorResponse("Database is not configured."),
        },
      },
      patch: {
        tags: ["Products"],
        summary: "Update a product",
        description:
          "Admin only. Applies a partial update and validates the complete resulting dimension configuration.",
        operationId: "updateProduct",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "slug",
            in: "path",
            required: true,
            schema: { type: "string" },
            example: "labels",
          },
          demoAdminHeader,
        ],
        requestBody: {
          required: true,
          content: jsonContent(
            { $ref: "#/components/schemas/UpdateProductRequest" },
            {
              name: "Premium Labels & Stickers",
              basePrice: 2.25,
              configurationSchema: {
                materials: ["premium_vinyl", "paper", "clear_vinyl"],
                orientations: ["portrait", "landscape"],
              },
            },
          ),
        },
        responses: {
          200: dataResponse("Updated product.", { $ref: "#/components/schemas/Product" }),
          400: errorResponse("Validation failed or resulting dimensions are inconsistent."),
          401: errorResponse("Authentication required."),
          403: errorResponse("Admin access required."),
          404: errorResponse("Product not found."),
          409: errorResponse("A product with this slug already exists."),
          503: errorResponse("Database is not configured."),
        },
      },
    },
    "/products/price": {
      post: {
        tags: ["Products"],
        summary: "Calculate an authoritative price",
        operationId: "calculateProductPrice",
        requestBody: {
          required: true,
          content: jsonContent(
            { $ref: "#/components/schemas/PriceRequest" },
            {
              productSlug: "labels",
              width: 100,
              height: 100,
              quantity: 100,
              materialMultiplier: 1,
            },
          ),
        },
        responses: {
          200: dataResponse("Calculated price.", { $ref: "#/components/schemas/Price" }),
          400: errorResponse("Invalid request or unsupported dimensions/quantity."),
          404: errorResponse("Product not found."),
          500: errorResponse("Unexpected server error."),
          503: errorResponse("Database is not configured."),
        },
      },
    },
    "/products/{slug}/templates": {
      get: {
        tags: ["Templates"],
        summary: "List active templates for an active product",
        operationId: "getProductTemplates",
        parameters: [
          {
            name: "slug",
            in: "path",
            required: true,
            schema: { type: "string" },
            example: "mtb-boards",
          },
        ],
        responses: {
          200: dataResponse("Product templates.", {
            type: "array",
            items: { $ref: "#/components/schemas/Template" },
          }),
          404: errorResponse("Product not found."),
          503: errorResponse("Database is not configured."),
        },
      },
      post: {
        tags: ["Templates"],
        summary: "Create a product template",
        operationId: "createTemplate",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "slug",
            in: "path",
            required: true,
            schema: { type: "string" },
            example: "mtb-boards",
          },
          demoAdminHeader,
        ],
        requestBody: {
          required: true,
          content: jsonContent(
            { $ref: "#/components/schemas/CreateTemplateRequest" },
            {
              name: "MTB Board 240 × 180",
              canvasWidth: 240,
              canvasHeight: 180,
              safeArea: { x: 10, y: 10, width: 220, height: 160, unit: "mm" },
              placeholderRules: {
                raceNumber: { required: true, maxLength: 3 },
                riderName: { required: false },
              },
              thumbnailPath: null,
              active: true,
            },
          ),
        },
        responses: {
          201: dataResponse("Created template.", { $ref: "#/components/schemas/Template" }),
          400: errorResponse("Validation failed."),
          401: errorResponse("Authentication required."),
          403: errorResponse("Admin access required."),
          404: errorResponse("Product not found."),
          503: errorResponse("Database is not configured."),
        },
      },
    },
    "/templates/{id}": {
      get: {
        tags: ["Templates"],
        summary: "Get an active template",
        operationId: "getTemplate",
        parameters: [idParameter],
        responses: {
          200: dataResponse("Active template.", { $ref: "#/components/schemas/Template" }),
          400: errorResponse("Invalid template ID."),
          404: errorResponse("Template not found."),
          503: errorResponse("Database is not configured."),
        },
      },
      patch: {
        tags: ["Templates"],
        summary: "Update a template",
        description: "Admin only. Validates the safe area against the complete resulting canvas.",
        operationId: "updateTemplate",
        security: [{ bearerAuth: [] }],
        parameters: [idParameter, demoAdminHeader],
        requestBody: {
          required: true,
          content: jsonContent(
            { $ref: "#/components/schemas/UpdateTemplateRequest" },
            { name: "MTB Board — Race Edition", thumbnailPath: "templates/mtb-race.png" },
          ),
        },
        responses: {
          200: dataResponse("Updated template.", { $ref: "#/components/schemas/Template" }),
          400: errorResponse("Validation failed."),
          401: errorResponse("Authentication required."),
          403: errorResponse("Admin access required."),
          404: errorResponse("Template not found."),
          503: errorResponse("Database is not configured."),
        },
      },
      delete: {
        tags: ["Templates"],
        summary: "Delete a template",
        description: "Admin only. Existing designs retain their data and have their template reference set to null.",
        operationId: "deleteTemplate",
        security: [{ bearerAuth: [] }],
        parameters: [idParameter, demoAdminHeader],
        responses: {
          200: dataResponse("Deletion result.", {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              deleted: { type: "boolean", enum: [true] },
            },
            required: ["id", "deleted"],
          }),
          400: errorResponse("Invalid template ID."),
          401: errorResponse("Authentication required."),
          403: errorResponse("Admin access required."),
          404: errorResponse("Template not found."),
          503: errorResponse("Database is not configured."),
        },
      },
    },
    "/files/upload": {
      post: {
        tags: ["Files"],
        summary: "Upload a private file",
        description:
          "Accepts one `file` field up to 10 MB. Supported types are PNG, JPEG, WebP, and PDF. The response includes a one-hour signed URL.",
        operationId: "uploadFile",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  file: { type: "string", format: "binary" },
                  category: {
                    type: "string",
                    enum: ["general", "products", "templates", "artwork", "proofs"],
                    default: "general",
                  },
                },
                required: ["file"],
              },
            },
          },
        },
        responses: {
          201: dataResponse("Uploaded file metadata.", { $ref: "#/components/schemas/FileUploadResult" }),
          400: errorResponse("Missing file or malformed multipart request."),
          401: errorResponse("Authentication required."),
          413: errorResponse("File exceeds the 10 MB limit."),
          415: errorResponse("Unsupported type or invalid file signature."),
          502: errorResponse("Supabase Storage operation failed."),
          503: errorResponse("Supabase Storage is not configured."),
        },
      },
    },
    "/cart": {
      get: {
        tags: ["Cart"],
        summary: "Get the current customer's cart",
        operationId: "getCart",
        security: [{ bearerAuth: [] }],
        responses: {
          200: dataResponse("Current cart.", { $ref: "#/components/schemas/Cart" }),
          401: errorResponse("Authentication required."),
          503: errorResponse("Database is not configured."),
        },
      },
      delete: {
        tags: ["Cart"],
        summary: "Clear the current customer's cart",
        operationId: "clearCart",
        security: [{ bearerAuth: [] }],
        responses: {
          200: dataResponse("Empty cart.", { $ref: "#/components/schemas/Cart" }),
          401: errorResponse("Authentication required."),
          503: errorResponse("Database is not configured."),
        },
      },
    },
    "/cart/items": {
      post: {
        tags: ["Cart"],
        summary: "Add an item to the current customer's cart",
        description: "The server validates the product configuration and recalculates its price from the database.",
        operationId: "addCartItem",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: jsonContent(
            { $ref: "#/components/schemas/AddCartItemRequest" },
            {
              productSlug: "labels",
              width: 100,
              height: 100,
              quantity: 100,
              material: "Premium vinyl",
              materialMultiplier: 1,
              configuration: { finish: "gloss" },
            },
          ),
        },
        responses: {
          201: dataResponse("Updated cart.", { $ref: "#/components/schemas/Cart" }),
          400: errorResponse("Invalid product configuration."),
          401: errorResponse("Authentication required."),
          404: errorResponse("Product not found."),
          503: errorResponse("Database is not configured."),
        },
      },
    },
    "/cart/items/{id}": {
      patch: {
        tags: ["Cart"],
        summary: "Update an owned cart item",
        operationId: "updateCartItem",
        security: [{ bearerAuth: [] }],
        parameters: [idParameter],
        requestBody: {
          required: true,
          content: jsonContent(
            { $ref: "#/components/schemas/UpdateCartItemRequest" },
            { quantity: 250, materialMultiplier: 1.15 },
          ),
        },
        responses: {
          200: dataResponse("Updated cart.", { $ref: "#/components/schemas/Cart" }),
          400: errorResponse("Invalid cart item update."),
          401: errorResponse("Authentication required."),
          404: errorResponse("Cart item not found."),
          503: errorResponse("Database is not configured."),
        },
      },
      delete: {
        tags: ["Cart"],
        summary: "Remove an owned cart item",
        operationId: "removeCartItem",
        security: [{ bearerAuth: [] }],
        parameters: [idParameter],
        responses: {
          200: dataResponse("Updated cart.", { $ref: "#/components/schemas/Cart" }),
          400: errorResponse("Invalid cart item ID."),
          401: errorResponse("Authentication required."),
          404: errorResponse("Cart item not found."),
          503: errorResponse("Database is not configured."),
        },
      },
    },
    "/addresses": {
      get: {
        tags: ["Addresses"],
        summary: "List the current customer's addresses",
        operationId: "getAddresses",
        security: [{ bearerAuth: [] }],
        responses: {
          200: dataResponse("Owned addresses.", {
            type: "array",
            items: { $ref: "#/components/schemas/Address" },
          }),
          401: errorResponse("Authentication required."),
          503: errorResponse("Database is not configured."),
        },
      },
      post: {
        tags: ["Addresses"],
        summary: "Create a delivery address",
        description: "The first address is automatically made the customer's default address.",
        operationId: "createAddress",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: jsonContent(
            { $ref: "#/components/schemas/CreateAddressRequest" },
            {
              label: "Home",
              recipientName: "Maya Brooks",
              phone: "+919876543210",
              addressLine1: "42 Park Street",
              addressLine2: "Near Central Market",
              city: "Kolkata",
              state: "West Bengal",
              postalCode: "700016",
              countryCode: "IN",
              isDefault: true,
            },
          ),
        },
        responses: {
          201: dataResponse("Created address.", { $ref: "#/components/schemas/Address" }),
          400: errorResponse("Validation failed."),
          401: errorResponse("Authentication required."),
          409: errorResponse("Default address changed concurrently."),
          503: errorResponse("Database is not configured."),
        },
      },
    },
    "/addresses/{id}": {
      get: {
        tags: ["Addresses"],
        summary: "Get an owned delivery address",
        operationId: "getAddress",
        security: [{ bearerAuth: [] }],
        parameters: [idParameter],
        responses: {
          200: dataResponse("Owned address.", { $ref: "#/components/schemas/Address" }),
          400: errorResponse("Invalid address ID."),
          401: errorResponse("Authentication required."),
          404: errorResponse("Address not found."),
          503: errorResponse("Database is not configured."),
        },
      },
      patch: {
        tags: ["Addresses"],
        summary: "Update an owned delivery address",
        operationId: "updateAddress",
        security: [{ bearerAuth: [] }],
        parameters: [idParameter],
        requestBody: {
          required: true,
          content: jsonContent(
            { $ref: "#/components/schemas/UpdateAddressRequest" },
            { label: "Office", addressLine2: "Floor 3" },
          ),
        },
        responses: {
          200: dataResponse("Updated address.", { $ref: "#/components/schemas/Address" }),
          400: errorResponse("Validation failed."),
          401: errorResponse("Authentication required."),
          404: errorResponse("Address not found."),
          503: errorResponse("Database is not configured."),
        },
      },
      delete: {
        tags: ["Addresses"],
        summary: "Delete an owned delivery address",
        description: "When the default address is deleted, the most recently updated remaining address becomes the default.",
        operationId: "deleteAddress",
        security: [{ bearerAuth: [] }],
        parameters: [idParameter],
        responses: {
          200: dataResponse("Deletion result.", {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              deleted: { type: "boolean", enum: [true] },
            },
            required: ["id", "deleted"],
          }),
          400: errorResponse("Invalid address ID."),
          401: errorResponse("Authentication required."),
          404: errorResponse("Address not found."),
          503: errorResponse("Database is not configured."),
        },
      },
    },
    "/addresses/{id}/default": {
      patch: {
        tags: ["Addresses"],
        summary: "Make an owned address the default",
        operationId: "setDefaultAddress",
        security: [{ bearerAuth: [] }],
        parameters: [idParameter],
        responses: {
          200: dataResponse("New default address.", { $ref: "#/components/schemas/Address" }),
          400: errorResponse("Invalid address ID."),
          401: errorResponse("Authentication required."),
          404: errorResponse("Address not found."),
          503: errorResponse("Database is not configured."),
        },
      },
    },
    "/orders": {
      get: {
        tags: ["Orders"],
        summary: "List the current customer's orders",
        operationId: "getOrders",
        security: [{ bearerAuth: [] }],
        responses: {
          200: dataResponse("Orders fetched.", {
            type: "array",
            items: { $ref: "#/components/schemas/Order" },
          }),
          401: errorResponse("Authentication required."),
          500: errorResponse("Unexpected server error."),
        },
      },
      post: {
        tags: ["Orders"],
        summary: "Place an order",
        operationId: "placeOrder",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: jsonContent(
            { $ref: "#/components/schemas/CreateOrderRequest" },
            {
              productSlug: "labels",
              width: 100,
              height: 100,
              quantity: 100,
              material: "Premium vinyl",
              materialMultiplier: 1,
              configuration: { finish: "gloss" },
            },
          ),
        },
        responses: {
          201: dataResponse("Order placed.", {
            type: "object",
            properties: {
              order: { $ref: "#/components/schemas/Order" },
              price: { $ref: "#/components/schemas/Price" },
            },
          }),
          400: errorResponse("Validation failed."),
          401: errorResponse("Authentication required."),
          404: errorResponse("Product not found."),
          500: errorResponse("Unexpected server error."),
        },
      },
    },
    "/orders/{id}": {
      get: {
        tags: ["Orders"],
        summary: "Get one owned order",
        operationId: "getOrderById",
        security: [{ bearerAuth: [] }],
        parameters: [idParameter],
        responses: {
          200: dataResponse("Order fetched.", { $ref: "#/components/schemas/Order" }),
          401: errorResponse("Authentication required."),
          404: errorResponse("Order not found or not owned by the current customer."),
          500: errorResponse("Unexpected server error."),
        },
      },
    },
    "/orders/{id}/reorder": {
      post: {
        tags: ["Orders"],
        summary: "Reorder an owned order",
        operationId: "reorder",
        security: [{ bearerAuth: [] }],
        parameters: [idParameter],
        responses: {
          201: dataResponse("Reorder placed.", { $ref: "#/components/schemas/Order" }),
          401: errorResponse("Authentication required."),
          404: errorResponse("Order not found or not owned by the current customer."),
          500: errorResponse("Unexpected server error."),
        },
      },
    },
    "/proofs/orders/{orderId}": {
      post: {
        tags: ["Proofs"],
        summary: "Add a new proof version",
        description: "Admin only. Supersedes any currently pending proof for the order.",
        operationId: "createProof",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "orderId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Order UUID (demo data may use a readable ID).",
          },
          demoAdminHeader,
        ],
        requestBody: {
          required: true,
          content: jsonContent(
            { $ref: "#/components/schemas/CreateProofRequest" },
            {
              previewPath: "proofs/DH-123456/v1-preview.png",
              notes: "Please confirm the trim and colours.",
            },
          ),
        },
        responses: {
          201: dataResponse("Proof created.", { $ref: "#/components/schemas/Proof" }),
          400: errorResponse("Validation failed."),
          401: errorResponse("Authentication required."),
          403: errorResponse("Admin access required."),
          404: errorResponse("Order not found."),
          500: errorResponse("Unexpected server error."),
        },
      },
    },
    "/proofs/{id}/approve": {
      post: {
        tags: ["Proofs"],
        summary: "Approve a proof",
        description: "The customer who owns the order (or an admin) can approve the exact proof version.",
        operationId: "approveProof",
        security: [{ bearerAuth: [] }],
        parameters: [idParameter],
        responses: {
          200: dataResponse("Proof approved.", { $ref: "#/components/schemas/Proof" }),
          401: errorResponse("Authentication required."),
          403: errorResponse("The current user cannot approve this proof."),
          404: errorResponse("Proof not found."),
          500: errorResponse("Unexpected server error."),
        },
      },
    },
    "/proofs/{id}/change-request": {
      post: {
        tags: ["Proofs"],
        summary: "Request changes to a proof",
        operationId: "requestProofChanges",
        security: [{ bearerAuth: [] }],
        parameters: [idParameter],
        requestBody: {
          required: true,
          content: jsonContent(
            { $ref: "#/components/schemas/ChangeRequest" },
            { message: "Please move the race number slightly higher." },
          ),
        },
        responses: {
          200: dataResponse("Changes requested.", { $ref: "#/components/schemas/Proof" }),
          400: errorResponse("Validation failed."),
          401: errorResponse("Authentication required."),
          403: errorResponse("Only the customer who owns the order can request changes."),
          404: errorResponse("Proof not found."),
          500: errorResponse("Unexpected server error."),
        },
      },
    },
    "/admin/jobs": {
      get: {
        tags: ["Admin"],
        summary: "Search the production queue",
        operationId: "getAdminJobs",
        security: [{ bearerAuth: [] }],
        parameters: [
          demoAdminHeader,
          { name: "status", in: "query", schema: { $ref: "#/components/schemas/OrderStatus" } },
          { name: "q", in: "query", schema: { type: "string" }, description: "Order/customer text search." },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 50 } },
          { name: "offset", in: "query", schema: { type: "integer", minimum: 0, default: 0 } },
        ],
        responses: {
          200: dataResponse("Production jobs fetched.", { $ref: "#/components/schemas/JobList" }),
          400: errorResponse("Invalid query parameters."),
          401: errorResponse("Authentication required."),
          403: errorResponse("Admin access required."),
          500: errorResponse("Unexpected server error."),
        },
      },
    },
    "/admin/jobs/{id}/status": {
      patch: {
        tags: ["Admin"],
        summary: "Update a production job status",
        description: "Moving a job to production requires an approved proof.",
        operationId: "updateJobStatus",
        security: [{ bearerAuth: [] }],
        parameters: [idParameter, demoAdminHeader],
        requestBody: {
          required: true,
          content: jsonContent(
            {
              type: "object",
              properties: { status: { $ref: "#/components/schemas/OrderStatus" } },
              required: ["status"],
              additionalProperties: false,
            },
            { status: "artwork" },
          ),
        },
        responses: {
          200: dataResponse("Job status updated.", { $ref: "#/components/schemas/Order" }),
          400: errorResponse("Validation failed."),
          401: errorResponse("Authentication required."),
          403: errorResponse("Admin access required."),
          404: errorResponse("Order not found."),
          409: errorResponse("An approved proof is required before production."),
          500: errorResponse("Unexpected server error."),
        },
      },
    },
    "/admin/jobs/{id}/production-file": {
      get: {
        tags: ["Admin"],
        summary: "Download the production PDF",
        operationId: "downloadProductionFile",
        security: [{ bearerAuth: [] }],
        parameters: [idParameter, demoAdminHeader],
        responses: {
          200: {
            description: "Generated production PDF.",
            headers: {
              "Content-Disposition": {
                description: "Attachment filename.",
                schema: { type: "string" },
              },
            },
            content: { "application/pdf": { schema: { type: "string", format: "binary" } } },
          },
          401: errorResponse("Authentication required."),
          403: errorResponse("Admin access required."),
          404: errorResponse("Order not found."),
          409: errorResponse("Production file is locked until proof approval."),
          500: errorResponse("Unexpected server error."),
        },
      },
    },
    "/admin/analytics": {
      get: {
        tags: ["Admin"],
        summary: "Get production and revenue metrics",
        operationId: "getAnalytics",
        security: [{ bearerAuth: [] }],
        parameters: [demoAdminHeader],
        responses: {
          200: dataResponse("Analytics fetched.", { $ref: "#/components/schemas/Analytics" }),
          401: errorResponse("Authentication required."),
          403: errorResponse("Admin access required."),
          500: errorResponse("Unexpected server error."),
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "Supabase JWT",
        description: "Paste the Supabase access token only (without the `Bearer` prefix).",
      },
    },
    schemas: {
      SuccessResponse: {
        type: "object",
        properties: {
          status: { type: "integer", example: 200 },
          success: { type: "boolean", enum: [true] },
          message: { type: "string" },
          response: {
            type: "object",
            properties: { data: {} },
            required: ["data"],
          },
        },
        required: ["status", "success", "message", "response"],
      },
      ErrorResponse: {
        type: "object",
        properties: {
          status: { type: "integer", example: 400 },
          success: { type: "boolean", enum: [false] },
          message: { type: "string", example: "Validation failed." },
          response: {
            type: "object",
            properties: {
              data: {
                nullable: true,
                example: { errors: [{ field: "quantity", message: "Too small" }] },
              },
            },
            required: ["data"],
          },
        },
        required: ["status", "success", "message", "response"],
      },
      SignupRequest: {
        type: "object",
        properties: {
          email: { type: "string", format: "email", maxLength: 254 },
          password: { type: "string", format: "password", minLength: 8, maxLength: 128 },
          fullName: { type: "string", minLength: 2, maxLength: 100 },
          phone: {
            type: "string",
            pattern: "^\\+?[1-9]\\d{7,14}$",
            example: "+919876543210",
          },
          role: { type: "string", enum: ["customer"] },
        },
        required: ["email", "password", "fullName", "phone", "role"],
      },
      LoginRequest: {
        type: "object",
        properties: {
          email: { type: "string", format: "email", maxLength: 254 },
          password: { type: "string", format: "password", minLength: 8, maxLength: 128 },
        },
        required: ["email", "password"],
      },
      RefreshRequest: {
        type: "object",
        properties: {
          refreshToken: { type: "string", minLength: 20 },
        },
        required: ["refreshToken"],
      },
      AuthUser: {
        type: "object",
        nullable: true,
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string", format: "email" },
          fullName: { type: "string", nullable: true },
          phone: { type: "string", nullable: true },
          role: { type: "string", enum: ["customer"] },
          emailConfirmedAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      AuthSession: {
        type: "object",
        nullable: true,
        properties: {
          accessToken: { type: "string", description: "Use this with Swagger's Authorize button." },
          refreshToken: { type: "string" },
          expiresAt: { type: "integer", description: "Unix timestamp in seconds." },
          expiresIn: { type: "integer", description: "Lifetime in seconds." },
          tokenType: { type: "string", example: "bearer" },
        },
      },
      AuthResult: {
        type: "object",
        properties: {
          user: { $ref: "#/components/schemas/AuthUser" },
          session: { $ref: "#/components/schemas/AuthSession" },
          requiresEmailConfirmation: { type: "boolean" },
        },
        required: ["user", "session", "requiresEmailConfirmation"],
      },
      CurrentUser: {
        type: "object",
        properties: {
          id: { type: "string" },
          email: { type: "string", format: "email" },
          role: { type: "string", enum: ["customer", "admin"] },
          fullName: { type: "string", nullable: true },
        },
        required: ["id", "email", "role"],
      },
      Health: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["ok"] },
          database: { type: "string", enum: ["demo", "prisma/supabase"] },
          uptime: { type: "number", format: "double" },
          timestamp: { type: "string", format: "date-time" },
        },
        required: ["status", "database", "uptime", "timestamp"],
      },
      Product: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          slug: { type: "string", example: "labels" },
          name: { type: "string", example: "Labels & Stickers" },
          family: { type: "string", example: "labels" },
          description: { type: "string", nullable: true },
          basePrice: { type: "number", format: "double", example: 1.8 },
          minQuantity: { type: "integer", example: 25 },
          minWidth: { type: "number", example: 20 },
          maxWidth: { type: "number", example: 500 },
          minHeight: { type: "number", example: 20 },
          maxHeight: { type: "number", example: 500 },
          defaultWidth: { type: "number", example: 100 },
          defaultHeight: { type: "number", example: 100 },
          material: { type: "string", example: "Premium vinyl" },
          bleedMm: { type: "number", example: 3 },
          resolutionDpi: { type: "integer", example: 300 },
          configurationSchema: {
            type: "object",
            description: "Stored product configuration plus live active templates loaded from the template relation.",
            properties: {
              templates: {
                type: "array",
                items: { $ref: "#/components/schemas/Template" },
              },
            },
            required: ["templates"],
            additionalProperties: true,
          },
          active: { type: "boolean" },
        },
        required: ["id", "slug", "name", "family", "basePrice", "minQuantity"],
      },
      CreateProductRequest: {
        type: "object",
        additionalProperties: false,
        properties: {
          slug: {
            type: "string",
            minLength: 2,
            maxLength: 100,
            pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
          },
          name: { type: "string", minLength: 2, maxLength: 200 },
          family: {
            type: "string",
            enum: ["labels", "race_numbers", "mtb_boards", "stamps", "trophies", "laser_cut"],
          },
          description: { type: "string", maxLength: 2000, nullable: true },
          basePrice: { type: "number", exclusiveMinimum: true, minimum: 0 },
          minQuantity: { type: "integer", minimum: 1, default: 1 },
          minWidth: { type: "number", exclusiveMinimum: true, minimum: 0 },
          maxWidth: { type: "number", exclusiveMinimum: true, minimum: 0 },
          minHeight: { type: "number", exclusiveMinimum: true, minimum: 0 },
          maxHeight: { type: "number", exclusiveMinimum: true, minimum: 0 },
          defaultWidth: { type: "number", exclusiveMinimum: true, minimum: 0 },
          defaultHeight: { type: "number", exclusiveMinimum: true, minimum: 0 },
          bleedMm: { type: "number", minimum: 0, default: 3 },
          resolutionDpi: { type: "integer", minimum: 72, maximum: 2400, default: 300 },
          configurationSchema: { type: "object", additionalProperties: true, default: {} },
          active: { type: "boolean", default: true },
          sortOrder: { type: "integer", minimum: -32768, maximum: 32767, default: 0 },
        },
        required: [
          "slug",
          "name",
          "family",
          "basePrice",
          "minWidth",
          "maxWidth",
          "minHeight",
          "maxHeight",
          "defaultWidth",
          "defaultHeight",
        ],
      },
      UpdateProductRequest: {
        type: "object",
        additionalProperties: false,
        minProperties: 1,
        properties: {
          slug: {
            type: "string",
            minLength: 2,
            maxLength: 100,
            pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
          },
          name: { type: "string", minLength: 2, maxLength: 200 },
          family: {
            type: "string",
            enum: ["labels", "race_numbers", "mtb_boards", "stamps", "trophies", "laser_cut"],
          },
          description: { type: "string", maxLength: 2000, nullable: true },
          basePrice: { type: "number", exclusiveMinimum: true, minimum: 0 },
          minQuantity: { type: "integer", minimum: 1 },
          minWidth: { type: "number", exclusiveMinimum: true, minimum: 0 },
          maxWidth: { type: "number", exclusiveMinimum: true, minimum: 0 },
          minHeight: { type: "number", exclusiveMinimum: true, minimum: 0 },
          maxHeight: { type: "number", exclusiveMinimum: true, minimum: 0 },
          defaultWidth: { type: "number", exclusiveMinimum: true, minimum: 0 },
          defaultHeight: { type: "number", exclusiveMinimum: true, minimum: 0 },
          bleedMm: { type: "number", minimum: 0 },
          resolutionDpi: { type: "integer", minimum: 72, maximum: 2400 },
          configurationSchema: { type: "object", additionalProperties: true },
          active: { type: "boolean" },
          sortOrder: { type: "integer", minimum: -32768, maximum: 32767 },
        },
      },
      SafeArea: {
        type: "object",
        additionalProperties: false,
        properties: {
          x: { type: "number", minimum: 0 },
          y: { type: "number", minimum: 0 },
          width: { type: "number", exclusiveMinimum: true, minimum: 0 },
          height: { type: "number", exclusiveMinimum: true, minimum: 0 },
          unit: { type: "string", enum: ["mm"], default: "mm" },
        },
        required: ["x", "y", "width", "height"],
      },
      Template: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          productId: { type: "string", format: "uuid" },
          name: { type: "string" },
          canvasWidth: { type: "number", description: "Canvas width in millimetres." },
          canvasHeight: { type: "number", description: "Canvas height in millimetres." },
          safeArea: { $ref: "#/components/schemas/SafeArea" },
          placeholderRules: { type: "object", additionalProperties: true },
          thumbnailPath: { type: "string", nullable: true },
          active: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
        },
        required: ["id", "productId", "name", "canvasWidth", "canvasHeight", "safeArea", "placeholderRules", "active", "createdAt"],
      },
      CreateTemplateRequest: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string", minLength: 2, maxLength: 200 },
          canvasWidth: { type: "number", exclusiveMinimum: true, minimum: 0 },
          canvasHeight: { type: "number", exclusiveMinimum: true, minimum: 0 },
          safeArea: { $ref: "#/components/schemas/SafeArea" },
          placeholderRules: { type: "object", additionalProperties: true, default: {} },
          thumbnailPath: { type: "string", minLength: 1, maxLength: 1000, nullable: true },
          active: { type: "boolean", default: true },
        },
        required: ["name", "canvasWidth", "canvasHeight", "safeArea"],
      },
      UpdateTemplateRequest: {
        type: "object",
        additionalProperties: false,
        minProperties: 1,
        properties: {
          name: { type: "string", minLength: 2, maxLength: 200 },
          canvasWidth: { type: "number", exclusiveMinimum: true, minimum: 0 },
          canvasHeight: { type: "number", exclusiveMinimum: true, minimum: 0 },
          safeArea: { $ref: "#/components/schemas/SafeArea" },
          placeholderRules: { type: "object", additionalProperties: true },
          thumbnailPath: { type: "string", minLength: 1, maxLength: 1000, nullable: true },
          active: { type: "boolean" },
        },
      },
      FileUploadResult: {
        type: "object",
        properties: {
          bucket: { type: "string", enum: ["uploads"] },
          path: {
            type: "string",
            description: "User-scoped permanent storage path. Save this value instead of the expiring signed URL.",
          },
          originalName: { type: "string" },
          mimeType: {
            type: "string",
            enum: ["image/png", "image/jpeg", "image/webp", "application/pdf"],
          },
          size: { type: "integer", minimum: 1 },
          category: {
            type: "string",
            enum: ["general", "products", "templates", "artwork", "proofs"],
          },
          signedUrl: { type: "string", format: "uri" },
          signedUrlExpiresIn: { type: "integer", enum: [3600] },
        },
        required: ["bucket", "path", "originalName", "mimeType", "size", "category", "signedUrl", "signedUrlExpiresIn"],
      },
      PriceRequest: {
        type: "object",
        properties: {
          productSlug: { type: "string", minLength: 1 },
          width: { type: "number", exclusiveMinimum: true, minimum: 0, description: "Width in millimetres." },
          height: { type: "number", exclusiveMinimum: true, minimum: 0, description: "Height in millimetres." },
          quantity: { type: "integer", minimum: 1 },
          materialMultiplier: { type: "number", minimum: 0.5, maximum: 3, default: 1 },
        },
        required: ["productSlug", "width", "height", "quantity"],
      },
      CreateOrderRequest: {
        allOf: [
          { $ref: "#/components/schemas/PriceRequest" },
          {
            type: "object",
            properties: {
              material: { type: "string", minLength: 1, default: "standard" },
              designId: { type: "string", format: "uuid" },
              configuration: { type: "object", additionalProperties: true, default: {} },
            },
          },
        ],
      },
      Price: {
        type: "object",
        properties: {
          currency: { type: "string", example: "INR" },
          unitPrice: { type: "number", example: 1.51 },
          subtotal: { type: "number", example: 151 },
          tax: { type: "number", example: 27.18 },
          total: { type: "number", example: 178.18 },
          discountPercent: { type: "integer", example: 16 },
          quantity: { type: "integer", example: 100 },
          width: { type: "number", example: 100 },
          height: { type: "number", example: 100 },
        },
        required: ["currency", "unitPrice", "subtotal", "tax", "total", "discountPercent", "quantity", "width", "height"],
      },
      AddCartItemRequest: {
        type: "object",
        additionalProperties: false,
        properties: {
          productSlug: { type: "string", minLength: 1, maxLength: 100 },
          width: { type: "number", exclusiveMinimum: true, minimum: 0 },
          height: { type: "number", exclusiveMinimum: true, minimum: 0 },
          quantity: { type: "integer", minimum: 1 },
          material: { type: "string", minLength: 1, maxLength: 200, default: "standard" },
          materialMultiplier: { type: "number", minimum: 0.5, maximum: 3, default: 1 },
          configuration: { type: "object", additionalProperties: true, default: {} },
        },
        required: ["productSlug", "width", "height", "quantity"],
      },
      UpdateCartItemRequest: {
        type: "object",
        additionalProperties: false,
        minProperties: 1,
        properties: {
          width: { type: "number", exclusiveMinimum: true, minimum: 0 },
          height: { type: "number", exclusiveMinimum: true, minimum: 0 },
          quantity: { type: "integer", minimum: 1 },
          material: { type: "string", minLength: 1, maxLength: 200 },
          materialMultiplier: { type: "number", minimum: 0.5, maximum: 3 },
          configuration: { type: "object", additionalProperties: true },
        },
      },
      CartProduct: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          slug: { type: "string" },
          name: { type: "string" },
          family: { type: "string" },
          active: { type: "boolean" },
        },
        required: ["id", "slug", "name", "family", "active"],
      },
      CartItem: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          product: { $ref: "#/components/schemas/CartProduct" },
          quantity: { type: "integer" },
          width: { type: "number", description: "Width in millimetres." },
          height: { type: "number", description: "Height in millimetres." },
          material: { type: "string" },
          materialMultiplier: { type: "number" },
          configuration: { type: "object", additionalProperties: true },
          price: { $ref: "#/components/schemas/Price" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
        required: ["id", "product", "quantity", "width", "height", "material", "materialMultiplier", "configuration", "price"],
      },
      CartSummary: {
        type: "object",
        properties: {
          currency: { type: "string", enum: ["INR"] },
          itemCount: { type: "integer", minimum: 0 },
          totalQuantity: { type: "integer", minimum: 0 },
          subtotal: { type: "number", minimum: 0 },
          tax: { type: "number", minimum: 0 },
          total: { type: "number", minimum: 0 },
        },
        required: ["currency", "itemCount", "totalQuantity", "subtotal", "tax", "total"],
      },
      Cart: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid", nullable: true },
          customerId: { type: "string", format: "uuid" },
          items: { type: "array", items: { $ref: "#/components/schemas/CartItem" } },
          summary: { $ref: "#/components/schemas/CartSummary" },
          createdAt: { type: "string", format: "date-time", nullable: true },
          updatedAt: { type: "string", format: "date-time", nullable: true },
        },
        required: ["id", "customerId", "items", "summary", "createdAt", "updatedAt"],
      },
      Address: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          customerId: { type: "string", format: "uuid" },
          label: { type: "string" },
          recipientName: { type: "string" },
          phone: { type: "string" },
          addressLine1: { type: "string" },
          addressLine2: { type: "string", nullable: true },
          city: { type: "string" },
          state: { type: "string" },
          postalCode: { type: "string" },
          countryCode: { type: "string", minLength: 2, maxLength: 2 },
          isDefault: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
        required: ["id", "customerId", "label", "recipientName", "phone", "addressLine1", "city", "state", "postalCode", "countryCode", "isDefault", "createdAt", "updatedAt"],
      },
      CreateAddressRequest: {
        type: "object",
        additionalProperties: false,
        properties: {
          label: { type: "string", minLength: 1, maxLength: 50, default: "Home" },
          recipientName: { type: "string", minLength: 2, maxLength: 100 },
          phone: { type: "string", pattern: "^\\+?[1-9]\\d{7,14}$" },
          addressLine1: { type: "string", minLength: 3, maxLength: 200 },
          addressLine2: { type: "string", maxLength: 200, nullable: true },
          city: { type: "string", minLength: 2, maxLength: 100 },
          state: { type: "string", minLength: 2, maxLength: 100 },
          postalCode: { type: "string", minLength: 3, maxLength: 20 },
          countryCode: { type: "string", pattern: "^[A-Za-z]{2}$", default: "IN" },
          isDefault: { type: "boolean", default: false },
        },
        required: ["recipientName", "phone", "addressLine1", "city", "state", "postalCode"],
      },
      UpdateAddressRequest: {
        type: "object",
        additionalProperties: false,
        minProperties: 1,
        properties: {
          label: { type: "string", minLength: 1, maxLength: 50 },
          recipientName: { type: "string", minLength: 2, maxLength: 100 },
          phone: { type: "string", pattern: "^\\+?[1-9]\\d{7,14}$" },
          addressLine1: { type: "string", minLength: 3, maxLength: 200 },
          addressLine2: { type: "string", maxLength: 200, nullable: true },
          city: { type: "string", minLength: 2, maxLength: 100 },
          state: { type: "string", minLength: 2, maxLength: 100 },
          postalCode: { type: "string", minLength: 3, maxLength: 20 },
          countryCode: { type: "string", pattern: "^[A-Za-z]{2}$" },
        },
      },
      OrderStatus: {
        type: "string",
        enum: ["quote", "order", "artwork", "proof", "production", "completed"],
      },
      Order: {
        type: "object",
        description: "Order fields use camelCase with Prisma and snake_case in local demo mode.",
        additionalProperties: true,
        properties: {
          id: { type: "string" },
          orderNumber: { type: "string", example: "DH-123456" },
          order_number: { type: "string", example: "DH-123456" },
          status: { type: "string", example: "order" },
          proofStatus: { type: "string", example: "not_started" },
          proof_status: { type: "string", example: "not_started" },
          productionReady: { type: "boolean" },
          production_ready: { type: "boolean" },
          subtotal: { type: "number" },
          tax: { type: "number" },
          total: { type: "number", example: 178.18 },
          currency: { type: "string", example: "INR" },
          configuration: { type: "object", additionalProperties: true },
          items: { type: "array", items: { type: "object", additionalProperties: true } },
          proofs: { type: "array", items: { $ref: "#/components/schemas/Proof" } },
          events: { type: "array", items: { type: "object", additionalProperties: true } },
          createdAt: { type: "string", format: "date-time" },
          created_at: { type: "string", format: "date-time" },
        },
        required: ["id", "status"],
      },
      CreateProofRequest: {
        type: "object",
        properties: {
          previewPath: { type: "string", minLength: 1 },
          notes: { type: "string", maxLength: 2000 },
        },
        required: ["previewPath"],
        additionalProperties: false,
      },
      ChangeRequest: {
        type: "object",
        properties: { message: { type: "string", minLength: 5, maxLength: 2000 } },
        required: ["message"],
        additionalProperties: false,
      },
      Proof: {
        type: "object",
        additionalProperties: true,
        properties: {
          id: { type: "string" },
          orderId: { type: "string" },
          order_id: { type: "string" },
          version: { type: "integer", example: 1 },
          status: { type: "string", enum: ["pending", "approved", "changes_requested", "superseded"] },
          previewPath: { type: "string" },
          preview_path: { type: "string" },
          notes: { type: "string", nullable: true },
          changeRequest: { type: "string", nullable: true },
          change_request: { type: "string", nullable: true },
          approvedAt: { type: "string", format: "date-time", nullable: true },
          approved_at: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          created_at: { type: "string", format: "date-time" },
        },
        required: ["id", "version", "status"],
      },
      JobList: {
        type: "object",
        properties: {
          jobs: { type: "array", items: { $ref: "#/components/schemas/Order" } },
          total: { type: "integer", example: 12 },
        },
        required: ["jobs", "total"],
      },
      Analytics: {
        type: "object",
        properties: {
          orders: { type: "integer", example: 24 },
          revenue: { type: "number", example: 145820.5 },
          awaitingProof: { type: "integer", example: 3 },
          inProduction: { type: "integer", example: 7 },
          completed: { type: "integer", example: 14 },
        },
        required: ["orders", "revenue", "awaitingProof", "inProduction", "completed"],
      },
    },
  },
};
