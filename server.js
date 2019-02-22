const express = require('express');
const app = express();
const bodyParser = require('body-parser');

const cors = require('cors');
require('./action');
app.use(cors());
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());
app.post('/',async (req,res)=>{
    let config = require('./config');
    res.send(config)
});
app.post('/run',async (req,res)=>{
    let config = require('./config');
    config.group_GET = req.body.group_GET;
    config.group_UPPOST = req.body.group_UPPOST;
    config.cookie = req.body.cookie;
    config.time = req.body.time;
    res.send(true);
});

app.listen(8080);
