import { runDdexBatchForPendingStores } from "../jobs/dailyDdex.js";

const r = await runDdexBatchForPendingStores();
console.log(JSON.stringify(r, null, 2));
