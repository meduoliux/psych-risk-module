// server/email.js
import nodemailer from "nodemailer";

function makeTransporter() {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
    throw new Error("MAIL_USER arba MAIL_PASS nenurodyti .env faile");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });
}

export async function sendInviteEmail(to, link, { first_name, last_name }) {
  const transporter = makeTransporter();

  const mailOptions = {
    from: `"Psichometrinis vertinimas" <${process.env.MAIL_USER}>`,
    to,
    subject: "Jūsų psichometrinio vertinimo klausimynas",
    html: `
      <p>Sveiki, ${first_name} ${last_name},</p>
      <p>Norėdami atlikti psichometrinį vertinimą, spauskite nuorodą:</p>
      <p><a href="${link}" target="_blank">${link}</a></p>
      <p>Nuoroda galioja 24 valandas.</p>
      <p>Su pagarba,<br>Paskolų Klubo komanda</p>
    `,
  };

  await transporter.sendMail(mailOptions);
}

/* 🔐 Slaptažodžio atstatymo laiškas */
export async function sendPasswordResetEmail(to, code) {
  const transporter = makeTransporter();

  const mailOptions = {
    from: `"Psichometrinis vertinimas" <${process.env.MAIL_USER}>`,
    to,
    subject: "Slaptažodžio atstatymas",
    html: `
      <p>Sveiki,</p>
      <p>Gavome prašymą atstatyti slaptažodį.</p>
      <p>Jūsų patvirtinimo kodas:</p>
      <p style="font-size: 24px; font-weight: 700; letter-spacing: 4px;">${code}</p>
      <p>Šis kodas galioja 30 minučių.</p>
      <p>Jei slaptažodžio keitimo neprašėte, šį laišką galite ignoruoti.</p>
      <p>Su pagarba,<br>Paskolų Klubo komanda</p>
    `,
  };

  await transporter.sendMail(mailOptions);
}

/* ✅ Registracijos patvirtinimo KODO laiškas (pirmas žingsnis registracijoje) */
export async function sendRegistrationVerificationEmail(
  to,
  code,
  first_name,
  last_name
) {
  const transporter = makeTransporter();

  const mailOptions = {
    from: `"Psichometrinis vertinimas" <${process.env.MAIL_USER}>`,
    to,
    subject: "Registracijos patvirtinimas",
    html: `
      <p>Sveiki, ${first_name} ${last_name},</p>
      <p>Norėdami užbaigti registraciją į Psichometrinio vertinimo modulį, įveskite šį patvirtinimo kodą registracijos puslapyje:</p>
      <p style="font-size: 24px; font-weight: 700; letter-spacing: 4px;">${code}</p>
      <p>Kodas galioja 30 minučių.</p>
      <p>Po kodo patvirtinimo Jūsų registraciją dar turės patvirtinti administratorius.</p>
      <p>Su pagarba,<br>Paskolų Klubo komanda</p>
    `,
  };

  await transporter.sendMail(mailOptions);
}

/* 🆕 Registracijos PATVIRTINIMO laiškas (kai adminas paspaudžia „Patvirtinti“) */
export async function sendRegistrationApprovedEmail(to, first_name, last_name) {
  const transporter = makeTransporter();

  const mailOptions = {
    from: `"Psichometrinis vertinimas" <${process.env.MAIL_USER}>`,
    to,
    subject: "Jūsų registracija patvirtinta",
    html: `
      <p>Sveiki, ${first_name} ${last_name},</p>
      <p>Jūsų registracija Psichometrinio vertinimo sistemoje buvo <strong>patvirtinta</strong>.</p>
      <p>Dabar galite prisijungti prie sistemos naudodami savo prisijungimo duomenis.</p>
      <p>Jei prisijungti vis tiek nepavyktų, susisiekite su sistemos administratoriumi.</p>
      <p>Su pagarba,<br>Paskolų Klubo komanda</p>
    `,
  };


  await transporter.sendMail(mailOptions);
}
/* 📨 Kontaktų formos laiškas */
export async function sendContactEmail(to, { name, email, subject, message }) {
  const transporter = makeTransporter();

  const mailOptions = {
    from: `"Psichometrinis vertinimas" <${process.env.MAIL_USER}>`,
    to,                          // 👈 ČIA eina jūsų inbox (CONTACT_EMAIL arba MAIL_USER)
    replyTo: email,              // 👈 ČIA – KLIENTO el. paštas (kad galėtumėt atsakyti)
    subject: subject || "Užklausa iš kontaktų formos",
    html: `
      <p>Gauta nauja žinutė iš kontaktų formos.</p>
      <p><strong>Vardas:</strong> ${name}</p>
      <p><strong>El. paštas:</strong> ${email}</p>
      ${
        subject
          ? `<p><strong>Tema:</strong> ${subject}</p>`
          : ""
      }
      <p><strong>Žinutė:</strong></p>
      <p>${(message || "").replace(/\n/g, "<br>")}</p>
    `,
  };

  await transporter.sendMail(mailOptions);
}

