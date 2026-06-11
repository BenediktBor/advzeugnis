/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ResendOTP from "../ResendOTP.js";
import type * as auth from "../auth.js";
import type * as billing from "../billing.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_config from "../lib/config.js";
import type * as lib_emails from "../lib/emails.js";
import type * as lib_templateMigration from "../lib/templateMigration.js";
import type * as lib_templateValidation from "../lib/templateValidation.js";
import type * as lib_templateVisibility from "../lib/templateVisibility.js";
import type * as schools from "../schools.js";
import type * as templates from "../templates.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ResendOTP: typeof ResendOTP;
  auth: typeof auth;
  billing: typeof billing;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/config": typeof lib_config;
  "lib/emails": typeof lib_emails;
  "lib/templateMigration": typeof lib_templateMigration;
  "lib/templateValidation": typeof lib_templateValidation;
  "lib/templateVisibility": typeof lib_templateVisibility;
  schools: typeof schools;
  templates: typeof templates;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
