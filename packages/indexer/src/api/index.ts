import { db } from "ponder:api";
import schema from "ponder:schema";
import { Hono } from "hono";
import { client, graphql, eq } from "ponder";
import { bet } from "ponder:schema";

const app = new Hono();

app.use("/sql/*", client({ db, schema }));

app.use("/", graphql({ db, schema }));
app.use("/graphql", graphql({ db, schema }));

app.get("/bets/:id", async (c) => {
  const id = BigInt(c.req.param("id"));
  const result = await db.select().from(bet).where(eq(bet.id, id)).limit(1);
  const record = result[0];
  if (!record) return c.json({ error: "Not found" }, 404);
  return c.json(record);
});

export default app;
