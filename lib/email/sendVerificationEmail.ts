import { sendEmail } from "./sendEmail";

export async function sendVerificationEmail(
  email: string,
  fullName: string,
  code: string
) {
  await sendEmail(
    email,
    "پشتڕاستکردنەوەی ئیمەیڵ",
    `
<!DOCTYPE html>
<html lang="ku" dir="rtl">

<head>
<meta charset="UTF-8" />
<title>پشتڕاستکردنەوەی ئیمەیڵ</title>
</head>

<body style="margin:0;padding:40px;background:#FFF8EF;font-family:Tahoma,Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center">

<table width="600" cellpadding="0" cellspacing="0"
style="background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.08);">

<tr>
<td
style="background:linear-gradient(135deg,#FFAE42,#E8942A);padding:35px;text-align:center;color:white;">

<h1 style="margin:0;">
REK ERP
</h1>

<p style="margin-top:10px;">
سیستەمی بەڕێوەبردنی کارگە
</p>

</td>
</tr>

<tr>
<td style="padding:40px;">

<h2 style="color:#FFAE42;">
سڵاو ${fullName}
</h2>

<p style="font-size:17px;line-height:2;color:#444;">
بۆ تەواوکردنی درووستکردنی هەژمار، ئەم کۆدەی خوارەوە بنووسە.
</p>

<div
style="
margin:35px auto;
background:#FFF8EF;
border:2px dashed #FFAE42;
border-radius:16px;
padding:20px;
text-align:center;
font-size:42px;
font-weight:bold;
letter-spacing:12px;
color:#FFAE42;
">

${code}

</div>

<p style="color:#666;font-size:15px;">
ئەم کۆدە تەنها ١٠ خولەک کاردەکات.
</p>

<p style="margin-top:40px;">
تکایە کۆدی پشتڕاستکردنەوە قبووڵ بکە و دواتریش بەخێر بێیت بۆ ماڵپەڕی ڕێک هەمیشە لێرە پێشەنگ و جیاواز دەردەکەویت و کارەکانت ئاسانتر بکە.
<br>
REK ERP
</p>

</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`
  );
}