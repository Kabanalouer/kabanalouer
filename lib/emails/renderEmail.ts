export function renderEmail({
  lang,
  greeting,
  heading,
  body,
  buttonLabel,
  buttonUrl,
  secondaryButtonLabel,
  secondaryButtonUrl,
  footerNote,
}: {
  lang: "fr" | "en";
  greeting?: string;
  heading: string;
  body: string;
  buttonLabel: string;
  buttonUrl: string;
  secondaryButtonLabel?: string;
  secondaryButtonUrl?: string;
  footerNote: string;
}) {
  return `<!DOCTYPE html>
<html lang="${lang}">
  <body style="margin:0;padding:0;background-color:#f5f6ec;font-family:'Plus Jakarta Sans',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f6ec;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 8px 32px;text-align:center;">
                <span style="font-size:20px;font-weight:700;color:#636e40;">Kabanalouer</span>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 0 32px;">
                ${greeting ? `<p style="margin:0 0 12px 0;font-size:15px;line-height:1.6;color:#57534e;">${greeting}</p>` : ""}
                <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;color:#292524;">${heading}</h1>
                <p style="margin:0 0 28px 0;font-size:15px;line-height:1.6;color:#57534e;">${body}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px;text-align:center;">
                <a href="${buttonUrl}" style="display:inline-block;background-color:#636e40;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 32px;border-radius:9999px;">${buttonLabel}</a>
              </td>
            </tr>
            ${secondaryButtonLabel && secondaryButtonUrl ? `
            <tr>
              <td style="padding:12px 32px 0 32px;text-align:center;">
                <a href="${secondaryButtonUrl}" style="display:inline-block;background-color:#ffffff;color:#636e40;text-decoration:none;font-weight:600;font-size:15px;padding:13px 32px;border-radius:9999px;border:1px solid #636e40;">${secondaryButtonLabel}</a>
              </td>
            </tr>` : ""}
            <tr>
              <td style="padding:28px 32px 32px 32px;">
                <p style="margin:0;font-size:13px;line-height:1.6;color:#a8a29e;">${footerNote}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
