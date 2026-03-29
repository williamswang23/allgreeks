// Copyright (c) 2026, Williams.Wang. All rights reserved. Use restricted under LICENSE terms.
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
  },
});
