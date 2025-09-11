import { createServer } from 'http';
import app from './app.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const server = createServer(app);
const port = process.env.PORT || 8000;

server.listen(port, () => console.log(`Server running on port ${port}`));