const express = require('express')
const opentracing = require('opentracing')
const {initTracer} = require('jaeger-client')

const port = process.env.PORT || 80
const app = express()

//set up our tracer
const config = {
  serviceName: 'shipping',
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
    'shipping.version': '3.1.2'
  }
};
const tracer = initTracer(config, options);

app.get('/order/:orderId/status', (req, res) => {
    const parentSpan = tracer.extract(opentracing.FORMAT_HTTP_HEADERS, req.headers)

    const span = tracer.startSpan("fetching shipping info from USPS", {
        childOf: parentSpan,
        tags: {
            [opentracing.Tags.COMPONENT]: "shipping"
        }
    })

    if (Math.random() > 0.3) {
      res.json({
        status: "delivered"
      })
    } else {
      span.setTag(opentracing.Tags.ERROR, true)
      res.status(503).send("External Shipping API unavailable")
    }

    span.finish()
})

app.listen(port, () => console.log(`Orders app listening on port ${port}`))