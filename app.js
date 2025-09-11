import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import categoryModule from './routes/categories.js';
import productModule from './routes/products.js';
import orderModule from './routes/orders.js';
import accountantModule from './routes/accountant.js';
import uploadsModule from './routes/uploads.js';

dotenv.config({ path: '.env' });

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(express.json()); //Pro zpracování JSONu při body request
app.use(bodyParser.urlencoded( { extended: true } )) //Zpracování formData
app.use("/uploads", express.static(path.join(__dirname, "public/uploads"))); //Povolení statických souborů

// Middleware pro povolení CORS
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN_URL,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"],
    maxAge: 86400,
  })
);

//Modules
app.use('/category', categoryModule);
app.use('/product', productModule);
app.use('/order', orderModule);
app.use('/accountant', accountantModule);
app.use('/uploads', uploadsModule);

export default app;