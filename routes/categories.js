import express from 'express';
import { checkJwt } from '../auth.js';
import { db } from '../database.js';

const router = express.Router()

router.get('/', (req, res) => {
    db.all('SELECT * FROM categories ORDER BY `order`', (err, rows) => {
        if (err) {
            res.status(500).send(err.message);
            return;
        }

        res.json(rows);
    });
})

router.put('/add', checkJwt, (req, res) => {
    const body = req.body;

    if(body.category == null){
        res.status(400).send("Missing data");
        return;
    }

    db.run('INSERT INTO `categories` (`category`, `order`) VALUES(?, ?)', [body.category, body.order], function(err) {
        if (err) {
            res.status(500).send(err.message);
            return;
        }

        res.json({ id: this.lastID });
     });
});

router.post('/update/:id', checkJwt, (req, res) => {
    const id = req.params.id
    const body = req.body;

    if(body.category == null || body.order == null){
        res.status(400).send("Missing data");
        return;
    }

    db.run('UPDATE `categories` SET `category` = ?, `order` = ? WHERE id = ?', [body.category, body.order, id], (err, result) => {
        if (err) {
            res.status(500).send(err.message);
            return;
        }

        res.json({ success: true });
    })
    }
)

router.delete('/delete/:id', checkJwt, (req, res) => {
    const id = req.params.id

    db.run('DELETE FROM `categories` WHERE id = ?', id, (err, result) => {
        if (err) {
            res.status(500).send(err.message);
            return;
        }
        
        res.json({ success: true });
    });
})

export default router