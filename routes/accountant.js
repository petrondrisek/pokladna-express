import express from 'express'
import fs from 'fs';
import { db } from '../database.js';
import { checkJwt } from '../auth.js';
import { getCurrentDateTime, uniqueId } from '../functions.js';

const router = express.Router()

function errorHandle(data){
    const filePath = `./logs/accountant/error-${getCurrentDateTime()}.txt`;
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


router.delete('/delete/:id', checkJwt, (req, res) => {
    const id = req.params.id;

    db.run('DELETE FROM `logs` WHERE id = ?', id, (err, result) => {
        if (err) {
            res.status(500).send(err.message);
        }

        res.json({ success: true });
    })
})

router.post('/search/:date{/:page}', checkJwt, (req, res) => {
    const body = req.body
    const date = req.params.date;
    const offset = req.params.page ? (req.params.page - 1) * 5 : 0

    if(body.date === '' || body.date === null) body.date = "x";

    db.all(`SELECT *
    FROM logs
    WHERE
    (type = ? OR (? IS NULL OR ? = '')) AND
    (product_id = ? OR (? IS NULL OR ? = '')) AND
    (product_name LIKE ? OR (? IS NULL OR ? = '')) AND
    (amount = ? OR (? IS NULL OR ? = '')) AND
    ((? = 'x' AND date LIKE ?) OR
    (? = '?' AND 1=1) OR
    (date LIKE '%' || ? || '%')) ORDER BY id DESC LIMIT 5 OFFSET ?;`, [
            body.type,
            body.type,
            body.type,
            body.product_id,
            body.product_id,
            body.product_id,
            `%${body.product_name}%`,
            body.product_name,
            body.product_name,
            body.amount,
            body.amount,
            body.amount,
            date,
            `${date}%`,
            date,
            date,
            offset
        ], (err, rows) => {
            if (err) {
                res.status(500).send(err.message);
            }

            res.json(rows);
        })
})


router.get('/date/:date{/:page}', checkJwt, (req, res) => {
    const date = req.params.date;
    const offset = req.params.page ? (req.params.page - 1) * 5 : 0

    db.all('SELECT * FROM `logs` WHERE `date` LIKE ? ORDER BY `id` DESC LIMIT 5 OFFSET ?', [`${date}%`, offset], (err, rows) => {
        if (err) {
            res.status(500).send(err.message);
            return;
        }

        res.json(rows);
    });
})

router.get('/summary/:date', (req, res) => {
    const date = req.params.date;
    const jsonData = {
        "product_sold": 0,
        "receipt_count": 0,
        "total_income": 0,
        "product_wasted": 0,
        "product_wasted_money": 0,
        "product_bought": 0,
        "product_bought_money": 0,
        "cash_end": 0,
        "card_end": 0,
        "purchase_end": 0,
        "ended": false,
        "product_amounts": []
    };

    db.all('SELECT * FROM `logs` WHERE `date` LIKE ?', [`${date}%`], (err, rows) => {
        if (err) {
            res.status(500).send(err.message);
            return;
        }

        let receipt = new Set();
        for(let row in rows){
            if(rows[row].type === 'order') {
                receipt.add(rows[row].log_id);
                jsonData.product_sold += 1;
                jsonData.total_income += rows[row].price;
            }
            if(rows[row].type === 'amount-add') {
                jsonData.product_bought += rows[row].amount;
                jsonData.product_bought_money += rows[row].price * rows[row].amount;
            }
            if(rows[row].type === 'amount-minus') {
                jsonData.product_wasted += rows[row].amount;
                jsonData.product_wasted_money += rows[row].price * rows[row].amount;
            }
            if(rows[row].type === 'day-end') {
                jsonData.ended = true;
                jsonData.card_end = rows[row].amount;
                jsonData.cash_end = rows[row].price;
                jsonData.product_amounts = JSON.parse(rows[row].description);
            }
            if(rows[row].type === 'day-end-purchase') {
                jsonData.purchase_end = rows[row].price;
            }
        }

        jsonData.receipt_count = receipt.size;

        res.json(jsonData);
    });
})

router.get('/summary/:date/product_sold', (req, res) => {
    const date = req.params.date;
    
    db.all('SELECT `product_name`, COUNT(*) as `count`, SUM(`price`) as `price` FROM `logs` WHERE `type` = ? AND `date` LIKE ?GROUP BY `product_id` ORDER BY `count` DESC;', [`order`, `${date}%`], (err, rows) => {
        if (err) {
            res.status(500).send(err.message);
            return;
        }

        res.json(rows);
    });
});

router.get('/is-ended/:date', (req, res) => {
    const date = req.params.date;
    db.get('SELECT EXISTS(SELECT 1 FROM `logs` WHERE `type` = ? and `date` = ?) AS result', ['day-end', `${date}`], (err, row) => {
        if (err) {
            console.error(err.message);
            return;
        }
        
        res.json(row.result);
    });
})

router.post('/end/:date', async (req, res) => {
    const date = req.params.date;
    const body = req.body;
    let products_amount = [];

    try{
        await db.all("SELECT `id`, `amount`, `name` FROM `products`", (err, rows) => {
        if (err) {
            console.error(err.message);
            throw new Error(err);
        }

        products_amount = rows;
        })

        await db.get('SELECT EXISTS(SELECT 1 FROM `logs` WHERE `type` = ? and `date` = ?) AS result', ['day-end', `${date}`], (err, row) => {
            if (err) {
                console.error(err.message);
                throw new Error(err);
            }
            
            if(!row.result) {

                db.run('INSERT INTO `logs` (`type`, `log_id`, `product_id`, `product_name`, `price`, `amount`, `date`, `description`) VALUES(?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    'day-end-purchase',
                    uniqueId(),
                    -1,
                    "UZÁVĚRKA - Nákup",
                    body.purchase_price,
                    0,
                    date,
                    null
                ])

                db.run('INSERT INTO `logs` (`type`, `log_id`, `product_id`, `product_name`, `price`, `amount`, `date`, `description`) VALUES(?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    'day-end',
                    uniqueId(),
                    -1,
                    "UZÁVĚRKA",
                    body.cash_end,
                    body.card_end,
                    date,
                    JSON.stringify(products_amount)
                ], function(err) {
                    if (err) {
                        errorHandle(`ERROR: nepovedlo se uzavřít datum ${date} - ${err.message}: ` + JSON.stringify(body))
                    } else {
                        console.log(`[${getCurrentDateTime()}}] uzavřeno datum ${date}, zalogováno`)
                    }
                });

                res.json({ success: true });

            } else throw new Error('Already ended');
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
})

export default router