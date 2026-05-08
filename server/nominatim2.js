(async () => {
    try {
        const url = 'https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent('판교역');
        const fetch = (await import('node-fetch')).default;
        const res = await fetch(url, { headers: { 'User-Agent': 'BeanmindTest/1.0' } });
        const json = await res.json();
        console.log(JSON.stringify(json, null, 2));
    } catch (e) {
        console.error(e);
    }
})();
