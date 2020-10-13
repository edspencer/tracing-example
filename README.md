# Node JS Distributed Tracing Example

This repo was created in service of the October 2020 blog post at https://edspencer.net/2020/10/13/distributed-tracing-with-node-js/ - see that post for a lot more information about what's going on here.

This is an example of how to use distributing tracing to instrument Node JS applications. It contains 4 very simple dummy services:

* Gateway
* Auth
* Orders
* Shipping

Requests traverse the services by first hitting the Gateway, are checked against the Auth service, and are then passed on to the Orders and Shipping services. At each step we trace the request using the Jaeger Client module.

To run the applications, just clone this repo and run:

```docker-compose up```

Then navigate to http://localhost:5000/orders/12345 and hit refresh a few times (the apps are designed to show errors around 50% of the time, which is why you need to refresh a few times to see the various error states in the Jaeger UI). Now navigate to http://localhost:16686/ and you'll see traces in the Jaeger UI.
