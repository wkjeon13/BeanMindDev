const https = require('https');
https.get('https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent('판교역'), { headers: {'User-Agent': 'BeanmindTest/1.0'} }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log(data));
});
