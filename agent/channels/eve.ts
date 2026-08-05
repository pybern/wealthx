import { eveChannel } from "eve/channels/eve";
import { none } from "eve/channels/auth";

/**
 * HTTP entry point for the browser UI (useEveAgent).
 *
 * WealthLens is an unauthenticated demo with simulated client data and
 * read-only agent tools, so its browser-facing agent route follows the
 * same public access policy as the rest of the app. Replace this with the
 * app's user/session auth policy before connecting real client data.
 */
export default eveChannel({ auth: [none()] });
