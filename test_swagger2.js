import https from 'https';
import fs from 'fs';
https.get('https://labelhub-backend.onrender.com/swagger/v1/swagger.json', res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
        try {
            const sw = JSON.parse(d);
            fs.writeFileSync('output2.json', JSON.stringify(sw.components.schemas.AddDatasetRequest, null, 2));
        } catch (e) {
            console.error(e.message);
        }
    });
});
