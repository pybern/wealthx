import type { NextConfig } from "next";
import { withEve } from "eve/next";

const nextConfig: NextConfig = {
  /* config options here */
};

// Mounts the Live Insights eve agent (./agent) at /eve/v1/* on this app's
// origin — one dev server, one deployment.
export default withEve(nextConfig);
