const express = require('express')
const superagent = require('superagent')
const opentracing = require('opentracing')
const {initTracer} = require('jaeger-client')

const port = process.env.PORT || 80
const shippingHost = process.env.SHIPPING_HOST || "shipping"
const app = express()

//set up our tracer
const config = {
  serviceName: 'orders',
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
    'orders.version': '1.0.0'
  }
};
const tracer = initTracer(config, options);

app.get('/order/:orderId', async (req, res) => {
    const parentSpan = tracer.extract(opentracing.FORMAT_HTTP_HEADERS, req.headers)

    const span = tracer.startSpan("fetching order from database", {
        childOf: parentSpan,
        tags: {
            [opentracing.Tags.COMPONENT]: "database"
        }
    })

    let status = "unknown"

    //grab 
    try {
        const headers = {}
        tracer.inject(span, "http_headers", headers)
        const res = await superagent.get(`http://${shippingHost}/order/${req.params.orderId}/status`).set(headers)

        if (res && res.body) {
            status = res.body.status
        }
    } catch(e) {
        status = "error fetching shipping status"
    }

    res.json({
        id: req.params.orderId,
        status,
        totalPrice: 100
    })

    span.finish()
})

app.listen(port, () => console.log(`Orders app listening on port ${port}`))