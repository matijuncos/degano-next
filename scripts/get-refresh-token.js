const { google } = require('googleapis');
const http = require('http');
const url = require('url');
require('dotenv').config({ path: '.env.local' });

// Configuración (toma de las variables de entorno)
const CLIENT_ID = process.env.NEXT_PUBLIC_GAPICONFIG_CLIENTID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3001/oauth2callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('\n❌ Error: Faltan variables de entorno');
  console.log('\nAsegúrate de tener en tu .env.local:');
  console.log('- NEXT_PUBLIC_GAPICONFIG_CLIENTID');
  console.log('- GOOGLE_CLIENT_SECRET');
  console.log('\nPara obtener el CLIENT_SECRET, sigue la guía SETUP_GOOGLE_DRIVE.md\n');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const scopes = [
  'https://www.googleapis.com/auth/drive.file'
];

// Generar URL de autorización
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
  prompt: 'consent' // Fuerza el prompt para obtener refresh token
});

console.log('\n🚀 Script para obtener Refresh Token de Google Drive\n');
console.log('📋 Pasos:');
console.log('1. Copia la URL que aparecerá abajo');
console.log('2. Ábrela en tu navegador');
console.log('3. Selecciona la cuenta de Gmail que quieres usar para guardar archivos');
console.log('4. Autoriza el acceso a Google Drive');
console.log('5. Serás redirigido a localhost:3001');
console.log('6. El script capturará el código y generará tu refresh token\n');

// Crear servidor temporal para capturar el código
const server = http.createServer(async (req, res) => {
  const queryObject = url.parse(req.url, true).query;

  if (queryObject.code) {
    res.end('✅ ¡Autorización exitosa! Puedes cerrar esta ventana y volver a la terminal.');

    try {
      const { tokens } = await oauth2Client.getToken(queryObject.code);

      console.log('\n✅ ¡Refresh Token obtenido exitosamente!\n');
      console.log('📝 Copia este refresh token y pégalo en tu .env.local:\n');
      console.log('GOOGLE_REFRESH_TOKEN=' + tokens.refresh_token);
      console.log('\n⚠️  IMPORTANTE: Guarda este token de forma segura.');
      console.log('   NO lo compartas ni lo subas a repositorios públicos.\n');

      server.close();
      process.exit(0);
    } catch (error) {
      console.error('\n❌ Error obteniendo el token:', error);
      res.end('❌ Error obteniendo el token. Revisa la terminal.');
      server.close();
      process.exit(1);
    }
  } else {
    res.end('❌ No se recibió código de autorización');
  }
});

server.listen(3001, () => {
  console.log('🌐 Servidor temporal iniciado en http://localhost:3001\n');
  console.log('📎 Abre esta URL en tu navegador:\n');
  console.log('\x1b[36m%s\x1b[0m\n', authUrl);
  console.log('⏳ Esperando autorización...\n');
});
