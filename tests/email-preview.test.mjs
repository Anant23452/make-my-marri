import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

// Next.js resolves the server-only marker; this isolated test runs the same
// delivery guards without that framework marker or contacting any service.
const source = (await readFile(new URL("../src/lib/email/delivery.ts", import.meta.url), "utf8")).replace('import "server-only";', "");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { isLocalEmailPreview, savePreviewEmail, getPreviewEmails } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
process.env.BETTER_AUTH_URL = "http://localhost:3000";
delete process.env.RESEND_API_KEY;
process.env.NODE_ENV = "production";
assert.equal(isLocalEmailPreview(), false);
assert.throws(() => savePreviewEmail({ to: "test@example.invalid", subject: "test", text: "test" }));
assert.deepEqual(getPreviewEmails(), []);
process.env.NODE_ENV = "development";
assert.equal(isLocalEmailPreview(), true);
savePreviewEmail({ to: "test@example.invalid", subject: "test", text: "test" });
assert.equal(getPreviewEmails().length, 1);
process.env.BETTER_AUTH_URL = "https://public.example";
assert.equal(isLocalEmailPreview(), false);
assert.deepEqual(getPreviewEmails(), []);
process.env.BETTER_AUTH_URL = "http://localhost:3000";
process.env.RESEND_API_KEY = "configured";
assert.equal(isLocalEmailPreview(), false);
console.log("PASS: production preview/read/write disabled; local development preview works; public URL and configured provider disable preview.");
