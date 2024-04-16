const { getRequestBody } = require("../../lib/parseBody");
const http = require('http');
const mysql = require('mysql');
const cors = require('cors');
const querystring = require('querystring');
const { userInfo } = require("os");

module.exports = async (req, res) => {
    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }

    const db = mysql.createConnection({
        host: "cosc3380.c5iqeciq8qjg.us-east-2.rds.amazonaws.com",
        user: "admin",
        password: "TtZDqS57PM8KxHaOLRcs",
        database: "cosc3380"
    });

    db.connect(err => {
        if (err) {
            console.error('Error connecting to database:', err);
            return;
        }
        console.log('Connected to database');
    });

    const { email } = req.query;
    console.log('Received email:', email);

    const getUserSql = `SELECT user_id, first_name, last_name, address FROM \`USER\` WHERE email = ?`;
    db.query(getUserSql, [email], (err, userResult) => {
        if (err) {
            console.log('Error finding user');
            console.error('Error retrieving user:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal Server Error' }));
            return;
        }
    
        if (userResult.length === 0) {
            console.log('No user');
            res.statusCode = 401;
            res.end(JSON.stringify({ error: 'User not found' }));
            return;
        }
    
        console.log('User found:', userResult[0]);

        // Now, let's fetch the user's transaction history
        const getUserHistorySql = `
            SELECT 
                t.transaction_id,
                t.transaction_date,
                ti.product_id,
                sp.product_name,
                sp.price
            FROM 
                TRANSACTIONS t
            JOIN 
                TRANSACTION_ITEM ti ON t.transaction_id = ti.transaction_id
            JOIN 
                SHOE_PRODUCT sp ON ti.product_id = sp.product_id
            WHERE 
                t.user_id = ?
        `;
        
        db.query(getUserHistorySql, [userResult[0].user_id], (err, transactionResults) => {
            if (err) {
                console.error('Error retrieving user history:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Internal Server Error' }));
                return;
            }

            // Combine user information and transaction history
            const userDataWithHistory = {
                ...userResult[0],
                transactions: transactionResults
            };

            // Send the combined data as the response
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(userDataWithHistory));
        });
    });
};