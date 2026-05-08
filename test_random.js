const m = [1,2,3,4,5];
const res = m.map((url, idx) => {
    return `${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`;
});
console.log(res);
