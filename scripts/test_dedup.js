
const curated = [{name: "A", lat: "37.5", lng: "126.9", uri: ""}];
const prev = [
  ...curated.map(c => ({...c, isMem: true, id: "ai-mem-global-1-A"})),
  {name: "B", lat: "37.5", lng: "126.9", isGeneric: true, id: "ai-123"}
];

const curatedNames = new Set(curated.map(c => c.name.toLowerCase().replace(/\s+/g, "")));
const filteredPrev = prev.filter(s => {
    if (s.isMem) return false;
    const normName = s.name.toLowerCase().replace(/\s+/g, "");
    if (curatedNames.has(normName)) return false;
    return true;
});

const idealMemShops = curated.map((cs, idx) => ({
    id: `ai-mem-global-${idx}-${cs.name.replace(/\s+/g, "")}`,
    name: cs.name,
    isMem: true
}));

const currentMemNodes = prev.filter(s => s.isMem);
let needsUpdate = false;

if (currentMemNodes.length !== idealMemShops.length) needsUpdate = true;
if (!needsUpdate && prev.length !== idealMemShops.length + filteredPrev.length) needsUpdate = true;
if (!needsUpdate && prev.length > 0 && idealMemShops.length > 0 && prev[0].id !== idealMemShops[0].id) needsUpdate = true;

console.log("needsUpdate:", needsUpdate);
console.log("finalArr:", [...idealMemShops, ...filteredPrev]);

