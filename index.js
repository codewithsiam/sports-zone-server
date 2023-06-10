const express = require("express");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const jwt = require('jsonwebtoken');
require("dotenv").config();
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
const port = process.env.PORT || 5000;

// middlewares
app.use(cors());
app.use(express.json());

// verify jwt token
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
  // bearer token
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}


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

    // collections --------------------------------------------
    const userCollections = await client.db("sportsZone").collection("users");
    const paymentCollection = await client
      .db("sportsZone")
      .collection("payments");
    const classCollections = await client
      .db("sportsZone")
      .collection("classes");
    const selectedClassCollection = await client
      .db("sportsZone")
      .collection("selectedClasses");

      // jwt post -------------------------------------------------------
      app.post('/jwt', (req, res) => {
        // todo: env file is posting on github. 
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
  
        res.send({ token })
      })

      // verufy admin -------------------------------------------
      const verifyAdmin = async (req, res, next) => {
        const email = req.decoded.email;
        const query = { email: email }
        const user = await userCollections.findOne(query);
        if (user?.role !== 'admin') {
          return res.status(403).send({ error: true, message: 'forbidden message' });
        }
        next();
      }
      // verufy instructor 
      const verifyInstructor = async (req, res, next) => {
        const email = req.decoded.email;
        const query = { email: email }
        const user = await userCollections.findOne(query);
        if (user?.role !== 'instructor') {
          return res.status(403).send({ error: true, message: 'forbidden message' });
        }
        next();
      }

    // users operations ---------------------------------------------
    app.get("/users", verifyJWT, async (req, res) => {
      const sort = { createdAt: -1 };
      const result = await userCollections.find().sort(sort).toArray();
      res.send(result);
    });
 
    // is admin 
    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        return res.send({ admin: false })
      }

      const query = { email: email }
      const user = await userCollections.findOne(query);
      const result = { admin: user?.role === 'admin' }
      res.send(result);
    })
  
    // is instructor 
    app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        return res.send({ instructor: false })
      }

      const query = { email: email }
      const user = await userCollections.findOne(query);
      const result = { instructor: user?.role === 'instructor' }
      res.send(result);
    })

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
    app.get("/users/instructors", async (req, res) => {
      const filter = { role: "instructor" };
      const result = await userCollections.find(filter).toArray();
      res.send(result);
    });

    // classes operations =========================================================
    app.get("/classes", async (req, res) => {
      const sort = { createdAt: -1 };
      const result = await classCollections.find().sort(sort).toArray();
      res.send(result);
    });

    app.get("/classes/top", async (req, res) => {
      const sort = { totalEnrolled: -1 };
      const filter = { status: "approved" };
      const result = await classCollections.find(filter).sort(sort).limit(6).toArray();
      res.send(result);
    });

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
      // const query = {_id: id};
      const query = { _id: new ObjectId(id) };
      const result = await selectedClassCollection.deleteOne(query);
      res.send(result);
    });

    // payment methods stripe----------------------------------------------------------------
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const filter = { _id: new ObjectId(payment.classId) };
      const oldClass = await classCollections.findOne(filter);

      const newSeat = parseFloat(oldClass?.availableSeats) - 1;
      const newTotalEnrolled = parseFloat(oldClass?.totalEnrolled) + 1;

      const updateDoc = {
        $set: {
          availableSeats: `${newSeat}`,
          totalEnrolled: `${newTotalEnrolled}`,
        },
      };
      const updateResult = await classCollections.updateOne(filter, updateDoc);

      const postResult = await paymentCollection.insertOne(payment);
      res.send({ postResult, updateResult });
    });

    app.get("/payments/history", async (req, res) => {
      const email = req.query.email;
      const result = await paymentCollection.find().toArray();
      res.send(result);
    });
    app.get("/payments/enrolled/student", async (req, res) => {
      const email = req.query.email;
      const filter = { studentEmail: email };
      const result = await paymentCollection.find(filter).toArray();
      res.send(result);
    });
    app.get("/payments/enrolled/instructor", async (req, res) => {
      const email = req.query.email;
      const filter = { instructorEmail: email };
      const result = await classCollections.find(filter).toArray();
      res.send(result);
    });

    //get top instructor 
    app.get("/instructors/popular", async (req, res) => {
      try {
        const instructors = await classCollections.aggregate([
          {
            $group: {
              _id: "$instructorEmail",
              count: { $sum: 1 },
              instructorPhoto: { $first: "$instructorPhoto" },
              instructorName: { $first: "$instructorName" },
              instructorEmail: { $first: "$instructorEmail" },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 6 }, 
          {
            $project: {
              _id: 0,
              instructorPhoto: 1,
              instructorName: 1,
              instructorEmail: 1,
              count: 1,
            },
          },
        ]).toArray();
    
        res.json(instructors);
      } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
      }
    });
    
    

    

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
