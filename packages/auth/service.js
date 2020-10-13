const express = require('express')
const opentracing = require('opentracing')
const {initTracer} = require('jaeger-client')

const port = process.env.PORT || 80
const app = express()

//set up our tracer
const config = {
  serviceName: 'auth',
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
    'auth.version': '1.0.0'
  }
};
const tracer = initTracer(config, options);

//simulate our auth service being flaky with a 20% chance of 500 internal server error
app.get('/auth', (req, res) => {
    const parentSpan = tracer.extract(opentracing.FORMAT_HTTP_HEADERS, req.headers)

    const span = tracer.startSpan("checking user", {
        childOf: parentSpan,
        tags: {
            [opentracing.Tags.COMPONENT]: "database"
        }
    })

    if (Math.random() > 0.2) {
        span.finish()
        res.json({valid: true, userId: 123})
    } else {
        span.setTag(opentracing.Tags.ERROR, true)
        span.finish()
        res.status(500).send("Internal Auth Service error")
    }
})

app.listen(port, () => console.log(`Auth app listening on port ${port}`))