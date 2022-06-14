var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');



var routes = require('./routes/index');
var users = require('./routes/users');

var Stripe = require('./src/connect/stripe')
var session = require('express-session')
var MemoryStore = require('memorystore')(session)
var mongoose = require('mongoose')
const UserService = require('./src/user')


const productToPriceMap = {
    BASIC: 'price_1LAUIHGcTohqT9qay5ShZf4d',
    PRO: 'price_1LAUK8GcTohqT9qaThRmydan'
}

var app = express();




// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(favicon());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);
app.use("/webhook", bodyParser.raw({ type: "application/json" }))

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }))

//storing users data in session
app.use(session({
    saveUninitialized: false,
    cookie: { maxAge: 86400000 },
    store: new MemoryStore({
        checkPeriod: 86400000
    }),
    resave: false,
    secret: 'keyboard cat'
}))

app.post('/login', async (req, res) => {
    const { email } = req.body
    console.log("email", email)

  let customer = await UserService.getUserByEmail(email)
    let customerInfo = {}

  if (!customer) {
      console.log(`email ${email} does not exist. Making one.`)
      try {
          customerInfo = await Stripe.addNewCustomer(email)

      customer = await UserService.addUser({
          email: customerInfo.email,
          billingID: customerInfo.id,
          hasTrial: false,
          plan: "none",
          endDate: null
      })

      console.log(
          `A new user signed up and addded to DB. The ID for ${email} is ${JSON.stringify(
              customerInfo
          )}`
      )

      console.log(`User also added to DB. Information from DB: ${customer}`)
      } catch (e) {
          console.log(e)
          res.status(200).json({ e })
          return
      }
  }

  req.session.email = email
    res.redirect('/account')
})

app.get('/account', async function (req, res) {
    const { email } = req.session
    const customer = await UserService.getUserByEmail(email)

    if (!customer) {
        res.redirect('/')
    } else {
        res.render('account.ejs', { customer })
    }

})

app.post('/checkout', async (req, res) => {
    const { customerID, product } = req.body

  const price = productToPriceMap[product.toUpperCase()]
    const session = await Stripe.createCheckoutSession(customerID, price)

  res.send({ sessionId: session.id })
})

app.get('/success', (req, res) => {
    res.send('Payment successful')
})

app.get('/failed', (req, res) => {
    res.send('Payment failed')
})

app.post('/webhook', async (req, res) => {
    let event

  try {
      event = Stripe.createWebhook(req.body, req.header('Stripe-Signature'))
  } catch (err) {
      console.log(err)
      return res.sendStatus(400)
  }

  const data = event.data.object
    console.log(event.type, data)

  res.sendStatus(200)
})


/// catch 404 and forwarding to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

const db = 'mongodb://localhost:27017/users'
mongoose.connect(
    db,
    {
        useUnifiedTopology: true,
        useNewUrlParser: true,
        useFindAndModify: false,
        useCreateIndex: true
    },
    (error) => {
        if (error) console.log(error)
    }
)




module.exports = app;
