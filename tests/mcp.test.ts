import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/mcp/route";

function rpc(body: unknown) {
  return POST(new Request("http://localhost/api/mcp", { method: "POST", body: JSON.stringify(body) }));
}

describe("MCP route", () => {
  it("echoes the JSON-RPC request id", async () => {
    const res = await rpc({ jsonrpc: "2.0", id: 7, method: "tools/list" });
    expect((await res.json()).id).toBe(7);
  });

  it("get_all returns the sample notebook", async () => {
    const res = await rpc({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "get_all" } });
    const { result } = await res.json();
    expect(result.items.map((i: { id: string }) => i.id)).toEqual(["edge-runtime", "mono-type"]);
  });

  it("search filters by text and state", async () => {
    const res = await rpc({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "search", arguments: { query: "type" } } });
    expect((await res.json()).result.items.map((i: { id: string }) => i.id)).toEqual(["mono-type"]);
    const active = await rpc({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "search", arguments: { query: "", status: "Active" } } });
    expect((await active.json()).result.items.map((i: { id: string }) => i.id)).toEqual(["edge-runtime"]);
  });

  it("returns errors for an unknown id, status, tool or method", async () => {
    const byId = await (await rpc({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "get_by_id", arguments: { id: "nope" } } })).json();
    expect(byId.error.code).toBe(-32602);
    expect(byId.id).toBe(3);
    const status = await (await rpc({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "search", arguments: { query: "", status: "Lost" } } })).json();
    expect(status.error.code).toBe(-32602);
    expect((await (await rpc({ jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "delete_all" } })).json()).error.code).toBe(-32602);
    expect((await (await rpc({ jsonrpc: "2.0", id: 6, method: "resources/list" })).json()).error.code).toBe(-32601);
  });

  it("answers initialize and rejects a malformed body", async () => {
    expect((await (await rpc({ jsonrpc: "2.0", id: 8, method: "initialize" })).json()).result.serverInfo.name).toBe("Lab Notebook");
    const bad = await POST(new Request("http://localhost/api/mcp", { method: "POST", body: "{" }));
    expect((await bad.json()).error.code).toBe(-32700);
  });
});
