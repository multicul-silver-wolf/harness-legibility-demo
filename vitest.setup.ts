import { loadEnvConfig } from "@next/env";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

loadEnvConfig(process.cwd());

afterEach(() => {
  cleanup();
});
