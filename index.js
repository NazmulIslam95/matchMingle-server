const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.8ww6tl6.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        await client.connect();

        const biodatasCollection = client.db('matchMingle').collection('biodatas');
        const usersCollection = client.db('matchMingle').collection('users');
        const favoriteBiodatasCollection = client.db('matchMingle').collection('favoriteBiodatas');

        // JWT related API
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token });
        });

        // Middleware for token verification
        const verifyToken = (req, res, next) => {
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'Forbidden Access' });
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'Forbidden Access' });
                }
                req.decoded = decoded;
                next();
            });
        };

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'admin') {
                return res.status(403).send({ message: 'Forbidden Access' });
            }
            next();
        };

        // Biodata related API
        app.get('/biodatas', async (req, res) => {
            const result = await biodatasCollection.find().toArray();
            res.send(result);
        });



        // Route to get biodata by ID
        app.get('/biodata/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await biodatasCollection.findOne(query);
            res.send(result);
        });

        // Route to get biodata by email
        app.get('/biodataByEmail/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const result = await biodatasCollection.findOne(query);
            if (!result) {
                return res.status(404).send({ error: 'Biodata not found' });
            }
            res.send(result);
        });

        app.post('/biodatas', async (req, res) => {
            try {
                const biodata = req.body;
                const query = { email: biodata.email };
                const existingUser = await biodatasCollection.findOne(query);

                if (existingUser) {
                    const result = await biodatasCollection.updateOne(query, { $set: biodata });
                    return res.send({ message: "Biodata updated successfully", modifiedCount: result.modifiedCount });
                } else {
                    const maxBiodata = await biodatasCollection.findOne({}, { sort: { biodataId: -1 } });
                    let newBiodataId = "1";
                    if (maxBiodata && maxBiodata.biodataId != null) {
                        const currentBiodataId = parseInt(maxBiodata.biodataId);
                        newBiodataId = (currentBiodataId + 1).toString();
                    }
                    biodata.biodataId = newBiodataId;
                    const insertResult = await biodatasCollection.insertOne(biodata);
                    res.send({ message: "Biodata inserted successfully", insertedId: insertResult.insertedId });
                }
            } catch (error) {
                console.error("Error processing biodata:", error);
                res.status(500).send({ message: "Internal Server Error" });
            }
        });

        // User related API

        app.get('/users', async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result);
        });

        app.get('/users/admin/:email', verifyToken, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'Unauthorized Access' });
            }
            const query = { email };
            const user = await usersCollection.findOne(query);
            const admin = user?.role === 'admin';
            res.send({ admin });
        });

        app.get('/users/premium/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'Unauthorized Access' });
            }
            const query = { email };
            const user = await usersCollection.findOne(query);
            const premium = user?.subscription === 'premium';
            res.send({ premium });
        });

        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email };
            const existingUser = await usersCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: "User already exists", insertedId: null });
            }
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        app.patch('/users/pending/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updatedDoc = {
                $set: {
                    subscription: 'pending'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })

        app.patch('/users/premium/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    subscription: 'premium'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })

        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })

        app.patch('/users/premium/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    subscription: 'premium'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })

        // Favorite biodatas API
        app.get('/favoriteBiodatas', async (req, res) => {
            const email = req.query.email;
            const query = { email };
            const result = await favoriteBiodatasCollection.find(query).toArray();
            res.send(result);
        });

        app.delete('/favoriteBiodatas/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await favoriteBiodatasCollection.deleteOne(query);
            res.send(result);
        });

        app.post('/favoriteBiodatas', async (req, res) => {
            const favBiodata = req.body;
            try {
                const existingBiodata = await favoriteBiodatasCollection.findOne({ name: favBiodata.name, email: favBiodata.email });
                if (existingBiodata) {
                    return res.status(400).send({ error: 'Favorite biodata with the same name and email already exists' });
                }
                const result = await favoriteBiodatasCollection.insertOne(favBiodata);
                res.send(result);
            } catch (err) {
                res.status(500).send({ error: 'Failed to insert data' });
            }
        });
    } finally {
        // Ensure that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('MatchMingle Is Running');
});

app.listen(port, () => {
    console.log(`MatchMingle Is Running On port ${port}`);
});
