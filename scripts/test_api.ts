fetch('http://localhost:5001/api/shops?minLat=37.42&maxLat=37.7&minLng=126.8&maxLng=127.2').then(res => res.json()).then(data => {
    console.log("Total stores:", data.length);
    data.forEach((s: any) => console.log(s.name, s.lat, s.lng));
});
