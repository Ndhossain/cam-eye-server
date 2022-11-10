const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken')
require('dotenv').config();


const app = express();
const Port = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.cj5piaf.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function validateJwt (req, res, next) {
    if(!req.headers.authorization) {
        return res.status(401).send({message: 'Unauthorized Access'});
    }

    const token = req.headers.authorization.split(' ')[1];
    jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
        if(err) {
            return res.status(403).send({message: 'Access forbidden'});
        }
        req.decoded = decoded;
        next();
    })
}


async function run() {
    try {
        const db = client.db('cam-eye');
        // jwt for logged in user
        app.post('/jwt', (req, res) => {
            const data = req.body;
            if(!data?.uid){
                return res.status(403).send('forbidden');
            }
            const token = jwt.sign(data, process.env.SECRET_KEY, { expiresIn: '1h' })
            res.send({jwt: token});
        })
        // services
        const servcesCollection = db.collection('service');
        app.get('/services', async (req, res) => {
            const page = Number(req.query.page);
            const size = Number(req.query.size);
            const query = {};
            const count = await servcesCollection.countDocuments()
            const cursor = await servcesCollection.find(query).skip(size * page).limit(size).toArray();
            res.send({count, services: cursor});
        })
        app.get('/service-details/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const cursor = await servcesCollection.findOne(query);
            res.send(cursor)
        })
        app.post('/services', validateJwt, async (req, res) => {
            if(req.decoded.uid !== req.query.uid) {
                return res.status(403).send({message: 'Invalid Authorization'});
            }
            const data = req.body;
            const result = await servcesCollection.insertOne(data);
            res.send(result);
        })
        // review operations
        const reviewCollection = db.collection('reviews')
        app.post('/reviews', validateJwt, async (req, res) => {
            if(req.decoded.uid !== req.body.uid) {
                return res.status(403).send({message: 'Invalid Authorization'});
            }
            const data = {...req.body, date: new Date()};
            const result = await reviewCollection.insertOne(data);
            res.send(result);
        })
        app.get('/reviews/:id', async (req, res) => {
            const query = {serviceId: req.params.id};
            const cursor = await reviewCollection.find(query, {"sort" : [['date', -1]]}).toArray();
            res.send(cursor);
        })
        app.get('/my-review/:id', validateJwt, async (req, res) => {
            if(req.decoded.uid !== req.params.id) {
                return res.status(403).send({message: 'Invalid Authorization'});
            }
            const id = req.params.id;
            const query = {uid: id};
            const cursor = await reviewCollection.find(query, {"sort" : [['date', -1]]}).toArray();
            res.send(cursor);
        })
        app.delete('/reviews/:id', validateJwt, async (req, res) => {
            if(req.decoded.uid !== req.query.uid) {
                return res.status(403).send({message: 'Invalid Authorization'});
            }
            const query = { _id: ObjectId(req.params.id) };
            const result = await reviewCollection.deleteOne(query);
            res.send(result);
        })
        app.patch('/reviews/:id', validateJwt, async (req, res) => {
            if(req.decoded.uid !== req.query.uid) {
                return res.status(403).send({message: 'Invalid Authorization'});
            }
            const filter = { _id: ObjectId(req.params.id) };
            const updateDoc = {
                $set: {
                    review: req.body.review,
                },
            };
            const result = await reviewCollection.updateOne(filter, updateDoc);
            res.send(result);
        })
        // blogs
        const blogCollection = db.collection('blogs')
        app.get('/blogs', async (req, res) => {
            const query = {};
            const cursor = await blogCollection.find(query).toArray();
            res.send(cursor)
        })
        // contact message
        const contactMessageCollection = db.collection('contact-message')
        app.post('/contact-message', async (req, res) => {
            const data = req.body;
            const result = await contactMessageCollection.insertOne(data);
            res.send(result)
        })
    } catch (err) {
        console.log(err);
    }
}

run().catch(err => console.log(err));


app.get('/', (req, res) => {
    res.send('Cam eye server is running')
})

app.listen(Port, () => {
    client.connect(err => {
        if(err){
            console.log(err);
        };
        console.log('Database Connected');
    });
    console.log('Server is running on ', Port)
})
