import { sendAdminAnnouncement } from './server/utils/mailer';
import dotenv from 'dotenv';

dotenv.config();

console.log("Starting SMTP test...");
sendAdminAnnouncement('wkjeon@gmail.com', 'Test Subject', 'This is a test from the backend to the advertiser.')
  .then(res => console.log('Final Result:', res))
  .catch(err => console.error('Error:', err));
