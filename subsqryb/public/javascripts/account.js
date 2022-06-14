$(document).ready(function () {

    const PUBLISHABLE_KEY = 'pk_test_xxx'

    const stripe = Stripe(
        PUBLISHABLE_KEY)
    const checkoutButton = $('#checkout-button')

    checkoutButton.click(function () {
        const product = $('input[name="product"]:checked').val()

        fetch('/checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                product,
                customerID: customer.billingID
            })
        })
            .then((result) => result.json())
            .then(({ sessionId }) => stripe.redirectToCheckout({ sessionId }))
    })
})
