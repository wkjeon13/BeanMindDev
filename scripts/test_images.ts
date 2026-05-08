fetch('http://localhost:3001/api/shops?minLat=37.42&maxLat=37.7&minLng=126.8&maxLng=127.2').then(res => res.json()).then(data => {
    data.forEach((s: any) => {
        const fallbackMedia = s.media?.find((m: any) => m.type === 'IMAGE');
        const fallbackSrc = fallbackMedia ? fallbackMedia.url : s.markerImageUrl;
        const mainImageSrc = s.mainImageUrl || fallbackSrc;
        console.log(s.name, "=>", mainImageSrc ? mainImageSrc.substring(0, 50) : "MISSING!!");
    });
});
