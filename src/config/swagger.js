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
          configurationSchema: { type: "object", additionalProperties: true },
          active: { type: "boolean" },
        },
        required: ["id", "slug", "name", "family", "basePrice", "minQuantity"],
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
