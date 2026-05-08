fetch('http://localhost:3001/api/auth/reset-password-request', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'wkjeon@gmail.com' })
})
.then(async r => {
  const data = await r.json();
  console.log('Status:', r.status);
  console.log('--- ERROR MESSAGE ---');
  console.log(data.details);
})
.catch(console.error);
