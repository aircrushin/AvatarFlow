// OpenNext Cloudflare adapter config.
// No ISR in this app (event pages are dynamic, marketing pages are static),
// so the default in-memory incremental cache is sufficient — no R2 bucket needed.
import { defineCloudflareConfig } from '@opennextjs/cloudflare';

export default defineCloudflareConfig({});
