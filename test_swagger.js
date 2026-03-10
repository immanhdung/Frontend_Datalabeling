import https from 'https';
import fs from 'fs';
https.get('https://labelhub-backend.onrender.com/swagger/v1/swagger.json', res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
        try {
            const sw = JSON.parse(d);
            const getEndpoint = sw.paths['/api/datasets/{datasetId}'];
            if (getEndpoint) {
                fs.writeFileSync('output1.json', JSON.stringify(getEndpoint, null, 2));
            }
            const getItemsEndpoint = sw.paths['/api/datasets/{datasetId}/items'];
            if (getItemsEndpoint) {
                fs.writeFileSync('output2.json', JSON.stringify(getItemsEndpoint, null, 2));
            }
        } catch (e) {
            console.error(e.message);
        }
    });
});
