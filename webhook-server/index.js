const express = require("express");
const amqp = require("amqplib/callback_api");
const app = express();
const bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post("/payload", (request, res) => {
  try {
    const payload = request.body;
    // console.log(payload)
    res.status(200).json({
      status: "success",
      data: {
        data: payload,
      },
    });
    console.log(payload);
    const pullRequestUrl = payload.pull_request.url;
    const owner = payload.repository.owner.login;
    const repo = payload.repository.name;
    const pullNumber = payload.number;

    const pullRequestPayload = [
        {
            pullRequestUrl,
            pullNumber,
            owner,
            repo,
        }
    ]
    console.log(pullRequestPayload);

    amqp.connect("amqp://localhost", function (error0, connection) {
      if (error0) {
        throw error0;
      }
      connection.createChannel(function (error1, channel) {
        if (error1) {
          throw error1;
        }
        const queue = "pull-request-action";;

        channel.assertQueue(queue, {
          durable: false,
        });

        channel.sendToQueue(queue, Buffer.from(JSON.stringify(pullRequestPayload)));
        console.log(" [x] Sent %s", pullRequestPayload);
      });
      setTimeout(function () {
        connection.close();
        process.exit(0);
      }, 500);
    })
  } catch (err) {
    console.log(err);
    res.status(404).json({
      status: "fail",
      message: err,
    });
  }
  // console.log(request);
});


app.listen(4567, (err) => {
  console.log("Server is up and running");
  if (err) {
    console.error(`Error starting server ${err}`);
    setTimeout(() => process.exit(1), 2000);
  }
});
