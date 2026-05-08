fetch('http://localhost:3001/api/shops?q=서울').then(r=>r.json()).then(d=>console.log(d.length, d.map((x:any)=>x.name)));
