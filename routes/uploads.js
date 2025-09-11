import express from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

router.get('/:file', (req, res) => {
    const file = req.params.file;

    res.sendFile(__dirname + '/../public/uploads/' + file, (err) => {
        if (err) {
            res.status(404).send("File not found");
            return;
        }
    });
});

export default router