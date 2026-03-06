const fs = require('fs');
const https = require('https');

https.get('https://datalabel-project-be-production.up.railway.app/swagger/v1/swagger.json', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        const swagger = JSON.parse(data);
        const paths = Object.keys(swagger.paths);
        console.log("ALL ENDPOINTS:");
        paths.forEach(p => {
            const methods = Object.keys(swagger.paths[p]);
            console.log(`- ${p} [${methods.join(', ')}]`);
        });
    });
}).on('error', (err) => {
    console.error("Error: " + err.message);
});
