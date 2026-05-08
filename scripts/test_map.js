import fs from "fs";
const raw = [{"name": "A", "lat": 37.5, "lng": 126.9}, {"name": "B", "lat": 37.5, "lng": 126.9}];
const prev = [];
const curated = raw;
let aiShops = [];
const curatedNames = new Set(curated.map(c => c.name.toLowerCase().replace(/\s+/g, "")));
const filteredPrev = prev.filter(s => {
    if (s.isMem) return false;
    const normName = s.name.toLowerCase().replace(/\s+/g, "");
    if (curatedNames.has(normName)) return false;
    return true;
});
const idealMemShops = curated.map((cs, idx) => {
    const latOffset = idx * 0.0002;
    const lngOffset = (idx % 2 === 0 ? 1 : -1) * (idx * 0.0002);
    return {
        id: `ai-mem-global-${idx}-${cs.name.replace(/\s+/g, "")}`,
        name: cs.name,
        lat: parseFloat(cs.lat) + latOffset,
        lng: parseFloat(cs.lng) + lngOffset,
        isGeneric: true,
        isMem: true
    };
});
const finalArr = [...idealMemShops, ...filteredPrev];
console.log(finalArr);

