import fs from 'fs';
import path from 'path';

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(filePath));
        } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.js')) { 
            results.push(filePath);
        }
    });
    return results;
}
const files = walk('./src');
let changedCount = 0;
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;
    
    // token
    content = content.replace(/sessionStorage\.getItem\('token'\)/g, "localStorage.getItem('token')");
    content = content.replace(/sessionStorage\.setItem\('token'/g, "localStorage.setItem('token'");
    content = content.replace(/sessionStorage\.removeItem\('token'\)/g, "localStorage.removeItem('token')");
    
    // user
    content = content.replace(/sessionStorage\.getItem\('user'\)/g, "localStorage.getItem('user')");
    content = content.replace(/sessionStorage\.setItem\('user'/g, "localStorage.setItem('user'");
    content = content.replace(/sessionStorage\.removeItem\('user'\)/g, "localStorage.removeItem('user')");

    // userId
    content = content.replace(/sessionStorage\.getItem\('userId'\)/g, "localStorage.getItem('userId')");
    content = content.replace(/sessionStorage\.setItem\('userId'/g, "localStorage.setItem('userId'");
    content = content.replace(/sessionStorage\.removeItem\('userId'\)/g, "localStorage.removeItem('userId')");

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        changedCount++;
        console.log('Modified:', file);
    }
});
console.log('Total files modified:', changedCount);
