export default async function handler(req, res) {
  // Postavljanje CORS zaglavlja kako bi pozivi sa Live Servera i drugih domena radili
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
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

  const { emailTo, code } = req.body || {};

  // Provjera podataka koje endpoint prihvata za verifikacioni e-mail.
  if (!emailTo || !code) {
    return res.status(400).json({ error: 'Nedostaju obavezni parametri (emailTo, code).' });
  }

  if (!/^\S+@\S+\.\S+$/.test(emailTo) || !/^\d{6}$/.test(String(code))) {
    return res.status(400).json({ error: 'E-mail ili verifikacioni kod nisu ispravni.' });
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
        to: [{ email: emailTo }],
        templateId: 1,
        params: {
          code: String(code),
          expirationMinutes: '10'
        }
      })
    });

    const rawResponse = await response.text();
    let data = {};

    try {
      data = rawResponse ? JSON.parse(rawResponse) : {};
    } catch {
      data = { message: rawResponse || 'Brevo nije vratio JSON odgovor.' };
    }

    if (response.ok) {
      return res.status(200).json({ success: true, data });
    } else {
      console.error('Brevo je odbio zahtjev:', response.status, data);
      return res.status(response.status).json({ success: false, error: data });
    }
  } catch (error) {
    console.error("Greška na serveru:", error);
    return res.status(500).json({ error: 'Greška pri slanju e-maila na serveru.' });
  }
}
