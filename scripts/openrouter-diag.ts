import "dotenv/config";
import { connectionTest, diagnosticsReport } from "../src/server/ai/diagnostics";
import { getCatalog } from "../src/server/ai/catalog";

async function main() {
  const action = process.argv[2] ?? "report";
  if (action === "refresh") {
    const catalog = await getCatalog({ force: true });
    console.log(JSON.stringify({ eligibleCount: catalog.eligible.length, fetchedAt: catalog.fetchedAt, error: catalog.error }, null, 2));
    return;
  }
  if (action === "test") {
    console.log(JSON.stringify(await connectionTest("cli-diag"), null, 2));
    return;
  }
  console.log(JSON.stringify(await diagnosticsReport(), null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
