const express = require('express');
const jwt = require('jsonwebtoken');
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
        const usersCollection = client.db('matchMingle').collection('users')
        const favoriteBiodatasCollection = client.db('matchMingle').collection('favoriteBiodatas')



        // jwt related API
        app.post('/jwt', async (req, res) => {
            const user = req.body
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ token })
        })

        // middlewares
        const verifyToken = (req, res, next) => {
            // console.log('inside verify token', req.headers.authorization);
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'forbidden Access' })
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'forbidden Access' })
                }
                req.decoded = decoded;
                next();
            })
        }

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            const isAdmin = user?.role === 'admin'
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next()
        }


        //biodata related API//

        app.get('/biodatas', async (req, res) => {
            const result = await biodatasCollection.find().toArray()
            res.send(result)
        })

        app.get('/biodatas/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await biodatasCollection.findOne(query)
            res.send(result)
        })

        app.post('/biodatas', async (req, res) => {
            const biodata = req.body
            const query = { email: biodata.email }
            const existingUser = await biodatasCollection.findOne(query)
            if (existingUser) {
                return res.send({ message: "user already exists", insertedId: null })
            }
            const result = await biodatasCollection.insertOne(user)
            res.send(result)
        })

        //user related API//

        app.get('/users/admin/:email', verifyToken, verifyAdmin, async (req, res) => {
            const email = req.params.email
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'unauthorized access' })
            }
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            let admin = false
            if (user) {
                admin = user?.role === 'admin'
            }
            res.send({ admin })
        })

        app.get('/users/premium/:email', verifyToken, async (req, res) => {
            const email = req.params.email
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'unauthorized access' })
            }
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            let premium = false
            if (user) {
                premium = user?.subscription === 'premium'
            }
            res.send({ premium })
        })

        app.post('/users', async (req, res) => {
            const user = req.body
            const query = { email: user.email }
            const existingUser = await usersCollection.findOne(query)
            if (existingUser) {
                return res.send({ message: "user already exists", insertedId: null })
            }
            const result = await usersCollection.insertOne(user)
            res.send(result)
        })


        app.get('/favoriteBiodatas', async (req, res) => {
            const email = req.query.email
            const query = { email: email }
            const result = await favoriteBiodatasCollection.find(query).toArray()
            res.send(result)
        })

        app.delete('/favoriteBiodatas/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await favoriteBiodatasCollection.deleteOne(query)
            res.send(result)
        })

        app.post('/favoriteBiodatas', async (req, res) => {
            const favBiodata = req.body;
            try {
                const existingBiodata = await favoriteBiodatasCollection.findOne({ name: favBiodata.name, email: favBiodata.email });
                if (existingBiodata) {
                    return res.status(400).send({ error: 'Favorite biodata with the same name and email already exists' });
                }
                const result = await favoriteBiodatasCollection.insertOne(favBiodata);
                res.send(result);
            }
            catch (err) {
                res.status(500).send({ error: 'Failed to insert data' });
            }
        });



        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
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