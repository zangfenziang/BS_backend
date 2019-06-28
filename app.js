const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const md5 = require('md5');
const multer = require('multer');
const config = require('./config');
const app = express();

const port = 5000;
const addition = '/api';
const upload = multer({ dest: 'upload/' })
const encodePassword = (password)=>{
    return md5(md5(password) + 'zangfenziang');
}
const createToken = ()=>{
    return md5(Date.now()) + md5('zangfenziang' + Math.floor(Math.random() * 1e9));
}
const date2timestamp = (date) => {
    let str = (date.getYear() + 1900).toString();
    const fill = (x)=>{
        let str = x.toString();
        if (str.length == 1){
            return '0' + str;
        }
        else{
            return str;
        }
    }
    str += fill(date.getMonth() + 1);
    str += fill(date.getDate());
    str += fill(date.getHours());
    str += fill(date.getMinutes());
    str += fill(date.getSeconds());
    return str;
}
const tokenStatus = (token, callback) => {
    const conn = mysql.createConnection(config.mysql);
    try{
        conn.query('select * from token where token = ? and end_time > current_timestamp()', [token], (err, results, fields)=>{
            if (err){
                throw err;
            }
            if (results.length == 0){
                if (callback){
                    callback(false);
                }
            }
            else{
                if (callback){
                    callback(true, results[0].uid);
                }
            }
            conn.end();
        })
    }
    catch(err){
        console.error(err);
        conn.end();
        if (callback){
            callback(false);
        }
    }
}
const token2uid = (req, res, next)=>{
    const token = req.body.token;
    if (token){
        tokenStatus(token, (status, uid)=>{
            if (status){
                req.uid = uid;
            }
            next();
        })
    }
    else{
        next();
    }
}

app.use('/upload', express.static('upload'))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(token2uid);

app.get('/', (req, res)=>{
    res.sendFile(__dirname + '/index.html');
})

app.post(addition + '/user/register', (req, res)=>{
    const username = req.body.username;
    let password = req.body.password;
    const email = req.body.email;
    if (username.length < 6 || password.length < 6){
        res.json({
            status: 1,
            message: 'username or password is illegal'
        })
        return;
    }
    const pattern = /^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$/;
    if (!pattern.test(email)){
        res.json({
            status: 1,
            message: 'email is illegal'
        })
        return;
    }
    password = encodePassword(password);
    const conn = mysql.createConnection(config.mysql);
    try{
        conn.query('select * from user where `username` = ? or `email` = ?', [username, email], (err, results, fields)=>{
            if (err){
                throw err;
            }
            if (results.length != 0){
                res.json({
                    status: 1,
                    message: 'username or email exists'
                })
                return;
            }
            conn.query('insert into user(username, password, email) values(?, ?, ?)'
                , [username, password, email]
                , (err, results, fields)=>{
                    if (err){
                        throw err;
                    }
                    if (results.affectedRows == 1){
                        res.json({
                            status: 0
                        })
                    }
                    else{
                        res.json({
                            status: 1,
                            message: 'insert into database fail'
                        })
                    }
                    conn.end();
                })
        })
    }
    catch(err){
        console.error(err);
        res.json({
            status: 1,
            message: 'query database fail'
        });
        conn.end();
    }
})

app.post(addition + '/user/login', (req, res)=>{
    const username = req.body.username;
    const password = encodePassword(req.body.password);
    const conn = mysql.createConnection(config.mysql);
    try{
        conn.query('select * from user where username = ? and password = ?', [username, password], (err, results, fields)=>{
            if (err){
                throw err;
            }
            if (results.length == 0){
                res.json({
                    status: 1,
                    message: 'username or password is incorrect'
                })
            }
            else{
                const uid = results[0].uid;
                const create = (callback)=>{
                    const token = createToken();
                    conn.query('select * from token where token = ?', [token], (err, results, fields)=>{
                        if (err){
                            throw err;
                        }
                        if (results.length != 0){
                            create(callback);
                        }
                        else{
                            let date = new Date();
                            const start_time = date2timestamp(date);
                            date.setDate(date.getDate() + 10);
                            const end_time = date2timestamp(date);
                            conn.query('insert into token(uid, token, start_time, end_time) values(?, ?, ?, ?)'
                                , [uid, token, start_time, end_time]
                                , (err, results, fields)=>{
                                    if (err){
                                        throw err;
                                    }
                                    if (results.affectedRows == 1){
                                        if (callback){
                                            callback(token);
                                        }
                                    }
                                    else{
                                        res.json({
                                            status: 1,
                                            message: 'query database fail'
                                        })
                                    }
                                }
                            )
                        }
                    })
                }
                create((token)=>{
                    console.log(token);
                    res.json({
                        status: 0,
                        token: token
                    })
                    conn.end();
                })
            }
        })
    }
    catch(err){
        console.error(err);
        res.json({
            status: 1,
            message: 'query database fail'
        })
        conn.end();
    }
})

