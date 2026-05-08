const fs = require('fs');
let c = fs.readFileSync('src/pages/CoffeeTalk.tsx', 'utf-8');
c = c.replace(/maxLength=\{composeMode === 'SHORTS' \? 200 : undefined\}/g, "maxLength={composeMode === 'SHORTS' ? 1000 : undefined}");
c = c.replace(/200자 이내로 입력하세요/g, '1000자 이내로 입력하세요');
c = c.replace(/ \/ 200/g, ' / 1000');
fs.writeFileSync('src/pages/CoffeeTalk.tsx', c, 'utf-8');
console.log('Done');
