const express = require("express");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
require("dotenv").config();
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
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
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // collections
    const userCollections = await client.db("sportsZone").collection("users");
    const paymentCollections = await client.db("sportsZone").collection("payments");
    const classCollections = await client
      .db("sportsZone")
      .collection("classes");
    const enrolledClassCollections = await client
      .db("sportsZone")
      .collection("enrolledClasses");
    const selectedClassCollection = await client
      .db("sportsZone")
      .collection("selectedClasses");

    // users operations
    app.get("/users", async (req, res) => {
      const sort = { createdAt: -1 };
      const result = await userCollections.find().sort(sort).toArray();
      res.send(result);
    });

    app.delete("/users", async (req, res) => {
      const id = req.query.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollections.deleteOne(query);
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollections.findOne(query);
      console.log(existingUser, user.email);
      if (existingUser) {
        return res.send({ message: "User already exists" });
      } else {
        const result = await userCollections.insertOne(user);
        res.send(result);
      }
    });

    app.patch("/users/role", async (req, res) => {
      const id = req.query.id;
      const role = req.query.role;
      console.log(id, role);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: `${role}`,
        },
      };

      const result = await userCollections.updateOne(filter, updateDoc);
      res.send(result);
    });
    // instructor api
    app.get("/users/instructor", async (req, res) => {
      const filter = { role: "instructor" };
      const result = await userCollections.find(filter).toArray();
      res.send(result);
    });

    // classes operations
    app.get("/classes/approved", async (req, res) => {
      const filter = { status: "approved" };
      const sort = { createdAt: -1 };
      const result = await classCollections.find(filter).sort(sort).toArray();
      res.send(result);
    });
    app.get("/classes/denied", async (req, res) => {
      const filter = { status: "denied" };
      const sort = { createdAt: -1 };
      const result = await classCollections.find(filter).sort(sort).toArray();
      res.send(result);
    });

    app.get("/classes", async (req, res) => {
      const sort = { createdAt: -1 };
      const result = await classCollections.find().sort(sort).toArray();
      res.send(result);
    });

    app.post("/classes", async (req, res) => {
      const classData = req.body;
      const result = await classCollections.insertOne(classData);
      res.send(result);
    });

    app.patch("/classes/status", async (req, res) => {
      const id = req.query.id;
      const status = req.query.status;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: `${status}`,
        },
      };

      const result = await classCollections.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.patch("/classes/feedback", async (req, res) => {
      const id = req.query.id;
      const feedback = req.query.feedback;
      console.log(id, feedback);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          feedback: `${feedback}`,
        },
      };
      const result = await classCollections.updateOne(filter, updateDoc);
      res.send(result);
    });

    // my selected classes
    app.get("/classes/selected", async (req, res) => {
      const result = await selectedClassCollection.find().toArray();
      res.send(result);
    });

    app.post("/classes/selected", async (req, res) => {
      const classData = req.body;
      const result = await selectedClassCollection.insertOne(classData);
      res.send(result);
    });

    app.delete("/classes/selected", async (req, res) => {
      const id = req.query.id;
      const email = req.query.email;
      console.log(id, email);
      // const query = {_id: id};
      const query = { _id: new ObjectId(id) };
      const result = await selectedClassCollection.deleteOne(query);
      res.send(result);
    });

    // payment methods stripe 
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })



    

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// server run
app.get("/", (req, res) => {
  res.send("Sport Zone is running...");
});

app.listen(port, () => {
  console.log(`listening on port ${port}`);
});
