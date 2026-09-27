import assert from "node:assert/strict";
import test from "node:test";

import { siteRedirects } from "../lib/site-redirects.ts";

void test("permanently redirects the old Jack and Coke canonical route", () => {
  assert.deepEqual(
    siteRedirects.find(({ source }) => source === "/JackAndCoke"),
    {
      source: "/JackAndCoke",
      destination: "/JackAndCocoa",
      permanent: true,
    }
  );
});
