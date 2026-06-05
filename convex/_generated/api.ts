/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * This checked-in fallback keeps local typechecking working before the project
 * is linked to a Convex deployment. Run `npm run convex:codegen` after
 * configuring Convex to replace it with deployment-aware types.
 */
import type { AnyApi, AnyComponents } from 'convex/server'
import { anyApi, componentsGeneric } from 'convex/server'

export const api: AnyApi = anyApi
export const internal: AnyApi = anyApi
export const components: AnyComponents = componentsGeneric()
