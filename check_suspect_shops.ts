import fetch from 'node-fetch';

async function checkUSShops() {
    try {
        const res = await fetch('http://localhost:3001/api/shops?countryCode=US');
        const data = await res.json();
        
        const koreanRegex = /[가-힣]/;
        const suspects = data.filter((s: any) => koreanRegex.test(s.name) || (s.address && koreanRegex.test(s.address)));
        
        console.log(`Found ${suspects.length} suspect KR shops in US territory.`);
        console.log(suspects.map((s: any) => ({ name: s.name, address: s.address, lat: s.lat, lng: s.lng })));
    } catch (e) {
        console.error("Fetch error:", e);
    }
}
checkUSShops();