app.post(addition + '/user/find', (req, res)=>{
    if (!req.uid){
        res.json({
            status: -1,
            message: 'please login first'
        });
        return;
    }
    const uid = req.body.uid;
    const conn = mysql.createConnection(config.mysql);
    conn.query('select uid, username, email from user where uid = ?', [uid], (err, results, fields)=>{
        if (err){
            console.error(err);
            res.json({
                status: 1,
                message: 'query database fail',
            });
        }
        else{
            if (results.length == 0){
                res.json({
                    status: 1,
                    message: 'select from database fail',
                })
            }
            else{
                res.json({
                    status: 0,
                    user: results[0]
                })
            }
        }
        conn.end();
    })
})

app.post(addition + '/upload', upload.single('image'), (req, res)=>{
    if (req.file){
        res.json({
            status: 0,
            file: req.file.filename,
        })
    }
    else{
        res.json({
            status: 1,
            message: 'upload file fail',
        })
    }
})

app.post(addition + '/book/add', (req, res)=>{
    if (!req.uid){
        res.json({
            status: -1,
            message: 'please login first'
        });
        return;
    }
    const uid = req.uid;
    const name = req.body.name;
    const origin_price = req.body.origin;
    const price = req.body.price;
    const description = req.body.description;
    const cover = req.body.cover;
    const link = req.body.link;
    const conn = mysql.createConnection(config.mysql);
    try{
        conn.query('insert into book(name, origin_price, price, description, cover, link, uid, status) values(?, ?, ?, ?, ?, ?, ?, ?)'
            , [name, origin_price, price, description, cover, link, uid, 0]
            , (err, results, fielsd)=>{
                if (err){
                    throw err;
                }
                if (results.affectedRows == 1){
                    res.json({
                        status: 0,
                        bid: results.insertId,
                    })
                }
                else{
                    res.json({
                        status: 1,
                        message: 'insert into database fail',
                    })
                }
                conn.end();
            })
    }
    catch(err){
        console.error(err);
        res.json({
            status: 1,
            message: 'query database fail',
        });
        conn.end();
    }
})

app.post(addition + '/type/add', (req, res)=>{
    if (!req.uid){
        res.json({
            status: -1,
            message: 'please login first'
        });
        return;
    }
    const typename = req.body.typename;
    const conn = mysql.createConnection(config.mysql);
    try{
        conn.query('insert into type(typename) values(?)', [typename], (err, results, fields)=>{
            if (err){
                throw err;
            }
            if (results.affectedRows == 1){
                res.json({
                    status: 0,
                })
            }
            else{
                res.json({
                    status: 1,
                    message: 'insert into database fail'
                })
            }
            conn.end();
        })
    }
    catch(err){
        console.error(err);
        res.json({
            status: 1,
            message: 'query database fail',
        });
        conn.end();
    }
})

app.post(addition + '/type/list', (req, res)=>{
    if (!req.uid){
        res.json({
            status: -1,
            message: 'please login first'
        })
        return;
    }
    const conn = mysql.createConnection(config.mysql);
    conn.query('select tid, typename from type', (err, results, field)=>{
        if (err){
            console.error(err);
            res.json({
                status: 1,
                message: 'query database fail',
            });
        }
        else{
            res.json({
                status: 0,
                type: results
            });
        }
        conn.end();
    })
})

app.post(addition + '/type/search', (req, res)=>{
    if (!req.uid){
        res.json({
            status: -1,
            message: 'please login first'
        })
        return;
    }
    const tid = req.body.tid;
    const conn = mysql.createConnection(config.mysql);
    conn.query('select bid from booktype where tid = ?', [tid], (err, results, fields)=>{
        if (err){
            console.error(err);
            res.json({
                status: 1,
                message: 'query database fail',
            })
        }
        else{
            res.json({
                status: 0,
                bid: results
            })
        }
        conn.end();
    })
})

