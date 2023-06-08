const express = require('express');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;

// middlewares
app.use(cors());
app.use(express.json());

//mongodb connection 


// const uri = "mongodb://0.0.0.0:27017";

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qgjgqwg.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // collections 
    const userCollections = await client.db("sportsZone").collection("users");
    const classCollections = await client.db("sportsZone").collection("classes");


    // users operations
    app.get('/users', async (req, res) => {
      const result = await userCollections.find().toArray();
      res.send(result);
    })
    app.post('/users', async(req, res) => {
        const user = req.body;
        const query = { user: user.email };
        const existingUser = await userCollections.findOne(query);

        if(existingUser) {
            return res.send({message: "User already exists"})
        }
        const result = await userCollections.insertOne(user);
        res.send(result);
    })

    app.patch('/users/role', async (req, res) => {
      const id = req.query.id;
      const role = req.query.role;
      console.log(id, role);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: `${role}`
        },
      };

      const result = await userCollections.updateOne(filter, updateDoc);
      res.send(result);

    })

    // classes operations
    app.get('/classes', async (req, res) => {
      const result = await classCollections.find().toArray();
      res.send(result);
    })




    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


// server run 
app.get('/', (req, res) =>{
    res.send('Sport Zone is running...')
})

app.listen(port, ()=> {
    console.log(`listening on port ${port}`)
});