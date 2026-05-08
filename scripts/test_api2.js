const f = async (url) => {
    try {
        const res = await fetch(url);
        const data = await res.json();
        console.log("Success: " + data.length, url);
        return data.length;
    } catch (e) {
        console.log("Failed: " + e.message);
    }
};
(async () => {
    await f('http://localhost:3001/api/shops?lat=37.5&lng=126.98&minLat=37.4&maxLat=37.8&minLng=126.7&maxLng=127.2&lang=ko');
    await f('http://localhost:3001/api/shops?lat=37.5&lng=126.98&minLat=37.4&maxLat=37.8&minLng=126.7&maxLng=127.2&lang=ko&type=SINGLE_ORIGIN');
})();
