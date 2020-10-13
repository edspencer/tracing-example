const express = require('express')
const superagent = require('superagent')
const opentracing = require('opentracing')
const {initTracer} = require('jaeger-client')

const port = process.env.PORT || 80
const authHost = process.env.AUTH_HOST || "auth"
const ordersHost = process.env.ORDERS_HOST || "orders"

const app = express()

//set up our tracer
const config = {
  serviceName: 'gateway',
  reporter: {
    logSpans: true,
    collectorEndpoint: 'http://jaeger:14268/api/traces',
  },
  sampler: {
    type: 'const',
    param: 1
  }
};
const options = {
  tags: {
    'gateway.version': '1.0.0'
  }
};
const tracer = initTracer(config, options);

//create a root span for every request
app.use((req, res, next) => {
    req.rootSpan = tracer.startSpan(req.originalUrl)
    tracer.inject(req.rootSpan, "http_headers", req.headers)

    res.on("finish", () => {
        req.rootSpan.finish()
    })

    next()
})

//use the auth service to see if the request is authenticated
const checkAuth = async (req, res, next) => {
    const span = tracer.startSpan("check auth", {
        childOf: tracer.extract(opentracing.FORMAT_HTTP_HEADERS, req.headers)
    })

    try {
        const headers = {}
        tracer.inject(span, "http_headers", headers)
        const res = await superagent.get(`http://${authHost}/auth`).set(headers)

        if (res && res.body.valid) {
            span.setTag(opentracing.Tags.HTTP_STATUS_CODE, 200)
            span.finish()
            next()
        } else {
            span.setTag(opentracing.Tags.HTTP_STATUS_CODE, 401)
            span.finish()
            res.status(401).send("Unauthorized")
        }
    } catch(e) {
        res.status(503).send("Auth Service gave an error")
    }
}

//proxy to the Orders service to return Order details
app.all('/orders/:orderId', checkAuth, async (req, res) => {
    const span = tracer.startSpan("get order details", {
        childOf: tracer.extract(opentracing.FORMAT_HTTP_HEADERS, req.headers)
    })

    try {
        const headers = {}
        tracer.inject(span, "http_headers", headers)
        const order = await superagent.get(`http://${ordersHost}/order/${req.params.orderId}`).set(headers)

        if (order && order.body) {
            span.finish()
            res.json(order.body)
        } else {
            span.setTag(opentracing.Tags.HTTP_STATUS_CODE, 200)
            span.finish()
            res.status(500).send("Could not fetch order")
        }
    } catch(e) {
        res.status(503).send("Error contacting Orders service")
    }
})

app.listen(port, () => console.log(`API Gateway app listening on port ${port}`))