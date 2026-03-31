const nodemailer = require('nodemailer');
const ejs = require('ejs');
const path = require('path');
const db = require('../config/db');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initTransporter();
    }

    async initTransporter() {
        if (process.env.NODE_ENV === 'development' && !process.env.SMTP_HOST) {

            try {
                const testAccount = await nodemailer.createTestAccount();
                this.transporter = nodemailer.createTransport({
                    host: testAccount.smtp.host,
                    port: testAccount.smtp.port,
                    secure: testAccount.smtp.secure,
                    auth: {
                        user: testAccount.user,
                        pass: testAccount.pass
                    }
                });
                console.log("📧 [EmailService] Ethereal Ready:", testAccount.user);
            } catch (e) {
                console.error("📧 [EmailService] Failed to create Ethereal account:", e);
            }
        } else {
            console.log("📧 [EmailService] Using SMTP Config...");
            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT, // 587 or 465
                secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });
        }
    }

    async send(type, payload) {
        if (!this.transporter) await this.initTransporter();

        const templateMap = {
            'VERIFY_EMAIL': { subject: 'Verifikasi Alamat Email Anda - DagangDomain', template: 'verify_email.ejs' },
            'WELCOME': { subject: 'Selamat Datang di DagangDomain!', template: 'welcome.ejs' },
            'INVOICE_PENDING': { subject: 'Tagihan Invoice Menunggu Pembayaran', template: 'invoice_pending.ejs' },
            'DOMAIN_ACTIVE': { subject: 'Domain Anda Telah Aktif!', template: 'domain_active.ejs' },
            'DOMAIN_RENEW_SUCCESS': { subject: 'Perpanjangan Domain Berhasil', template: 'domain_renew_success.ejs' },
            'TRANSFER_SUCCESS': { subject: 'Transfer Domain Berhasil', template: 'transfer_success.ejs' },
            'TOPUP_SUCCESS': { subject: 'Top Up Saldo Berhasil', template: 'topup_success.ejs' },
            'DOMAIN_EXPIRY_REMINDER': { subject: 'Pengingat Perpanjangan Domain', template: 'domain_expiry_reminder.ejs' },
            'PAYMENT_SUCCESS': { subject: 'Pembayaran Berhasil', template: 'payment_success.ejs' },
            'PAYMENT_FAILED': { subject: 'Pembayaran Gagal', template: 'payment_failed.ejs' },
            'WITHDRAWAL_REQUEST': { subject: 'Permintaan Penarikan Dana Diterima', template: 'withdrawal_request.ejs' },
            'WITHDRAWAL_APPROVED': { subject: 'Penarikan Dana Disetujui', template: 'withdrawal_approved.ejs' },
            'WITHDRAWAL_REJECTED': { subject: 'Permintaan Penarikan Dana Ditolak', template: 'withdrawal_rejected.ejs' },
            'WITHDRAWAL_COMPLETED': { subject: 'Dana Penarikan Berhasil Dikirim', template: 'withdrawal_completed.ejs' },
            'RESET_PASSWORD': { subject: 'Atur Ulang Kata Sandi Anda - DagangDomain', template: 'reset_password.ejs' }
        };

        const config = templateMap[type];
        if (!config) {
            console.error(`📧 [EmailService] Unknown template type: ${type}`);
            return;
        }

        const { to, user } = payload;
        const recipient = to || (user ? user.email : null);

        if (!recipient) {
            console.error("📧 [EmailService] No recipient defined.");
            return;
        }

        let htmlContent = '';
        try {
            const templatePath = path.join(__dirname, '../templates', config.template);
            htmlContent = await ejs.renderFile(templatePath, payload);
        } catch (renderErr) {
            console.error("📧 [EmailService] Template Render Error:", renderErr);
            this.logEmail(recipient, config.subject, type, 'failed', renderErr.message);
            return;
        }

        try {
            const info = await this.transporter.sendMail({
                from: process.env.SMTP_FROM || '"DagangDomain System" <no-reply@dagangdomain.com>',
                to: recipient,
                subject: config.subject,
                html: htmlContent,
                attachments: [{
                    filename: 'ADTLogo.png',
                    path: path.join(__dirname, '../public/ADTLogo.png'),
                    cid: 'adtlogo',
                    contentType: 'image/png'
                }]
            });


            
            if (process.env.NODE_ENV === 'development' && !process.env.SMTP_HOST) {
                console.log("📧 [EmailService] Preview URL:", nodemailer.getTestMessageUrl(info));
            }

            this.logEmail(recipient, config.subject, type, 'sent', null, info.messageId);

        } catch (sendErr) {
            console.error("📧 [EmailService] Send Failed:", sendErr);
            this.logEmail(recipient, config.subject, type, 'failed', sendErr.message);
        }
    }

    async sendPaymentSuccess(user, invoice, domain) {
        return this.send('PAYMENT_SUCCESS', { user, invoice, domain });
    }

    async sendPaymentFailed(user, invoice, reason) {
        return this.send('PAYMENT_FAILED', { user, invoice, reason });
    }

    async sendTransferSuccess(user, domain) {
        return this.send('TRANSFER_SUCCESS', { user, domain });
    }

    async sendTopupSuccess(user, invoice, amount) {
        return this.send('TOPUP_SUCCESS', { user, invoice, amount });
    }

    async sendDomainRenewSuccess(user, domain, years, expiryDate) {
        return this.send('DOMAIN_RENEW_SUCCESS', { user, domain, years, expiryDate });
    }

    async sendExpiryReminder(user, domain, days, expiryDate) {
        return this.send('DOMAIN_EXPIRY_REMINDER', { user, domain, days, expiryDate });
    }

    async sendVerificationEmail(user, token) {
        const verificationUrl = `${process.env.CLIENT_URL}/verify?token=${token}`;
        return this.send('VERIFY_EMAIL', { user, token, verificationUrl });
    }

    async sendResetPasswordEmail(user, token) {
        const resetUrl = `${process.env.CLIENT_URL}/reset-password/${token}`;
        return this.send('RESET_PASSWORD', { user, token, resetUrl });
    }

    async logEmail(recipient, subject, type, status, error = null, messageId = null) {
        const query = `
            INSERT INTO email_logs (
                recipient, subject, template_type, status, error_message, message_id
            ) VALUES (?, ?, ?, ?, ?, ?)
        `;
        const params = [recipient, subject, type, status, error, messageId];
        
        try {
            db.query(query, params, (err) => {
                if (err) console.error("📧 [EmailService] Log DB Error:", err);
            });
        } catch (e) {
            console.error("📧 [EmailService] Logger Exception:", e);
        }
    }
}

module.exports = new EmailService();
