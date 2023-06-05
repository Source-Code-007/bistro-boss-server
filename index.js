require("dotenv").config();
const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
var jwt = require('jsonwebtoken');
const jwtVerify = require('./middleware/jwtVerify') // middleware to verify jwt
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const cors = require('cors');
const app = express()
const port = process.env.PORT || 2500

// middleware
app.use(cors())
app.use(express.json())

app.get(('/'), (req, res) => {
  res.send('bistro boss server is perfectly running')
})



// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.iw4kl2c.mongodb.net/?retryWrites=true&w=majority`;
const uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@ac-sdycgbe-shard-00-00.iw4kl2c.mongodb.net:27017,ac-sdycgbe-shard-00-01.iw4kl2c.mongodb.net:27017,ac-sdycgbe-shard-00-02.iw4kl2c.mongodb.net:27017/?ssl=true&replicaSet=atlas-12xt4i-shard-0&authSource=admin&retryWrites=true&w=majority`

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
    const paymentCollection = bistroBossDB.collection('payment-collection')


    // admin verify middleware
    const adminVerify = async (req, res, next) => {
      const email = req.decoded.email
      const user = await usersCollection.findOne({ email: email })
      let isAdmin = user?.role === 'admin'
      if (isAdmin) {
        next()
      } else {
        return res.status(403).send({ message: 'unauthorized status' })
      }
    }

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

    // for check admin or not
    app.get('/isAdmin', async (req, res) => {
      const { email } = req.query
      const user = await usersCollection.findOne({ email: email })
      let isAdmin = user?.role === 'admin'
      if (isAdmin) {
        res.send({ isAdmin: true })
      } else {
        res.send({ isAdmin: false })
      }
    })

    // add users (when user signin then this route hit)
    app.post('/users', async (req, res) => {
      const user = req.body
      const result = await usersCollection.insertOne(user)
      res.send(result)
    })

    // get all users
    app.get('/users', jwtVerify, adminVerify, async (req, res) => {
      const result = await usersCollection.find().toArray()
      res.send(result)
    })

    // delete single user via id
    app.delete('/users/:id', jwtVerify, async (req, res) => {
      const id = req.params.id
      const find = { _id: new ObjectId(id) }
      const result = await usersCollection.deleteOne(find)
      res.send(result)
    })

    // add JWT 
    app.post('/jwt', async (req, res) => {
      const { email } = req.body
      const token = jwt.sign({
        email: email
      }, process.env.JWT_SECRET_KEY);
      res.send({ token })
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

    // reset specific user cart after successful payment
    app.delete('/cart-reset', jwtVerify, async(req,res)=>{
      const {email} = req.body
      console.log(req.body);
      const result = await cartItemCollection.deleteMany({email})
      res.send(result)
    })



    // stored payment information in database
    app.post('/payment-info', jwtVerify, async (req, res) => {
      const { paymentInfo } = req.body
      const result = await paymentCollection.insertOne(paymentInfo)
      res.send(result)
    })

    // get payment info from database
    app.get('/payment-info', jwtVerify, async(req,res)=>{
      const {email} = req.query
      const find = {email: email}
      const result = await paymentCollection.find(find).toArray()
      res.send(result)
    })

    // make payment route for stripe
    app.post("/create-payment-intent", jwtVerify, async (req, res) => {
      const { price } = req.body;
      const amount = parseFloat(price) * 100

      // Create a PaymentIntent with the order amount and currency 
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    });


  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.listen(port, () => {
  console.log('bistro boss server is running successfully!');
})