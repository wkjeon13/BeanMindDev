import nodemailer from 'nodemailer';
import path from 'path';

// Initialize transporter
export const createTransporter = () => {
    // If credentials aren't provided, it will fallback to local simulated logs later in the function,
    // or you can configure it to default to a test account if you prefer.
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
};

/**
 * Sends an OTP validation email to the specified address.
 * 
 * @param to Recipient's email address
 * @param otp The 6-digit verification code
 * @returns boolean indicating success or failure
 */
export const sendVerificationEmail = async (to: string, otp: string, context: 'register' | 'reset-password' = 'register'): Promise<boolean> => {
    // Check if real SMTP credentials exist
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('⚠️ SMTP credentials are not fully configured in .env. Falling back to local console simulation.');
        console.log(`\n===========================================`);
        console.log(`📧 Simulated Verification Email to: ${to}`);
        console.log(`🔑 Verification Code: ${otp}`);
        console.log(`===========================================\n`);
        return true;
    }

    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: `"Beanmind Coffee Curator" <${process.env.SMTP_USER}>`,
            to,
            subject: context === 'register' ? 'Beanmind 회원가입 이메일 인증 안내' : 'Beanmind 비밀번호 재설정 안내',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f9fafb;">
                    <h1 style="color: #43302b; font-size: 24px; margin-bottom: 20px;">☕ Beanmind 환영합니다!</h1>
                    <p style="color: #4b5563; font-size: 16px; margin-bottom: 30px;">
                        ${context === 'register' ? '회원가입 절차를 완료하기 위해' : '비밀번호 재설정을 위해'} 아래의 인증 코드를 애플리케이션에 입력해주세요.
                    </p>
                    <div style="background-color: white; padding: 20px; border-radius: 8px; border: 2px dashed #9ca3af; margin-bottom: 30px; letter-spacing: 5px; font-weight: bold; font-size: 32px; color: #1e40af;">
                        ${otp}
                    </div>
                    <p style="color: #6b7280; font-size: 14px;">
                        해당 인증 번호는 5분 동안만 유효합니다.<br/>
                        본인이 요청하지 않은 경우 이 이메일을 무시하셔도 됩니다.
                    </p>
                </div>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Real Email sent successfully to ${to} (MessageID: ${info.messageId})`);
        return true;
    } catch (error) {
        console.error(`❌ Failed to send email to ${to}:`, error);
        return false;
    }
};

/**
 * Sends a general announcement or rejection notice to a shop owner.
 */
export const sendAdminAnnouncement = async (to: string, subject: string, message: string): Promise<string | true> => {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('⚠️ SMTP credentials missing. Falling back to simulated announcement.');
        console.log(`\n========== 🏢 ADMIN SYSTEM NOTIFICATION ==========`);
        console.log(`📧 To: ${to}`);
        console.log(`📌 Subject: ${subject}`);
        console.log(`📝 Message:\n${message}`);
        console.log(`====================================================\n`);
        return true;
    }

    try {
        const transporter = createTransporter();
        const mailOptions = {
            from: `"Beanmind Admin" <${process.env.SMTP_USER}>`,
            replyTo: process.env.ADMIN_EMAIL || 'wjeon@infosk.co.kr',
            to,
            subject,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: white;">
                    <div style="background-color: #43302b; padding: 15px; border-radius: 8px 8px 0 0; color: white; text-align: center; font-weight: bold;">
                        Beanmind Coffee Curator
                    </div>
                    <div style="padding: 30px 20px; color: #374151; font-size: 15px; line-height: 1.6; white-space: pre-wrap; text-align: left;">
                        ${message.replace(/\n/g, '<br/>')}
                    </div>
                    <div style="border-top: 1px solid #e5e7eb; padding-top: 15px; color: #9ca3af; font-size: 12px; text-align: center;">
                        본 메일은 발신전용입니다.
                    </div>
                </div>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Admin Email sent successfully to ${to} (MessageID: ${info.messageId})`);
        return true;
    } catch (error: any) {
        console.error(`❌ Failed to send admin email to ${to}:`, error);
        return error.message || 'Unknown SMTP Error';
    }
};

/**
 * Sends an email notification to a store owner when their store is tagged in a post.
 */
