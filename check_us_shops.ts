import fetch from 'node-fetch';

async function checkShops() {
    try {
        const res = await fetch('http://localhost:3001/api/shops?countryCode=US');
        const data = await res.json();
        console.log(`Returned ${data.length} shops for US.`);
        if (data.length > 0) {
            console.log("First 5 shops:", data.slice(0, 5).map((s: any) => ({ name: s.name, lat: s.lat, lng: s.lng })));
        }
    } catch (e) {
        console.error("Fetch error:", e);
    }
}
checkShops();
