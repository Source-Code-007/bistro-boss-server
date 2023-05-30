const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
var jwt = require('jsonwebtoken');
const cors = require('cors');
const app = express()
require("dotenv").config();
const port = process.env.PORT || 2500

// middleware
app.use(cors())
app.use(express.json())

app.get(('/'), (req, res) => {
  res.send('bistro boss server is perfectly running')
})



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.iw4kl2c.mongodb.net/?retryWrites=true&w=majority`;

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
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    const bistroBossDB = client.db('bistro-boss')
    const menuCollection = bistroBossDB.collection('menu-collection')
    const cartItemCollection = bistroBossDB.collection('cart-item-collection')
    const usersCollection = bistroBossDB.collection('users-collection')

    // Get all menu
    app.get('/menu-collection', async (req, res) => {
      const result = await menuCollection.find({}).toArray()
      res.send(result)
    })

    // get cart item for specific user via email
    app.get('/cart-item', async (req, res) => {
      if (!req.query?.email) {
        return res.send([])
      }
      const find = { email: req.query.email }
      const result = await cartItemCollection.find(find).toArray()
      res.send(result)
    })

    // add users
    app.post('/users', async (req, res) => {
      const user = req.body
      const result = await usersCollection.insertOne(user)
      res.send(result)
    })

    // get users
    app.get('/users', async (req, res) => {
      const result = await usersCollection.find().toArray()
      res.send(result)
    })

    // add JWT 
    app.post('/jwt', async (req, res) => {
      const {user} = req.body
      const token = jwt.sign({
        data: user
      }, process.env.JWT_SECRET_KEY);
      res.send({token})
    })

    // add to cart route
    app.post('/cart-item', async (req, res) => {
      const item = req.body
      item.itemId = item._id
      delete item._id

      const find = { email: req.query?.email, itemId: item.itemId }
      const existingItem = await cartItemCollection.findOne(find)

      if (existingItem) {
        const options = { upsert: true }
        const updatedItem = {
          $set: {
            ...existingItem, quantity: existingItem.quantity += 1
          },
        };
        const result = await cartItemCollection.updateOne(find, updatedItem, options)
        res.send(result)
      } else {
        item.quantity = 1
        const result = await cartItemCollection.insertOne(item)
        res.send(result)
      }
    })

    // delete item from cart
    app.delete(`/cart-item/:id`, async (req, res) => {
      const uniqueId = req.params.id
      const find = { _id: new ObjectId(uniqueId) }
      const result = await cartItemCollection.deleteOne(find)
      res.send(result)
    })


  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.listen(port, () => {
  console.log('bistro boss server is running successfully!');
})