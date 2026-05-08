const fs = require('fs');

// 2. Curator.tsx: Remove px-6 margin around ticket safely
let pCurator = 'src/pages/Curator.tsx';
let cCurator = fs.readFileSync(pCurator, 'utf8');
cCurator = cCurator.split('<div className="px-6 pt-safe pb-32 space-y-8">').join('<div className="w-full pt-safe pb-32 space-y-8">\n                     <div className="px-0">');
cCurator = cCurator.split('<div className="grid grid-cols-2 gap-3 mt-4">').join('<div className="grid grid-cols-2 gap-3 mt-4 px-4">');
cCurator = cCurator.split('<div className="flex flex-col gap-3 pt-4">').join('<div className="flex flex-col gap-3 pt-4 px-4">');
fs.writeFileSync(pCurator, cCurator);
console.log('Fixed Curator.tsx padding');

// 3. PrescriptionTicket.tsx: Remove px-2, bump text sizes globally
let pTicket = 'src/components/PrescriptionTicket.tsx';
let cTicket = fs.readFileSync(pTicket, 'utf8');
cTicket = cTicket.split('<div className="w-full relative px-2">').join('<div className="w-full relative">');
cTicket = cTicket.split('rounded-[1.5rem] overflow-hidden shadow-2xl relative text-coffee-50 ticket-cutout border border-coffee-800').join('border-y border-coffee-800 overflow-hidden shadow-2xl relative text-coffee-50 ticket-cutout');

// Fonts bump (careful replacements)
cTicket = cTicket.split('text-[10px]').join('text-xs');
cTicket = cTicket.split('text-[11px]').join('text-xs');
cTicket = cTicket.split('text-[12px]').join('text-sm');
cTicket = cTicket.split('text-[13px]').join('text-sm');
cTicket = cTicket.split('text-[14px]').join('text-base');
cTicket = cTicket.split('text-3xl sm:text-4xl').join('text-4xl sm:text-5xl tracking-tight');
cTicket = cTicket.split('prose-base').join('prose-lg'); // already bumped to base earlier, maybe bump to lg

fs.writeFileSync(pTicket, cTicket);
console.log('Fixed PrescriptionTicket.tsx text scales');

// 4. CoffeeTalk.tsx: Card-ify the feed items
let pFeed = 'src/pages/CoffeeTalk.tsx';
let cFeed = fs.readFileSync(pFeed, 'utf8');
cFeed = cFeed.split('className="pt-6 pb-5 pl-4 flex gap-3 border-b border-espresso-800/50 hover:bg-espresso-900/10 transition-colors"').join('className="p-4 mb-4 mx-2 bg-espresso-900/40 border border-espresso-700/70 rounded-[1.5rem] shadow-sm flex gap-3 hover:bg-espresso-900/60 transition-all"');
fs.writeFileSync(pFeed, cFeed);
console.log('Fixed CoffeeTalk.tsx feed card styles');

