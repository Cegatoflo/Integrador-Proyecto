import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendTempPasswordEmail(to: string, tempPassword: string) {
  const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";

  await transporter.sendMail({
    from: `"Top Modas" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Nueva contraseña generada — Top Modas",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:linear-gradient(135deg,#fce4ec,#f48fb1);font-family:Arial,sans-serif;min-height:100vh;">
  <table width="100%" cellpadding="0" cellspacing="0" style="min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="420" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;padding:40px;box-shadow:0 8px 32px rgba(233,30,99,0.15);">
          <tr>
            <td align="center" style="padding-bottom:16px;">
              <div style="font-size:48px;">🔑</div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:12px;">
              <h1 style="margin:0;color:#c2185b;font-size:22px;font-weight:700;">Nueva contraseña generada</h1>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <p style="margin:0;color:#757575;font-size:14px;line-height:1.6;">
                Hemos generado una nueva contraseña temporal para tu cuenta.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <div style="background:linear-gradient(135deg,#fce4ec,#f8bbd0);border:2px solid #f48fb1;border-radius:12px;padding:16px 32px;display:inline-block;">
                <span style="font-size:22px;font-weight:700;color:#c2185b;letter-spacing:4px;">${tempPassword}</span>
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <p style="margin:0;color:#9e9e9e;font-size:13px;line-height:1.6;">
                Por seguridad, te recomendamos iniciar sesión y cambiar<br/>esta contraseña inmediatamente.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:20px;">
              <a href="${frontendUrl}/forgot-password"
                 style="background:linear-gradient(135deg,#f48fb1,#e91e63);color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:600;display:inline-block;">
                Restablecer contraseña
              </a>
            </td>
          </tr>
          <tr>
            <td align="center">
              <p style="margin:0;color:#bdbdbd;font-size:12px;">
                Si no solicitaste este cambio, contacta con soporte inmediatamente.
              </p>
            </td>
          </tr>
        </table>
        <p style="margin-top:24px;color:#fff;font-size:12px;opacity:0.8;">
          © 2024 Top Modas. Todos los derechos reservados.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  });
}

export async function sendContactEmail(name: string, email: string, message: string) {
  await transporter.sendMail({
    from: `"Top Modas" <${process.env.EMAIL_USER}>`,
    to: process.env.ADMIN_EMAIL,
    subject: `Mensaje de contacto — ${name}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:32px;">
        <h2 style="color:#c2185b;">Nuevo mensaje de contacto</h2>
        <p><strong>Nombre:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Mensaje:</strong></p>
        <div style="background:#fce4ec;border-radius:8px;padding:16px;color:#333;">
          ${message.replace(/\n/g, "<br/>")}
        </div>
      </div>
    `.trim(),
  });
}