export const sendStoreTagNotification = async (to: string, storeName: string, authorName: string, postContent: string): Promise<boolean> => {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('⚠️ SMTP credentials missing. Falling back to simulated store tag notification.');
        console.log(`\n========== 🏷️ STORE TAG NOTIFICATION ==========`);
        console.log(`📧 To: ${to}`);
        console.log(`📌 Store: ${storeName}`);
        console.log(`👤 Author: ${authorName}`);
        console.log(`📝 Content previews:\n${postContent}`);
        console.log(`====================================================\n`);
        return true;
    }

    try {
        const transporter = createTransporter();
        const mailOptions = {
            from: `"Beanmind Coffee Curator" <${process.env.SMTP_USER}>`,
            to,
            subject: `[Beanmind] '${storeName}' 매장 방문 후기가 등록되었습니다!`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f9fafb;">
                    <h1 style="color: #43302b; font-size: 20px; margin-bottom: 20px;">🎉 매장 태그 알림</h1>
                    <p style="color: #4b5563; font-size: 15px; margin-bottom: 20px;">
                        안녕하세요, 호스트님!<br/>
                        <strong>${authorName}</strong>님이 커피톡에서 <strong>'${storeName}'</strong> 매장을 태그하셨습니다.
                    </p>
                    <div style="background-color: white; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 30px; color: #374151; font-size: 14px; line-height: 1.5; white-space: pre-wrap;">
                        "${postContent}"
                    </div>
                    <p style="color: #6b7280; font-size: 14px;">
                        고객님의 리뷰를 확인하고, 감사의 마음을 담아 <strong>커피콩 선물(보상)</strong>을 보내보세요!<br/>
                        커피콩 선물은 게시글 우측 상단의 🎁 보상 버튼을 통해 전송하실 수 있습니다.
                    </p>
                    <div style="border-top: 1px solid #e5e7eb; padding-top: 15px; margin-top: 30px; color: #9ca3af; font-size: 12px; text-align: center;">
                        본 메일은 발신전용입니다. Beanmind Coffee Curator.
                    </div>
                </div>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Store Tag Notification sent successfully to ${to} (MessageID: ${info.messageId})`);
        return true;
    } catch (error) {
        console.error(`❌ Failed to send store tag notification to ${to}:`, error);
        return false;
    }
};

/**
 * Sends an email notification to the Admin when a new Ad Inquiry is submitted.
 */
export const sendAdInquiryAdminNotification = async (adminEmail: string, inquiry: any): Promise<boolean> => {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('⚠️ SMTP credentials missing. Falling back to simulated ad inquiry notification.');
        console.log(`\n========== 🚀 NEW AD INQUIRY ==========`);
        console.log(`📧 To: ${adminEmail}`);
        console.log(`📌 Advertiser: ${inquiry.advertiser}`);
        console.log(`📝 Content previews:\n${inquiry.content}`);
        console.log(`=========================================\n`);
        return true;
    }

    try {
        const transporter = createTransporter();
        const mailOptions = {
            from: `"Beanmind System" <${process.env.SMTP_USER}>`,
            to: adminEmail,
            subject: `[Beanmind] 새로운 광고 입점 문의가 접수되었습니다: ${inquiry.advertiser}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f9fafb;">
                    <h1 style="color: #43302b; font-size: 20px; margin-bottom: 20px;">🚀 신규 광고 입점 문의</h1>
                    <p style="color: #4b5563; font-size: 15px; margin-bottom: 20px;">
                        관리자님,<br/>
                        새로운 광고 문의가 접수되었습니다. 관리자 시스템에서 확인해주세요.
                    </p>
                    <div style="background-color: white; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin-bottom: 30px; color: #374151; font-size: 14px; line-height: 1.5; white-space: pre-wrap;">
                        <strong>광고주 (상호명):</strong> ${inquiry.advertiser}<br/>
                        <strong>담당자명:</strong> ${inquiry.contactName}<br/>
                        <strong>연락처:</strong> ${inquiry.contactPhone}<br/>
                        <strong>이메일:</strong> ${inquiry.contactEmail}<br/><br/>
                        <strong>광고 내용:</strong><br/>
                        ${inquiry.content}
                    </div>
                    <div style="border-top: 1px solid #e5e7eb; padding-top: 15px; margin-top: 30px; color: #9ca3af; font-size: 12px; text-align: center;">
                        본 메일은 시스템 발신 자동 알림입니다.
                    </div>
                </div>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Ad Inquiry Notification sent successfully to admin ${adminEmail} (MessageID: ${info.messageId})`);
        return true;
    } catch (error) {
        console.error(`❌ Failed to send ad inquiry notification to ${adminEmail}:`, error);
        return false;
    }
};

/**
 * Sends an email notification to the club owner when a user applies.
 */
export const sendClubApplicationNotification = async (ownerEmail: string, clubName: string, applicantName: string): Promise<boolean> => {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log(`\n========== 👥 CLUB JOIN APPLICATION ==========`);
        console.log(`📧 To Owner: ${ownerEmail}`);
        console.log(`📌 Club: ${clubName}`);
        console.log(`👤 Applicant: ${applicantName}`);
        console.log(`============================================\n`);
        return true;
    }

    try {
        const transporter = createTransporter();
        const mailOptions = {
            from: `"Beanmind System" <${process.env.SMTP_USER}>`,
            to: ownerEmail,
            subject: `[Beanmind] '${clubName}' 소모임에 새로운 가입 신청이 있습니다!`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f9fafb;">
                    <h1 style="color: #43302b; font-size: 20px; margin-bottom: 20px;">👥 새로운 소모임 가입 신청</h1>
                    <p style="color: #4b5563; font-size: 15px; margin-bottom: 20px;">
                        안녕하세요, 방장님!<br/>
                        <strong>${applicantName}</strong>님이 <strong>'${clubName}'</strong> 소모임에 가입 신청을 보냈습니다.
                    </p>
                    <p style="color: #6b7280; font-size: 14px;">
                        앱에 접속하여 가입자의 설문 정보를 확인하고 승인 여부를 결정해주세요!
                    </p>
                </div>
            `,
        };

        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error(`❌ Failed to send club application notification to ${ownerEmail}:`, error);
        return false;
    }
};

