// Tasker's "your app's backend" half. One protected route, verified via the
// Edge Plane shim — NEVER the quant0 gateway directly (this is the whole
// point: the agent verifies offline against its cached JWKS, so this server
// never has to trust the frontend's claim about who's signed in, and never
// makes a network call to the gateway on the request path). Reuses
// sdks/typescript/examples/express-quickstart.ts's exact pattern
// (quant0-enterprise), which this app depends on as a sibling checkout.
import express, { type NextFunction, type Request, type Response } from "express"
import { Quant0Client } from "@quant0/sdk-core"
import { requireAuth } from "@quant0/sdk-core/express"

const app = express()
// Quant0Client() with no args negotiates the local agent, defaulting to
// http://127.0.0.1:9595 — see quant0-enterprise docs/testing/edge-plane-e2e.md
// Part 3 / quant0-client docs/local-testing-q0-agent.md for how to stand one
// up. Works identically whether the AGENT's own Q0_GATEWAY_URL points at a
// local stack or a QA one — this server only ever talks to the agent.
const q0 = new Quant0Client()
const port = Number(process.env.PORT ?? 3101)
const appOrigin = process.env.APP_ORIGIN ?? "http://localhost:3000"

// Minimal CORS for the Tasker frontend. A real app should scope this to its
// actual deployed origin(s) rather than reading it from an env var like this.
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Access-Control-Allow-Origin", appOrigin)
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type")
  if (req.method === "OPTIONS") {
    res.sendStatus(204)
    return
  }
  next()
})

app.use(requireAuth(q0))

app.get("/api/me", (req, res) => {
  const claims = (req as unknown as { quant0: { subject: string; orgId: string } }).quant0
  res.json({ subject: claims.subject, orgId: claims.orgId })
})

app.listen(port, () => {
  console.log(`tasker-server listening on :${port}`)
})
