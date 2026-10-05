import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
if(!existsSync('dist/server/wrangler.json'))throw new Error('Run npm run build before applying local migrations.');
const r=spawnSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','migrations','apply','DB','--local','--config','wrangler.local.json','--persist-to','.wrangler/state'],{stdio:'inherit',env:{...process.env,CI:'true'}});process.exit(r.status??1);
