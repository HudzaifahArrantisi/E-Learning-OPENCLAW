package utils

import (
	"errors"
	"fmt"
	"net/smtp"
	"os"
	"strings"
)

// ErrSMTPNotConfigured is returned when SMTP env vars are missing.
// Callers should treat this as non-fatal (log and continue).
var ErrSMTPNotConfigured = errors.New("SMTP is not configured")

// smtpConfig reads SMTP settings from the environment.
func smtpConfig() (host, port, user, pass, from string, ok bool) {
	host = strings.TrimSpace(os.Getenv("SMTP_HOST"))
	port = strings.TrimSpace(os.Getenv("SMTP_PORT"))
	user = strings.TrimSpace(os.Getenv("SMTP_USER"))
	pass = strings.TrimSpace(os.Getenv("SMTP_PASSWORD"))
	if pass == "" {
		pass = strings.TrimSpace(os.Getenv("SMTP_PASS"))
	}
	from = strings.TrimSpace(os.Getenv("SMTP_FROM"))
	if from == "" {
		from = user
	}
	if port == "" {
		port = "587"
	}
	ok = host != "" && user != "" && pass != ""
	return
}

// SendVerificationEmail sends an HTML email containing the verification link.
// Uses stdlib net/smtp; smtp.SendMail negotiates STARTTLS automatically on :587.
func SendVerificationEmail(toEmail, name, link string) error {
	host, port, user, pass, from, ok := smtpConfig()
	if !ok {
		return ErrSMTPNotConfigured
	}

	displayName := strings.TrimSpace(name)
	if displayName == "" {
		displayName = "Mahasiswa"
	}

	subject := "Verifikasi Email - NF Student HUB"
	htmlBody := fmt.Sprintf(`<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;background:#f4f4f6;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;">
    <h2 style="color:#0F172A;margin:0 0 8px;">Halo, %s 👋</h2>
    <p style="color:#475569;font-size:14px;line-height:1.6;">
      Terima kasih telah mendaftar di <strong>NF Student HUB</strong>.
      Klik tombol di bawah untuk memverifikasi alamat email kampus Anda.
    </p>
    <div style="text-align:center;margin:28px 0;">
      <a href="%s" style="display:inline-block;background:#0F172A;color:#fff;text-decoration:none;
         padding:12px 28px;border-radius:999px;font-size:14px;font-weight:bold;">
        Verifikasi Email
      </a>
    </div>
    <p style="color:#94A3B8;font-size:12px;line-height:1.6;">
      Jika tombol tidak berfungsi, salin tautan berikut ke browser Anda:<br>
      <a href="%s" style="color:#4B73FF;word-break:break-all;">%s</a>
    </p>
    <p style="color:#94A3B8;font-size:12px;">Tautan ini berlaku selama 24 jam.</p>
  </div>
</body>
</html>`, displayName, link, link, link)

	msg := strings.Join([]string{
		"From: " + from,
		"To: " + toEmail,
		"Subject: " + subject,
		"MIME-Version: 1.0",
		"Content-Type: text/html; charset=UTF-8",
		"",
		htmlBody,
	}, "\r\n")

	auth := smtp.PlainAuth("", user, pass, host)
	addr := host + ":" + port
	return smtp.SendMail(addr, auth, from, []string{toEmail}, []byte(msg))
}
