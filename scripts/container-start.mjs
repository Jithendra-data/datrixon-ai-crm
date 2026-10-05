import {spawnSync,spawn} from 'node:child_process';
const migration=spawnSync(process.execPath,['scripts/migrate.mjs'],{stdio:'inherit'});
if(migration.status!==0)process.exit(migration.status??1);
const server=spawn(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','dev','--config','dist/server/wrangler.json','--local','--persist-to','.wrangler/state','--ip','0.0.0.0','--port','8787','--inspector-port','0'],{stdio:'inherit'});
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.kill(signal));
server.on('exit',code=>process.exit(code??1));

