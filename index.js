const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;

// middlewares
app.use(cors());
app.use(express.json());



// server run 
app.get('/', (req, res) =>{
    res.send('Sport Zone is running...')
})

app.listen(port, ()=> {
    console.log(`listening on port ${port}`)
});