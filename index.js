const express = require('express');
// const jwt = require('jsonwebtoken');
const app = express()
const cors = require('cors');
require('dotenv').config()
const port = process.env.PORT || 5000;

// const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)

// middleware
app.use(cors())
app.use(express.json())

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.8ww6tl6.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
    // Create a MongoClient with a MongoClientOptions object to set the Stable API version
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const biodatasCollection = client.db('matchMingle').collection('biodatas')



        app.get('/biodatas', async (req, res) => {
            const result = await biodatasCollection.find().toArray()
            res.send(result)
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

app.get('/', (req, res) => {
    res.send('MatchMingle Is Running')
})

app.listen(port, () => {
    console.log(`MatchMingle Is Running On port ${port}`);
})