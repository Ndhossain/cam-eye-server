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
            console.log(page, size);
            const query = {};
            const count = await servcesCollection.countDocuments()
            const cursor = await servcesCollection.find(query).skip(size * page).limit(size).toArray();
            res.send({count, services: cursor});
        })
        app.get('/service-details/:id', async (req, res) => {
            console.log(req.params)
            const query = { _id: ObjectId(req.params.id) };
            const cursor = await servcesCollection.findOne(query);
            res.send(cursor || {})
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