app.post(addition + '/book/list', (req, res)=>{
    if (!req.uid){
        res.json({
            status: -1,
            message: 'please login first'
        })
        return;
    }
    const bid = req.body.bid;
    const left = req.body.left;
    const right = req.body.right;
    let str = 'select * from book where bid > 0';
    let input = [];
    if (bid && bid.length > 0){
        str += ' and bid in (?';
        input.push(bid[0]);
        for (let i = 1; i < bid.length; ++i){
            input.push(bid[i]);
            str += ', ?'
        }
        str += ')';
    }
    if (left){
        str += ' and bid >= ?';
        input.push(left);
    }
    if (right){
        str += ' and bid < ?';
        input.push(right);
    }
    const conn = mysql.createConnection(config.mysql);
    conn.query(str, input, (err, results, fields)=>{
        if (err){
            console.error(err);
            res.json({
                status: 1,
                message: 'query database fail',
            })
        }
        else{
            res.json({
                status: 0,
                book: results
            });
        }
        conn.end();
    })
})

app.post(addition + '/book/buy', (req, res)=>{
    if (!req.uid){
        res.json({
            status: -1,
            message: 'please login first'
        })
        return;
    }
    const uid = req.uid;
    const bid = req.body.bid;
    let type = req.body.type;
    if (type != 2){
        type = 1;
    }
    const conn = mysql.createConnection(config.mysql);
    try{
        conn.query('select status from book where bid = ?', [bid], (err, results, fields)=>{
            if (err){
                throw err;
            }
            if (results.length == 0){
                res.json({
                    status: 1,
                    message: 'select bid from database fail'
                });
                conn.end();
                return;
            }
            const status = results[0].status;
            if (status != 0){
                res.json({
                    status: 1,
                    message: 'book has been sold'
                })
                conn.end();
                return;
            }
            conn.query('update book set status = ?, buyer = ? where bid = ? and status = 0', [type, uid, bid], (err, results, fields)=>{
                if (err){
                    throw err;
                }
                if (results.affectedRows == 0){
                    res.json({
                        status: 1,
                        message: 'update database fail'
                    })
                }
                else{
                    res.json({
                        status: 0,
                    })
                }
                conn.end();
            })
        })
    }
    catch(err){
        console.error(err);
        res.json({
            status: 1,
            message: 'query database fail'
        })
        conn.end();
    }
})

app.post(addition + '/booktype/add', (req, res)=>{
    if (!req.uid){
        res.json({
            status: -1,
            message: 'please login first'
        })
        return;
    }
    const bid = req.body.bid;
    const tid = req.body.tid;
    const conn = mysql.createConnection(config.mysql);
    conn.query('insert into booktype(bid, tid) values(?, ?)', [bid, tid], (err, results, fields)=>{
        if (err){
            console.error(err);
            res.json({
                status: 1,
                message: 'query database fail'
            });
        }
        else{
            if (results.affectedRows == 0){
                res.json({
                    status: 1,
                    message: 'insert into database fail',
                })
            }
            else{
                res.json({
                    status: 0,
                })
            }
        }
        conn.end();
    })
})

app.post(addition + '/message/send', (req, res)=>{
    if (!req.uid){
        res.json({
            status: -1,
            message: 'please login first'
        })
        return;
    }
    const from_uid = req.uid;
    const to_uid = req.body.to;
    const message = req.body.message;
    const conn = mysql.createConnection(config.mysql);
    conn.query('insert into message(from_uid, to_uid, message, status) values(?, ?, ?, 0)'
        , [from_uid, to_uid, message]
        , (err, results, fields)=>{
            if (err){
                console.error(err);
                res.json({
                    status: 1,
                    message: 'query database fail',
                })
            }
            else if (results.affectedRows == 0){
                res.json({
                    status: 1,
                    message: 'insert into database fail',
                })
            }
            else{
                res.json({
                    status: 0,
                })
            }
            conn.end();
        }
    )
})

app.post(addition + '/message/list', (req, res)=>{
    if (!req.uid){
        res.json({
            status: -1,
            message: 'please login first'
        })
        return;
    }
    const uid = req.uid;
    let mid = req.body.mid;
    if (mid == undefined){
        mid = 0;
    }
    const conn = mysql.createConnection(config.mysql);
    conn.query('select * from message where mid > ? and to_uid = ?'
        , [mid, uid]
        , (err, results, fields)=>{
            if (err){
                console.error(err);
                res.json({
                    status: 1,
                    message: 'query database fail'
                })
            }
            else{
                res.json({
                    status: 0,
                    message: results
                })
            }
            conn.end();
        }
    )
})

app.listen(port, (err)=>{
    if (!err){
        console.log('app start at ' + port + ' port');
    }
})
