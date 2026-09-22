export default async function handler(req, res) {
  // Postavljanje CORS zaglavlja kako bi pozivi sa Live Servera i drugih domena radili
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Rukovanje sa Preflight OPTIONS zahtjevom sa browsera
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Primamo samo POST zahteve sa frontenda
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { emailTo, subject, textContent } = req.body || {};

  // Provjera da li su poslani svi potrebni podaci sa frontenda
  if (!emailTo || !subject || !textContent) {
    return res.status(400).json({ error: 'Nedostaju obavezni parametri (emailTo, subject, textContent).' });
  }

  // Uzimamo tajni ključ iz Vercel environment varijabli
  const BREVO_API_KEY = process.env.BREVO_API_KEY;

  if (!BREVO_API_KEY) {
    return res.status(500).json({ error: 'Brevo API key nije podešen u Vercel Environment Variables.' });
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': BREVO_API_KEY
      },
      body: JSON.stringify({
        sender: { name: "Gym Tracker Pro", email: "yourgymplanner@gmail.com" },
        to: [{ email: emailTo }],
        subject: subject,
        htmlContent: textContent
      })
    });

    const data = await response.json();

    if (response.ok) {
      return res.status(200).json({ success: true, data });
    } else {
      return res.status(400).json({ success: false, error: data });
    }
  } catch (error) {
    console.error("Greška na serveru:", error);
    return res.status(500).json({ error: 'Greška pri slanju e-maila na serveru.' });
  }
}