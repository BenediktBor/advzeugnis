import { defineApp } from 'convex/server'
// Stripe billing is temporarily disabled until the Convex deployment is ready.
// Re-enable by restoring this import and app.use(stripe) below.
// import stripe from '@convex-dev/stripe/convex.config.js'

const app = defineApp()
// app.use(stripe)

export default app
