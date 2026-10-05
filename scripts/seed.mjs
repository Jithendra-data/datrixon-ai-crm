const base=process.env.BASE_URL||'http://127.0.0.1:8787';
const response=await fetch(base+'/api/demo',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:'{}'});
if(!response.ok)throw new Error('Seed failed: '+response.status);
console.log('Synthetic workspace created. Use the browser Start demo action for a browser-bound session.');