/**
 * Sends an email notification to the applicant when they are approved.
 */
export const sendClubApprovalNotification = async (applicantEmail: string, clubName: string): Promise<boolean> => {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log(`\n========== ✅ CLUB JOIN APPROVED ==========`);
        console.log(`📧 To Applicant: ${applicantEmail}`);
        console.log(`📌 Club: ${clubName}`);
        console.log(`============================================\n`);
        return true;
    }

    try {
        const transporter = createTransporter();
        const mailOptions = {
            from: `"Beanmind System" <${process.env.SMTP_USER}>`,
            to: applicantEmail,
            subject: `[Beanmind] '${clubName}' 소모임 가입이 승인되었습니다! 🎉`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f9fafb;">
                    <h1 style="color: #43302b; font-size: 20px; margin-bottom: 20px;">🎉 소모임 가입 승인</h1>
                    <p style="color: #4b5563; font-size: 15px; margin-bottom: 20px;">
                        축하합니다!<br/>
                        지원하신 <strong>'${clubName}'</strong> 소모임에서 방장님이 가입을 승인하셨습니다.
                    </p>
                    <p style="color: #6b7280; font-size: 14px;">
                        지금 바로 앱에 접속해서 모임 사람들에게 첫인사를 남겨보세요!
                    </p>
                </div>
            `,
        };

        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error(`❌ Failed to send club approval notification to ${applicantEmail}:`, error);
        return false;
    }
};

/**
 * Sends an email notification when a user's community content is deleted by an admin.
 */
export const sendContentDeletionNotice = async (to: string, contentType: 'POST' | 'COMMENT', contentPreview: string, reason: string): Promise<boolean> => {
    const contentTypeKR = contentType === 'POST' ? '게시글' : '댓글';
    
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log(`\n========== 🗑️ CONTENT DELETION NOTICE ==========`);
        console.log(`📧 To: ${to}`);
        console.log(`📌 Type: ${contentTypeKR}`);
        console.log(`📝 Preview: ${contentPreview}`);
        console.log(`⚠️ Reason: ${reason}`);
        console.log(`====================================================\n`);
        return true;
    }

    try {
        const transporter = createTransporter();
        const mailOptions = {
            from: `"Beanmind Admin" <${process.env.SMTP_USER}>`,
            to,
            subject: `[Beanmind] 커뮤니티 가이드라인 위반에 따른 ${contentTypeKR} 삭제 안내`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f9fafb;">
                    <h1 style="color: #dc2626; font-size: 20px; margin-bottom: 20px;">⚠️ ${contentTypeKR} 삭제 안내</h1>
                    <p style="color: #4b5563; font-size: 15px; margin-bottom: 20px;">
                        안녕하세요, 회원님.<br/>
                        회원님께서 작성하신 커뮤니티 <strong>${contentTypeKR}</strong>이 당사의 커뮤니티 운영 가이드라인에 위배되어 관리자에 의해 삭제 통보되었음을 안내드립니다.
                    </p>
                    
                    <div style="margin-bottom: 15px;">
                        <h2 style="font-size: 14px; color: #374151; margin-bottom: 5px;">게시글 위치 및 내용</h2>
                        <div style="background-color: white; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; color: #6b7280; font-size: 13px; line-height: 1.5; white-space: pre-wrap;">
${contentPreview.length > 100 ? contentPreview.substring(0, 100) + '...' : contentPreview}
                        </div>
                    </div>

                    <div style="margin-bottom: 30px;">
                        <h2 style="font-size: 14px; color: #374151; margin-bottom: 5px;">관리자 삭제 사유</h2>
                        <div style="background-color: #fee2e2; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444; color: #991b1b; font-size: 14px; font-weight: bold; line-height: 1.5;">
                            ${reason}
                        </div>
                    </div>

                    <p style="color: #6b7280; font-size: 13px; border-top: 1px solid #e5e7eb; padding-top: 15px; text-align: center;">
                        건전한 커뮤니티 문화를 만들기 위해 회원님의 너른 양해 부탁드립니다.<br/>
                        본 통보는 발신 전용이며 회신이 불가합니다.
                    </p>
                </div>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Deletion Notice sent successfully to ${to} (MessageID: ${info.messageId})`);
        return true;
    } catch (error) {
        console.error(`❌ Failed to send deletion notice to ${to}:`, error);
        return false;
    }
};

