import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export type EmailLanguage = 'en' | 'es';

interface PasswordResetEmailParams {
  to: string;
  userName?: string;
  resetLink: string;
  language?: EmailLanguage;
}

@Injectable()
export class EmailService {
  private readonly resend?: Resend;
  private readonly logger = new Logger(EmailService.name);
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        'RESEND_API_KEY not configured. Email sending will be disabled.',
      );
    }
    this.resend = apiKey ? new Resend(apiKey) : undefined;
    
    // Use configured from email or default to resend.dev for testing
    this.fromEmail = this.configService.get<string>('EMAIL_FROM') 
      || 'Expense Tracker <noreply@resend.dev>';
    
    this.logger.log(`Email service initialized with from address: ${this.fromEmail}`);
  }

  async sendPasswordResetEmail(params: PasswordResetEmailParams): Promise<boolean> {
    const { to, userName, resetLink, language = 'en' } = params;

    this.logger.log(`Attempting to send password reset email to: ${to}`);
    this.logger.log(`Reset link: ${resetLink}`);

    const templates = this.getPasswordResetTemplates(language);
    const greeting = userName ? templates.greetingWithName(userName) : templates.greeting;

    const html = `
<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${templates.subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; text-align: center; border-bottom: 1px solid #e2e8f0;">
              <div style="display: inline-flex; align-items: center; gap: 8px;">
                <span style="font-size: 24px;">💰</span>
                <span style="font-size: 20px; font-weight: 700; color: #1e293b;">Expense Tracker</span>
              </div>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #1e293b; text-align: center;">
                ${templates.title}
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #475569;">
                ${greeting}
              </p>
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #475569;">
                ${templates.message}
              </p>
              
              <!-- Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 8px 0 24px 0;">
                    <a href="${resetLink}" target="_blank" style="display: inline-block; padding: 14px 32px; background-color: #10b981; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px;">
                      ${templates.buttonText}
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #64748b;">
                ${templates.linkNote}
              </p>
              <p style="margin: 0 0 24px 0; font-size: 12px; line-height: 1.4; color: #94a3b8; word-break: break-all;">
                <a href="${resetLink}" style="color: #10b981;">${resetLink}</a>
              </p>
              
              <div style="padding: 16px; background-color: #fef3c7; border-radius: 8px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 14px; color: #92400e;">
                  ⚠️ ${templates.expiryWarning}
                </p>
              </div>
              
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #64748b;">
                ${templates.ignoreMessage}
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">
                ${templates.footer}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    const text = `
${templates.title}

${greeting}

${templates.message}

${templates.buttonText}: ${resetLink}

${templates.expiryWarning}

${templates.ignoreMessage}

---
${templates.footer}
    `.trim();

    if (!this.resend) {
      this.logger.warn('Email sending is disabled (RESEND_API_KEY missing)');
      return false;
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: [to],
        subject: templates.subject,
        html,
        text,
      });

      if (error) {
        this.logger.error(`Failed to send password reset email: ${JSON.stringify(error)}`);
        return false;
      }

      this.logger.log(`Password reset email sent successfully. ID: ${data?.id}`);
      return true;
    } catch (error) {
      this.logger.error(`Error sending password reset email: ${error}`);
      return false;
    }
  }

  private getPasswordResetTemplates(language: EmailLanguage) {
    const templates = {
      en: {
        subject: 'Reset Your Password - Expense Tracker',
        title: 'Reset Your Password',
        greeting: 'Hello,',
        greetingWithName: (name: string) => `Hello ${name},`,
        message:
          'We received a request to reset the password for your Expense Tracker account. Click the button below to create a new password.',
        buttonText: 'Reset Password',
        linkNote: "If the button doesn't work, copy and paste this link into your browser:",
        expiryWarning: 'This link will expire in 1 hour for security reasons.',
        ignoreMessage:
          "If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.",
        footer: '© 2026 Expense Tracker. All rights reserved.',
      },
      es: {
        subject: 'Restablecer Contraseña - Rastreador de Gastos',
        title: 'Restablecer Tu Contraseña',
        greeting: 'Hola,',
        greetingWithName: (name: string) => `Hola ${name},`,
        message:
          'Recibimos una solicitud para restablecer la contraseña de tu cuenta de Rastreador de Gastos. Haz clic en el botón de abajo para crear una nueva contraseña.',
        buttonText: 'Restablecer Contraseña',
        linkNote: 'Si el botón no funciona, copia y pega este enlace en tu navegador:',
        expiryWarning: 'Este enlace expirará en 1 hora por razones de seguridad.',
        ignoreMessage:
          'Si no solicitaste restablecer tu contraseña, puedes ignorar este correo. Tu contraseña permanecerá sin cambios.',
        footer: '© 2026 Rastreador de Gastos. Todos los derechos reservados.',
      },
    };

    return templates[language] || templates.en;
  }
}
