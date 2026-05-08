const fs = require('fs');

const p = 'src/pages/Profile.tsx';
let c = fs.readFileSync(p, 'utf8');

// STRIP OUT THE SCATTERED PARTS

// 1. Remove ADVERTISER DASHBOARD FOR HOSTS (ACTIVE)
const activeAdMatch = c.match(/\{\/\* ADVERTISER DASHBOARD FOR HOSTS \*\/\}\s*\{isAuthenticated && currentUser\?\.role === 'OWNER' && \(\s*<div className="mb-6">\s*<HostAdDashboard filterScope="ACTIVE" \/>\s*<\/div>\s*\)\}/);
if (activeAdMatch) {
    c = c.replace(activeAdMatch[0], '');
}

// 2. Remove EXPIRED ADS HISTORY (Host Only)
const expiredAdMatch = c.match(/\{\/\* EXPIRED ADS HISTORY \(Host Only\) \*\/\}\s*\{isAuthenticated && currentUser\?\.role === 'OWNER' && \(\s*<div className="mt-8">\s*<HostAdDashboard filterScope="EXPIRED" hideStats=\{true\} \/>\s*<\/div>\s*\)\}/);
if (expiredAdMatch) {
    c = c.replace(expiredAdMatch[0], '');
}

// 3. Remove Manage Shop link from User History Menu
const manageShopMatch = c.match(/\{isAuthenticated && currentUser\?\.role === 'OWNER' && \(\s*<button onClick=\{\(\) => navigate\('\/profile\/manage-shop'\)\} className="w-full px-5 py-4 flex items-center justify-between active:bg-espresso-950 transition-colors">\s*<span className="font-bold text-\[15px\] text-espresso-50">\{t\('profile\.menu_manage_shop'\)\}<\/span>\s*<ChevronRight size=\{18\} className="text-espresso-300" \/>\s*<\/button>\s*\)\}/);
if (manageShopMatch) {
    c = c.replace(manageShopMatch[0], '');
}

// 4. Extract Shop Owner Actions (Add new shop card)
const addShopMatch = c.match(/\{\/\* Shop Owner Actions \*\/\}\s*\{isAuthenticated && currentUser\?\.role === 'OWNER' && \(\s*<section className="pb-6">\s*<button[\s\S]*?<\/section>\s*\)\}/);
let addShopContent = '';
if (addShopMatch) {
    addShopContent = addShopMatch[0].replace(/<section className="pb-6">|<\/section>/g, '').trim(); // Remove section tags
    addShopContent = addShopContent.replace(/\{\/\* Shop Owner Actions \*\/\}\s*\{isAuthenticated && currentUser\?\.role === 'OWNER' && \(\s*/, '').replace(/\s*\)\}\s*$/, '');
    c = c.replace(addShopMatch[0], '');
}

// CONSTRUCT THE NEW UNIFIED BLOCK
const unifiedBlock = \
                    {/* STORE & ADS MANAGEMENT (Host Only) */}
                    {isAuthenticated && currentUser?.role === 'OWNER' && (
                        <div className="space-y-4 mt-8 pt-6 pb-2 border-t border-espresso-800 relative">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-espresso-950 px-4">
                                <span className="text-amber-500/80 font-bold text-xs tracking-widest uppercase">Business Center</span>
                            </div>
                            
                            <h3 className="text-[18px] font-bold text-espresso-50 px-2 tracking-tight flex items-center gap-2 mb-6">
                                🏢 매장 및 광고 비즈니스
                            </h3>
                            
                            {/* 1. Ad Performance Dashboard */}
                            <HostAdDashboard filterScope="ACTIVE" />

                            {/* 2. Expired Ads */}
                            <div className="mt-4">
                                <HostAdDashboard filterScope="EXPIRED" hideStats={true} />
                            </div>

                            {/* 3. Manage Existing Shop */}
                            <div className="bg-espresso-900 rounded-2xl border border-espresso-700/50 overflow-hidden mt-4 shadow-sm">
                                <button onClick={() => navigate('/profile/manage-shop')} className="w-full px-5 py-4 flex items-center justify-between active:bg-espresso-950 transition-colors">
                                    <span className="font-bold text-[15px] text-espresso-50">{t('profile.menu_manage_shop')}</span>
                                    <ChevronRight size={18} className="text-espresso-300" />
                                </button>
                            </div>

                            {/* 4. Add New Shop */}
                            <div className="mt-4 pb-2">
                                \
                            </div>
                        </div>
                    )}
\;

// INSERT UNIFIED BLOCK right before Account Settings
c = c.replace(/\{\/\* Account Settings \*\/\}/, unifiedBlock + '\n                    {/* Spacer to push account settings down */}\n                    <div className="flex-1"></div>\n\n                    {/* Account Settings */}');

// Remove the old Spacer that we orphaned
c = c.replace(/\{\/\* Spacer to push shop owner action to bottom \*\/\}\s*<div className="flex-1"><\/div>/, '');

fs.writeFileSync(p, c);
console.log('Profile reorganized successfully.');