/**
 * Sends an email notification when a user's report is determined to be false/invalid by an admin.
 */
export const sendFalseReportNotice = async (to: string, targetType: string, targetName: string, reason: string): Promise<boolean> => {
    let typeStr = targetType;
    if (targetType === 'STORE') typeStr = '매장';
    if (targetType === 'USER') typeStr = '유저 계정';
    if (targetType === 'REVIEW') typeStr = '리뷰 내용';
    if (targetType === 'POST') typeStr = '게시글';
    if (targetType === 'COMMENT') typeStr = '댓글';

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log(`\n========== 🚫 FALSE REPORT NOTICE ==========`);
        console.log(`📧 To: ${to}`);
        console.log(`📌 Target: [${typeStr}] ${targetName}`);
        console.log(`⚠️ Reason: ${reason}`);
        console.log(`============================================\n`);
        return true;
    }

    try {
        const transporter = createTransporter();
        const mailOptions = {
            from: `"Beanmind Admin" <${process.env.SMTP_USER}>`,
            to,
            subject: `[Beanmind] 접수하신 신고에 대한 처리 결과 안내`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f9fafb;">
                    <h1 style="color: #43302b; font-size: 20px; margin-bottom: 20px;">ℹ️ 신고 처리 결과 안내</h1>
                    <p style="color: #4b5563; font-size: 15px; margin-bottom: 20px;">
                        안녕하세요, 회원님께서 최근 당사에 접수해주신 <strong>${typeStr}</strong> 신고 내용을 관리팀에서 면밀히 모니터링 및 검토하였습니다.
                    </p>
                    
                    <div style="margin-bottom: 15px;">
                        <h2 style="font-size: 14px; color: #374151; margin-bottom: 5px;">신고 대상</h2>
                        <div style="background-color: white; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; color: #6b7280; font-size: 13px; line-height: 1.5; white-space: pre-wrap;">
                            ${targetName}
                        </div>
                    </div>

                    <div style="margin-bottom: 30px;">
                        <h2 style="font-size: 14px; color: #374151; margin-bottom: 5px;">관리팀 검토 결과 (반려 사유)</h2>
                        <div style="background-color: #fffbeb; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; color: #b45309; font-size: 14px; line-height: 1.5;">
                            ${reason}
                        </div>
                    </div>

                    <p style="color: #6b7280; font-size: 13px; border-top: 1px solid #e5e7eb; padding-top: 15px; text-align: center;">
                        허위 신고가 지속될 경우 서비스 이용이 제한될 수 있습니다.<br/>
                        건전한 플랫폼 환경 조성을 위한 회원님의 노고에 감사드립니다.
                    </p>
                </div>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ False Report Notice sent successfully to ${to} (MessageID: ${info.messageId})`);
        return true;
    } catch (error) {
        console.error(`❌ Failed to send false report notice to ${to}:`, error);
        return false;
    }
};

/**
 * Sends a newsletter/announcement email to all followers of a shop (BCC).
 */
export const sendStoreNewsletterNotification = async (bccs: string[], storeName: string, contentPreview: string, imageUrls: string[] = []): Promise<boolean> => {
    if (bccs.length === 0) return true;

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log(`\n========== 📬 STORE NEWSLETTER ==========`);
        console.log(`📧 BCCs: ${bccs.length} followers`);
        console.log(`📌 Store: ${storeName}`);
        console.log(`📝 Content previews:\n${contentPreview}`);
        console.log(`📷 Images attached: ${imageUrls.length}`);
        console.log(`===========================================\n`);
        return true;
    }

    try {
        const transporter = createTransporter();
        
        const attachments: any[] = [];
        let imagesHtml = '';
        
        if (imageUrls && imageUrls.length > 0) {
            imageUrls.forEach((url, index) => {
                const cid = `image${index}@beanmind.com`;
                imagesHtml += `<img src="cid:${cid}" style="max-width: 100%; border-radius: 8px; margin-bottom: 10px; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.1);" alt="Store Announcement Image" /><br/>`;
                
                let localPath = url;
                if (url.startsWith('/')) {
                   // Local uploaded file is stored in public/uploads/...
                   // Remove leading slash to prevent path.join from going to root drive on Windows
                   const relativeUrl = url.substring(1); 
                   localPath = path.join(process.cwd(), 'public', relativeUrl); 
                   attachments.push({
                       filename: path.basename(url),
                       path: localPath,
                       cid: cid
                   });
                } else if (url.startsWith('http')) {
                   // Absolute URL (fallback)
                   attachments.push({
                       filename: `image${index}.jpg`,
                       href: url,
                       cid: cid
                   });
                }
            });
            imagesHtml = `<div style="margin-top: 20px; text-align: center;">${imagesHtml}</div>`;
        }

        const mailOptions = {
            from: `"Beanmind Coffee Curator" <${process.env.SMTP_USER}>`,
            to: process.env.SMTP_USER || 'noreply@beanmind.com', // To ourselves or system, hide followers
            bcc: bccs,
            subject: `[Beanmind] 단골 매장 '${storeName}'에서 새로운 소식이 도착했습니다!`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f9fafb;">
                    <h1 style="color: #43302b; font-size: 20px; margin-bottom: 20px;">☕ 단골 소식 알림</h1>
                    <p style="color: #4b5563; font-size: 15px; margin-bottom: 20px;">
                        안녕하세요!<br/>
                        회원님께서 단골로 등록하신 <strong>'${storeName}'</strong> 매장에서 새로운 소식을 전해왔습니다.
                    </p>
                    <div style="background-color: white; padding: 20px; border-radius: 8px; border-left: 4px solid #f97316; margin-bottom: 30px; color: #374151; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">
                        ${contentPreview}
                        ${imagesHtml}
                    </div>
                    <p style="color: #6b7280; font-size: 14px;">
                        지금 당장 Beanmind 앱에 접속해서 자세한 내용을 확인해보세요!<br/>
                        쿠폰, 이벤트 상세 내용, 또는 특별한 라인업 정보가 있을 수 있습니다.
                    </p>
                    <div style="border-top: 1px solid #e5e7eb; padding-top: 15px; margin-top: 30px; color: #9ca3af; font-size: 12px; text-align: center;">
                        본 메일은 회원님이 해당 매장의 단골(Follower)로 등록하였기에 발송되었습니다.<br/>
                        알림을 원치 않으시면 앱 내에서 해당 매장 단골(Follow)을 해제해주세요.
                    </div>
                </div>
            `,
            attachments: attachments.length > 0 ? attachments : undefined
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Newsletter sent successfully to ${bccs.length} followers (MessageID: ${info.messageId})`);
        return true;
    } catch (error) {
        console.error(`❌ Failed to send newsletter for store ${storeName}:`, error);
        return false;
    }
};
