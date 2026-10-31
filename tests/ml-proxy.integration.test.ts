import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { after, before, describe, it } from "node:test";
import jwt from "jsonwebtoken";
import type { Express } from "express";

process.env.ML_API_URL = "http://127.0.0.1:18000";
process.env.JWT_SECRET = "integration-test-secret";

const requests: Array<{
  path: string;
  authorization?: string;
}> = [];
let mlServer: Server;
let backendServer: Server;
let app: Express;

before(async () => {
  mlServer = createServer((request, response) => {
    requests.push({
      path: `${request.url}`,
      authorization: request.headers.authorization,
    });

    if (request.url?.startsWith("/forecast")) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ source: "ml", route: request.url }));
      return;
    }
    if (request.url?.startsWith("/condicoes-ambientais")) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ meses: ["2026-01", "2026-02", "2026-03"] }));
      return;
    }
    if (request.url?.startsWith("/coastal-risks")) {
      response.writeHead(422, { "content-type": "application/json" });
      response.end(JSON.stringify({ detail: "filtro inválido" }));
      return;
    }
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ source: "ml", route: request.url }));
  });
  await new Promise<void>((resolve) => mlServer.listen(18000, "127.0.0.1", resolve));
  ({ app } = await import("../src/app.js"));
  backendServer = createServer(app);
  await new Promise<void>((resolve) => backendServer.listen(18001, "127.0.0.1", resolve));
});

after(async () => {
  await new Promise<void>((resolve, reject) => backendServer.close((error) => (error ? reject(error) : resolve())));
  await new Promise<void>((resolve, reject) => mlServer.close((error) => (error ? reject(error) : resolve())));
});

function token(): string {
  return jwt.sign({ sub: "integration-test" }, process.env.JWT_SECRET as string);
}

describe("ML proxy", () => {
  it("repassa query parameters e Authorization para condições ambientais", async () => {
    const authorization = `Bearer ${token()}`;
    const response = await fetch("http://127.0.0.1:18001/api/ml/condicoes-ambientais?meses_passados=9&meses=3", {
      headers: { authorization },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { meses: ["2026-01", "2026-02", "2026-03"] });
    assert.equal(requests.at(-1)?.path, "/condicoes-ambientais?meses_passados=9&meses=3");
    assert.equal(requests.at(-1)?.authorization, authorization);
  });

  it("preserva as respostas das rotas forecast", async () => {
    const response = await fetch("http://127.0.0.1:18001/api/ml/forecast/mapa?target_date=2026-03&nivel_minimo=ALTO", {
      headers: { authorization: `Bearer ${token()}` },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { source: "ml", route: "/forecast/mapa?target_date=2026-03&nivel_minimo=ALTO" });
  });

  it("preserva status e corpo de erro do ML", async () => {
    const response = await fetch("http://127.0.0.1:18001/api/ml/coastal-risks?meses=3", {
      headers: { authorization: `Bearer ${token()}` },
    });
    assert.equal(response.status, 422);
    assert.deepEqual(await response.json(), { detail: "filtro inválido" });
  });
});
