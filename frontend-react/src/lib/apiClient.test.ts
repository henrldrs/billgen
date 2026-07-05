import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { ApiClient, ApiError, MemoryTokenStore } from "./apiClient";

const BASE = "http://api.test";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function makeClient(onAuthLost?: () => void) {
  const tokens = new MemoryTokenStore();
  tokens.set({ access_token: "access-0", refresh_token: "refresh-0" });
  return { client: new ApiClient({ baseUrl: BASE, tokens, onAuthLost }), tokens };
}

test("attaches the bearer token to protected calls", async () => {
  let seenAuth: string | null = null;
  server.use(
    http.get(`${BASE}/users/me`, ({ request }) => {
      seenAuth = request.headers.get("authorization");
      return HttpResponse.json({
        id: "u1",
        email: "a@b.co",
        display_name: "A",
        organization_id: "o1",
        role: "owner",
      });
    }),
  );

  const { client } = makeClient();
  const me = await client.me();
  expect(me.email).toBe("a@b.co");
  expect(seenAuth).toBe("Bearer access-0");
});

test("on 401 refreshes once and retries with the new access token", async () => {
  let meCalls = 0;
  server.use(
    http.get(`${BASE}/users/me`, ({ request }) => {
      meCalls += 1;
      if (request.headers.get("authorization") === "Bearer access-1") {
        return HttpResponse.json({
          id: "u1",
          email: "a@b.co",
          display_name: "A",
          organization_id: "o1",
          role: "owner",
        });
      }
      return HttpResponse.json({ detail: "expired" }, { status: 401 });
    }),
    http.post(`${BASE}/auth/refresh`, () =>
      HttpResponse.json({
        access_token: "access-1",
        refresh_token: "refresh-1",
        token_type: "bearer",
        expires_in: 900,
      }),
    ),
  );

  const { client, tokens } = makeClient();
  const me = await client.me();
  expect(me.email).toBe("a@b.co");
  expect(meCalls).toBe(2); // failed once, retried once
  expect(tokens.getAccess()).toBe("access-1");
  expect(tokens.getRefresh()).toBe("refresh-1"); // rotation stored
});

test("failed refresh clears tokens and fires onAuthLost", async () => {
  server.use(
    http.get(`${BASE}/users/me`, () =>
      HttpResponse.json({ detail: "expired" }, { status: 401 }),
    ),
    http.post(`${BASE}/auth/refresh`, () =>
      HttpResponse.json({ detail: "revoked" }, { status: 401 }),
    ),
  );

  let authLost = false;
  const { client, tokens } = makeClient(() => {
    authLost = true;
  });

  await expect(client.me()).rejects.toThrow(ApiError);
  expect(authLost).toBe(true);
  expect(tokens.getAccess()).toBeNull();
});

test("ApiError carries status and detail from the server", async () => {
  server.use(
    http.post(`${BASE}/invoices`, () =>
      HttpResponse.json({ detail: "Client does not belong to this company" }, { status: 409 }),
    ),
  );

  const { client } = makeClient();
  const failure = client.createInvoice({
    company_id: "c1",
    client_id: "x1",
    lines: [{ description: "d", quantity: "1", unit_price: "1" }],
  });
  await expect(failure).rejects.toMatchObject({
    status: 409,
    detail: "Client does not belong to this company",
  });
});

test("signup stores the returned tokens", async () => {
  server.use(
    http.post(`${BASE}/auth/signup`, () =>
      HttpResponse.json(
        {
          user_id: "u1",
          email: "new@b.co",
          display_name: "New",
          organization_id: "o1",
          organization_name: "Org",
          tokens: {
            access_token: "fresh-access",
            refresh_token: "fresh-refresh",
            token_type: "bearer",
            expires_in: 900,
          },
        },
        { status: 201 },
      ),
    ),
  );

  const tokens = new MemoryTokenStore();
  const client = new ApiClient({ baseUrl: BASE, tokens });
  await client.signup({
    email: "new@b.co",
    password: "long-enough",
    display_name: "New",
    organization_name: "Org",
  });
  expect(tokens.getAccess()).toBe("fresh-access");
});
