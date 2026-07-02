package com.beanmind.curator.common.service;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Slf4j
@Service
@RequiredArgsConstructor
public class MailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String smtpUser;

    @Value("${spring.mail.host}")
    private String smtpHost;

    @Value("${spring.mail.password}")
    private String smtpPass;

    private boolean isSmtpConfigured() {
        return StringUtils.hasText(smtpHost) && StringUtils.hasText(smtpUser) && StringUtils.hasText(smtpPass);
    }

    private void printSimulatedEmail(String to, String subject, String body) {
        log.warn("⚠️ SMTP credentials are not fully configured. Falling back to local console simulation.");
        log.info("\n===========================================" +
                 "\n📧 Simulated Email to: {}" +
                 "\n📌 Subject: {}" +
                 "\n📝 Body preview: \n{}" +
                 "\n===========================================\n", to, subject, body);
    }

    private boolean sendHtmlEmail(String to, String subject, String htmlContent) {
        if (!isSmtpConfigured()) {
            printSimulatedEmail(to, subject, htmlContent);
            return true;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setFrom(String.format("\"Beanmind Coffee Curator\" <%s>", smtpUser));
            helper.setTo(to.trim());
            helper.setSubject(subject);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("✅ Real Email sent successfully to {}", to.trim());
            return true;
        } catch (Exception e) {
            log.error("❌ Failed to send email to {}", to.trim(), e);
            return false;
        }
    }

    public boolean sendVerificationEmail(String to, String otp, String context) {
        boolean isRegister = "register".equalsIgnoreCase(context);
        String subject = isRegister ? "Beanmind 회원가입 이메일 인증 안내" : "Beanmind 비밀번호 재설정 안내";
        String desc = isRegister ? "회원가입 절차를 완료하기 위해" : "비밀번호 재설정을 위해";

        String html = String.format(
                "<div style=\"font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f9fafb;\">" +
                "  <h1 style=\"color: #43302b; font-size: 24px; margin-bottom: 20px;\">☕ Beanmind 환영합니다!</h1>" +
                "  <p style=\"color: #4b5563; font-size: 16px; margin-bottom: 30px;\">%s 아래의 인증 코드를 애플리케이션에 입력해주세요.</p>" +
                "  <div style=\"background-color: white; padding: 20px; border-radius: 8px; border: 2px dashed #9ca3af; margin-bottom: 30px; letter-spacing: 5px; font-weight: bold; font-size: 32px; color: #1e40af;\">%s</div>" +
                "  <p style=\"color: #6b7280; font-size: 14px;\">해당 인증 번호는 5분 동안만 유효합니다.<br/>본인이 요청하지 않은 경우 이 이메일을 무시하셔도 됩니다.</p>" +
                "</div>", desc, otp);

        return sendHtmlEmail(to, subject, html);
    }

    public boolean sendAdminAnnouncement(String to, String subject, String message) {
        String html = String.format(
                "<div style=\"font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: white;\">" +
                "  <div style=\"background-color: #43302b; padding: 15px; border-radius: 8px 8px 0 0; color: white; text-align: center; font-weight: bold;\">Beanmind Coffee Curator</div>" +
                "  <div style=\"padding: 30px 20px; color: #374151; font-size: 15px; line-height: 1.6; white-space: pre-wrap; text-align: left;\">%s</div>" +
                "  <div style=\"border-top: 1px solid #e5e7eb; padding-top: 15px; color: #9ca3af; font-size: 12px; text-align: center;\">본 메일은 발신전용입니다.</div>" +
                "</div>", message.replace("\n", "<br/>"));

        return sendHtmlEmail(to, subject, html);
    }

    public boolean sendStoreTagNotification(String to, String storeName, String authorName, String postContent) {
        String subject = String.format("[Beanmind] '%s' 매장 방문 후기가 등록되었습니다!", storeName);
        String html = String.format(
                "<div style=\"font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f9fafb;\">" +
                "  <h1 style=\"color: #43302b; font-size: 20px; margin-bottom: 20px;\">🎉 매장 태그 알림</h1>" +
                "  <p style=\"color: #4b5563; font-size: 15px; margin-bottom: 20px;\">안녕하세요, 호스트님!<br/><strong>%s</strong>님이 커피톡에서 <strong>'%s'</strong> 매장을 태그하셨습니다.</p>" +
                "  <div style=\"background-color: white; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 30px; color: #374151; font-size: 14px; line-height: 1.5; white-space: pre-wrap;\">\"%s\"</div>" +
                "  <p style=\"color: #6b7280; font-size: 14px;\">고객님의 리뷰를 확인하고, 감사의 마음을 담아 <strong>커피콩 선물(보상)</strong>을 보내보세요!<br/>커피콩 선물은 게시글 우측 상단의 🎁 보상 버튼을 통해 전송하실 수 있습니다.</p>" +
                "  <div style=\"border-top: 1px solid #e5e7eb; padding-top: 15px; margin-top: 30px; color: #9ca3af; font-size: 12px; text-align: center;\">본 메일은 발신전용입니다. Beanmind Coffee Curator.</div>" +
                "</div>", authorName, storeName, postContent);

        return sendHtmlEmail(to, subject, html);
    }

    public boolean sendClubApplicationNotification(String ownerEmail, String clubName, String applicantName) {
        String subject = String.format("[Beanmind] '%s' 소모임에 새로운 가입 신청이 있습니다!", clubName);
        String html = String.format(
                "<div style=\"font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f9fafb;\">" +
                "  <h1 style=\"color: #43302b; font-size: 20px; margin-bottom: 20px;\">👥 새로운 소모임 가입 신청</h1>" +
                "  <p style=\"color: #4b5563; font-size: 15px; margin-bottom: 20px;\">안녕하세요, 방장님!<br/><strong>%s</strong>님이 <strong>'%s'</strong> 소모임에 가입 신청을 보냈습니다.</p>" +
                "  <p style=\"color: #6b7280; font-size: 14px;\">앱에 접속하여 가입자의 설문 정보를 확인하고 승인 여부를 결정해주세요!</p>" +
                "</div>", applicantName, clubName);

        return sendHtmlEmail(ownerEmail, subject, html);
    }

    public boolean sendClubApprovalNotification(String applicantEmail, String clubName) {
        String subject = String.format("[Beanmind] '%s' 소모임 가입이 승인되었습니다! 🎉", clubName);
        String html = String.format(
                "<div style=\"font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f9fafb;\">" +
                "  <h1 style=\"color: #43302b; font-size: 20px; margin-bottom: 20px;\">🎉 소모임 가입 승인</h1>" +
                "  <p style=\"color: #4b5563; font-size: 15px; margin-bottom: 20px;\">축하합니다!<br/>지원하신 <strong>'%s'</strong> 소모임에서 방장님이 가입을 승인하셨습니다.</p>" +
                "  <p style=\"color: #6b7280; font-size: 14px;\">지금 바로 앱에 접속해서 모임 사람들에게 첫인사를 남겨보세요!</p>" +
                "</div>", clubName);

        return sendHtmlEmail(applicantEmail, subject, html);
    }

    public boolean sendStoreNewsletterNotification(java.util.List<String> bccs, String storeName, String content, java.util.List<String> imageUrls) {
        String subject = String.format("[Beanmind] '%s' 매장의 새로운 소식이 도착했습니다!", storeName);
        
        StringBuilder imageHtml = new StringBuilder();
        if (imageUrls != null && !imageUrls.isEmpty()) {
            imageHtml.append("<div style=\"margin-top: 20px;\">");
            for (String img : imageUrls) {
                imageHtml.append(String.format("<img src=\"%s\" style=\"max-width: 100%%; border-radius: 8px; margin-bottom: 10px; display: block;\" />", img));
            }
            imageHtml.append("</div>");
        }

        String html = String.format(
                "<div style=\"font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;\">" +
                "  <div style=\"background-color: #43302b; padding: 15px; border-radius: 8px 8px 0 0; color: white; text-align: center; font-weight: bold;\">%s 소식</div>" +
                "  <div style=\"padding: 30px 20px; color: #374151; font-size: 15px; line-height: 1.6;\">" +
                "    <p>안녕하세요! '%s' 단골 고객님들을 위한 새 소식을 전달해 드립니다.</p>" +
                "    <div style=\"background-color: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0; white-space: pre-wrap;\">%s</div>" +
                "    %s" +
                "  </div>" +
                "  <div style=\"border-top: 1px solid #e5e7eb; padding-top: 15px; margin-top: 30px; color: #9ca3af; font-size: 12px; text-align: center;\">본 메일은 발신전용입니다. Beanmind Coffee Curator.</div>" +
                "</div>", storeName, storeName, content.replace("\n", "<br/>"), imageHtml.toString());

        if (!isSmtpConfigured()) {
            for (String to : bccs) {
                printSimulatedEmail(to, subject, html);
            }
            return true;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setFrom(String.format("\"Beanmind Coffee Curator\" <%s>", smtpUser));
            helper.setSubject(subject);
            helper.setText(html, true);
            
            String[] bccArray = bccs.toArray(new String[0]);
            helper.setBcc(bccArray);
            helper.setTo(smtpUser);

            mailSender.send(message);
            log.info("✅ Real Store Newsletter sent successfully to {} followers", bccs.size());
            return true;
        } catch (Exception e) {
            log.error("❌ Failed to send store newsletter to followers", e);
            return false;
        }
    }
}
