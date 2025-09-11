import express from 'express'
import fs from 'fs';
import { db } from '../database.js';
import { getCurrentDateTime, uniqueId } from '../functions.js';
import { upload } from '../file.js';
import { checkJwt } from '../auth.js';

const router = express.Router()

function errorHandle(data){
    const filePath = `./logs/products/error-${getCurrentDateTime()}.txt`;
    const fileContent = data;

    fs.writeFile(filePath, fileContent, (err) => {
        if (err) {
            console.error('Error log writing file wasn\'t successful:', err);
        } else {
            console.log('Error log written successfully');
        }
    });

    console.log("Nezapsáno: " + fileContent)
}

router.post('/', (req, res) => {
    const body = req.body ?? {};
    const search = body.search ?? '';

    db.all('SELECT * FROM `products` WHERE (`name` LIKE ? OR ? IS NULL OR ? = \'\') ORDER BY `order`', [`%${search}%`, search, search], (err, rows) => {
        if (err) {
            res.status(500).send(err.message);
            return;
        }

        res.json(rows);
    });
})

router.post('/category/:category', (req, res) => {
    const category = req.params.category;
    const body = req.body ?? {};
    const search = body.search ?? '';

    db.all('SELECT * FROM `products` WHERE `category` = ? AND (`name` LIKE ? OR ? IS NULL OR ? = \'\') ORDER BY `order`', [category, `%${search}%`, search, search], (err, rows) => {
        if (err) {
            res.status(500).send(err.message);
            return;
        }

        res.json(rows);
    });
})

router.put('/add', checkJwt, upload.single('image'), (req, res) => {
    const body = req.body;

    if(body.name == null || body.price == null || body.amount == null || body.category == null) {
        res.status(400).send('Missing data!');
        return;
    }

    db.run('INSERT INTO `products` (`name`, `price`, `amount`, `category`, `image`, `order`) VALUES(?, ?, ?, ?, ?, ?)', 
        [
            body.name, 
            parseFloat(body.price), 
            parseInt(body.amount), 
            body.category,
            req.file ? req.file.filename : null,
            body.order ?? 99999
        ], function (err) {
            if (err) {
                res.status(500).send(err.message);
            }

            res.json({
                id: this.lastID,
                image: req.file ? req.file.filename : null
            });
        });
});

router.post('/update/:id', checkJwt, upload.single('image'), (req, res) => {
    const id = req.params.id
    const body = req.body;

    if(body.name == null || body.price == null || body.category == null || body.order == null) {
        res.status(400).send('Missing data!');
        return;
    }

    db.run(
        'UPDATE `products` SET `name` = ?, `price` = ?, `category` = ?, `order` = ?, `image` = COALESCE(?, image) WHERE id = ?', 
        [
            body.name, 
            parseFloat(body.price), 
            body.category, 
            parseInt(body.order), 
            req.file ? req.file.filename : null,
            id
        ], (err, result) => {
            if (err) {
                res.status(500).send(err.message);
                return;
            }

            res.json({
                id: id,
                image: req.file ? req.file.filename : null
            });
        }
    )
})

router.delete('/delete/:id', checkJwt, (req, res) => {
    const id = req.params.id

    db.run('DELETE FROM `products` WHERE id = ?', id, (err, result) => {
        if (err) {
            res.status(500).send(err.message);
            return;
        }
        
        res.json({ success: true });
    });
})

router.post('/:id/add', (req, res) => {
    const id = req.params.id
    const body = req.body;

    db.run('UPDATE `products` SET `amount` = `amount` + ? WHERE id = ?', [body.add_amount, id], (err, result) => {
        if (err) {
            res.status(500).send(err.message);
            return;
        }

        db.run('INSERT INTO `logs` (`type`, `log_id`, `product_id`, `product_name`, `price`, `amount`, `date`, `description`) VALUES(?, ?, ?, ?, ?, ?, ?, ?)',
        [
            'amount-add',
            uniqueId(),
            id,
            body.name,
            body.price,
            body.add_amount,
            getCurrentDateTime(),
            body.description
        ], function(err) {
            if (err) {
                errorHandle(`ERROR: nepovedlo se přidat množství u produktu ${id} - ${body.name}, ${err.message}: ` + JSON.stringify(body))
            } else console.log(`[${getCurrentDateTime()}}] přidalo se množství u produktu ${id} - ${body.name}, zalogováno`)
        });
        
        res.json({ success: true });
    });
})

router.post('/:id/minus', (req, res) => {
    const id = req.params.id
    const body = req.body;

    db.run('UPDATE `products` SET `amount` = `amount` - ? WHERE id = ?', [body.minus_amount, id], (err, result) => {
        if (err) {
            res.status(500).send(err.message);
            return;
        }

        db.run('INSERT INTO `logs` (`type`, `log_id`, `product_id`, `product_name`, `price`, `amount`, `date`, `description`) VALUES(?, ?, ?, ?, ?, ?, ?, ?)',
        [
            'amount-minus',
            uniqueId(),
            id,
            body.name,
            body.price,
            body.minus_amount,
            getCurrentDateTime(),
            body.description
        ], function(err) {
            if (err) {
                errorHandle(`ERROR: nepovedlo se odebrat množství u produktu ${id} - ${body.name}, ${err.message}: ` + JSON.stringify(body))
            } else console.log(`[${getCurrentDateTime()}}] odebralo se množství u produktu ${id} - ${body.name}, zalogováno`)
        });
        
        res.json({ success: true });
    });
})

export default router