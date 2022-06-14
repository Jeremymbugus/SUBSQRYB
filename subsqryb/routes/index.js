var express = require('express');
const Stripe = require("../src/connect/stripe");
var router = express.Router();
var session = require('express-session')
var UserService = require('../src/user')
var session = require('express-session')
var MemoryStore = require('memorystore')(session)
var productToPriceMap = {
    BASIC: 'price_1LAUIHGcTohqT9qay5ShZf4d',
    PRO: 'price_1LAUK8GcTohqT9qaThRmydan'
}
/* GET home page. */
router.get('/', function (req, res) {
    res.render('login', {title: 'Subsqrb'});
    //res.status(200).render('login.ejs')
});

//storing users data in session
router.use(session({
    saveUninitialized: false,
    cookie: { maxAge: 86400000 },
    store: new MemoryStore({
        checkPeriod: 86400000
    }),
    resave: false,
    secret: 'keyboard cat'
}))

router.post('/login', async (req, res) => {
    try{
        const { email }  = req.body
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
                    `A new user signed up and added to DB. The ID for ${email} is ${JSON.stringify(
                        customerInfo
                    )}`
                )

                console.log(`User also added to DB. Information from DB: ${customer}`)
            } catch (e) {
                console.log(e)
                res.redirect('/')
               // res.status(200).json({ e })
                return
            }
        }
        //console.log("email", email)
        req.session.email = email
        res.redirect('/account')
    }catch (e) {
        console.log(e)
        res.redirect('/')
        //res.status(200).json({ e })
        return
    }

})

router.get('/account', async function (req, res) {
    const { email } = req.session
    console.log('email' ,email)
    const customer = await UserService.getUserByEmail(email)
    console.log('jereny');
    console.log(customer)
    if (!customer) {
        res.redirect('/')
    } else {
        res.render('account.ejs', { customer })
    }


})

router.post('/checkout', async (req, res) => {
    const { customerID, product } = req.body

    const price = productToPriceMap[product.toUpperCase()]
    const session = await Stripe.createCheckoutSession(customerID, price)

    res.send({ sessionId: session.id })
})

router.get('/success', (req, res) => {
    res.send('Payment successful')
})

router.get('/failed', (req, res) => {
    res.send('Payment failed')
})

router.post('/webhook', async (req, res) => {
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


module.exports = router;
