import "dotenv/config";
import nodemailer from 'nodemailer';
import path from 'path';

async function test() {
    const bccs = ['test@example.com'];
    const imageUrls = ['/uploads/community/1779255202646-852747275.png'];
    const storeName = 'Test Store';
    const contentPreview = 'Test content';

    const attachments: any[] = [];
    let imagesHtml = '';
    
    if (imageUrls && imageUrls.length > 0) {
        imageUrls.forEach((url, index) => {
            const cid = `image${index}@beanmind.com`;
            imagesHtml += `<img src="cid:${cid}" style="max-width: 100%; border-radius: 8px; margin-bottom: 10px; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.1);" alt="Store Announcement Image" /><br/>`;
            
            let localPath = url;
            if (url.startsWith('/')) {
                const relativeUrl = url.substring(1); 
                localPath = path.join(process.cwd(), relativeUrl); 
                attachments.push({
                    filename: path.basename(url),
                    path: localPath,
                    cid: cid
                });
            }
        });
        imagesHtml = `<div style="margin-top: 20px; text-align: center;">${imagesHtml}</div>`;
    }

    const mailOptions = {
        from: `"Beanmind Coffee Curator" <${process.env.SMTP_USER}>`,
        to: process.env.SMTP_USER || 'noreply@beanmind.com',
        bcc: bccs,
        subject: `[Beanmind] 단골 매장 '${storeName}'에서 새로운 소식이 도착했습니다!`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f9fafb;">
                ${contentPreview}
                ${imagesHtml}
            </div>
        `,
        attachments: attachments.length > 0 ? attachments : undefined
    };

    // Use streamTransport to get the raw message
    const transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'windows'
    });

    const info = await transporter.sendMail(mailOptions);
    if (info.message) {
        let rawMessage = '';
        info.message.on('data', (chunk: any) => {
            rawMessage += chunk.toString();
        });
        info.message.on('end', () => {
            console.log("RAW EMAIL:");
            console.log(rawMessage.substring(0, 1500) + "\n... TRUNCATED");
            console.log("ATTACHMENTS ARRAY:", JSON.stringify(attachments, null, 2));
        });
    }
}

test().catch(console.error);
