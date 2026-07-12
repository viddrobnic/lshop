import { expect, test, type Page, type Route } from "@playwright/test";

const now = "2026-01-01T00:00:00.000Z";
const user = { id: 1, username: "alex", created_at: now, updated_at: now };
const stores = [{ id: 10, name: "Market", created_at: now, updated_at: now }];
const items = {
  unassigned: [
    { id: 1, name: "Milk", checked: false, created_at: now, updated_at: now },
  ],
  stores: [
    {
      ...stores[0],
      unassigned: [
        {
          id: 2,
          name: "Bread",
          checked: false,
          store_id: 10,
          created_at: now,
          updated_at: now,
        },
      ],
      sections: [
        {
          id: 20,
          store_id: 10,
          name: "Produce",
          created_at: now,
          updated_at: now,
          items: [
            {
              id: 3,
              name: "Apples",
              checked: false,
              store_id: 10,
              section_id: 20,
              created_at: now,
              updated_at: now,
            },
          ],
        },
      ],
    },
  ],
};
const sections = [
  { id: 20, store_id: 10, name: "Produce", created_at: now, updated_at: now },
];
const unassignedItems = { unassigned: items.unassigned, stores: [] };

function json(route: Route, body: unknown) {
  return route.fulfill({
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function interceptApi(
  page: Page,
  options: { authenticated?: boolean; itemList?: typeof items } = {}
) {
  let authenticated = options.authenticated ?? false;
  const itemList = options.itemList ?? items;
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const { pathname } = new URL(request.url());

    if (pathname === "/api/auth/me") {
      if (!authenticated) return route.fulfill({ status: 401 });
      return json(route, user);
    }
    if (pathname === "/api/auth/login" && request.method() === "POST") {
      expect(JSON.parse(request.postData() ?? "{}")).toEqual({
        username: "alex",
        password: "secret",
        auth_type: "web",
      });
      authenticated = true;
      return json(route, null);
    }
    if (pathname === "/api/items") return json(route, itemList);
    if (pathname === "/api/stores") return json(route, stores);
    if (pathname === "/api/stores/10/sections") return json(route, sections);

    return route.fulfill({
      status: 500,
      body: `Unexpected request: ${pathname}`,
    });
  });
}

test("guest login authenticates and opens items", async ({ page }) => {
  await interceptApi(page, { itemList: unassignedItems });

  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
  await page.getByLabel("Username").fill("alex");
  await page.getByLabel("Password").fill("secret");
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Items" })).toBeVisible();
  await expect(page.getByText("1 total items")).toBeVisible();
});

test("authenticated desktop renders items and wildcard route", async ({
  page,
}) => {
  await interceptApi(page, { authenticated: true });

  await page.goto("/");
  await expect(
    page.getByRole("navigation", { name: "Primary navigation" })
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Mobile navigation" })
  ).toBeHidden();
  await page.goto("/missing");
  await expect(
    page.getByRole("heading", { name: "404: Not Found" })
  ).toBeVisible();

  await page.goto("/");
  await expect(page.getByText("Milk")).toBeVisible();
  await expect(page.getByText("Bread")).toBeVisible();
  await expect(page.getByText("Apples")).toBeVisible();
});

test("direct stores navigation loads sections only after expansion", async ({
  page,
}) => {
  await interceptApi(page, { authenticated: true, itemList: unassignedItems });
  let sectionRequests = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/stores/10/sections")
      sectionRequests += 1;
  });

  await page.goto("/stores");
  await expect(page.getByRole("heading", { name: "Stores" })).toBeVisible();
  await expect(page.getByText("Market")).toBeVisible();
  await expect.poll(() => sectionRequests).toBe(0);

  await page.getByRole("button", { name: "Expand Market" }).click();
  await expect(page.getByText("Produce")).toBeVisible();
  await expect.poll(() => sectionRequests).toBe(1);
});

test("mobile navigation remains fixed with safe-area-aware clearance", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await interceptApi(page, { authenticated: true });

  await page.goto("/stores");
  await expect(page.getByRole("heading", { name: "Stores" })).toBeVisible();
  const navigation = page.locator('nav[aria-label="Mobile navigation"]');
  await expect(navigation).toBeVisible();
  await expect(
    page.locator('nav[aria-label="Primary navigation"]')
  ).toBeHidden();
  await expect(navigation.locator('a[href="/stores"]')).toBeVisible();
  await expect(page.locator("main")).toHaveCSS("padding-bottom", "64px");
  await expect(navigation).toHaveCSS("position", "fixed");
  await expect(navigation).toHaveCSS("bottom", "0px");
});
