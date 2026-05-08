import fetch from 'node-fetch';

async function main() {
    const res = await fetch("http://localhost:3001/api/community/posts?filter=all");
    const posts = await res.json();
    console.log("Total posts returned:", posts.length);
    posts.slice(0, 3).forEach((p, i) => {
         console.log(`[${i}] ID: ${p.id}, Content: ${p.content}, PostType: ${p.postType}`);
    });
}
main().catch(console.error);
