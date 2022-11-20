var amqplib = require("amqplib");
var channel;
var products = null;
var Order = require("./schema/orderSchema");
var { orderTotal } = require("./utils/orderTotal");

////this is here because of circulr dependency and stuff
var buyNow = async (req, res) => {
	var { ids, email } = req.body;
	await publishToQueue(JSON.stringify({ ids }), "product");
	if (products) {
		var totalPrice = orderTotal(products);
		// console.log(ids);
		var newOrder = new Order({
			ids: ids,
			email: email,
			totalPrice: totalPrice,
		});
		await newOrder
			.save()
			.then(() => {
				console.log("order processed");
			})
			.catch((err) => console.log(err));
		res.send({ products, email, totalPrice });
	}
};

var connectAmqp = async () => {
	try {
		var connection = await amqplib
			.connect("amqp://localhost:5672")
			.catch((err) => console.log(err));
		channel = await connection.createChannel();
		await channel.assertQueue("order", { durable: true });
		console.log("AMqp connected");
		await channel.consume("order", (data) => {
			if (data !== null || data !== undefined) {
				// console.log(JSON.parse(data.content));
				// channel.ack(data);
				products = JSON.parse(data.content);
			}
		});
	} catch (error) {
		console.log(error);
	}
	return connection;
};

var publishToQueue = async (data, queueName) => {
	try {
		if (!channel) {
			var connection = await connectAmqp();
			var channel = await connection.createChannel();
		}
		return channel.sendToQueue(queueName, Buffer.from(data));
	} catch (error) {
		console.log(error);
	}
};

module.exports = { connectAmqp, publishToQueue, buyNow };
