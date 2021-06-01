const { DATE_FORMAT } = require('./constants');
const parse = require('date-fns/parse');
const differenceInYears = require('date-fns/differenceInYears');
const express = require('express');
const loadDB = require('./db');
const { _idQuery } = require('./utils');

const app = express();
app.use(express.json());
app.use(
	express.urlencoded({
		extended: true,
	})
);
const port = 3000;

async function run() {
	const db = await loadDB();
	const clients = await db.collection('clients');

	app.post('/client/create', async (req, res) => {
		const { DOB, email, firstName, lastName, phone } = req.body;
		if (!(DOB && email && firstName && lastName && phone))
			return res.send({ error: 'Missing body params.' });
		if (
			differenceInYears(new Date(), parse(DOB, DATE_FORMAT, new Date())) <
			18
		)
			return res.send({ error: 'You must be 18+ to sign the waiver.' });

		const { upsertedId } = await clients.updateOne(
			{ email },
			{ $set: { DOB, email, name: `${firstName} ${lastName}`, phone } },
			{ upsert: true }
		);

		if (!upsertedId)
			return res.send({
				error: 'Oops! This email already exists in our DB.',
			});

		const { _id } = upsertedId;
		res.send({ _id });
	});

	app.post('/client/addDependents', async (req, res) => {
		const { _id, dependents } = req.body;
		// should check deps have name fields and are under 18
		// add dependents to DB with dependee = _id and get _id's back.
		const { insertedIds } = await clients.insertMany(
			dependents.map(dep => ({ dependee: _id, ...dep }))
		);

		if (!insertedIds)
			return res.send({
				error: 'Oops! Something went wrong adding dependents.',
			});

		const insertedIdsArray = Object.values(insertedIds);

		// add _id's to dependents of original client
		const { matchedCount, modifiedCount } = await clients.updateOne(
			_idQuery(_id),
			{ $set: { dependents: insertedIdsArray } }
		);

		if (matchedCount === 0)
			return res.send({ error: 'No user with the given _id.' });

		if (modifiedCount === 0)
			return res.send({
				error: 'Oops! Something went wrong assigning dependents.',
			});

		res.send({ _id, dependents: insertedIdsArray });
	});

	app.post('/client/update', async (req, res) => {
		const { _id, updateParams } = req.body;
		if (!(_id && updateParams))
			return res.send({ error: 'Missing body params.' });

		const { matchedCount, modifiedCount } = await clients.updateOne(
			_idQuery(_id),
			{ $set: { ...updateParams } }
		);

		if (matchedCount === 0)
			return res.send({ error: 'No user with the given _id.' });

		if (modifiedCount === 0)
			return res.send({
				error: 'Oops! Something went wrong updating client.',
			});

		res.send({ _id, updateParams });
	});

	app.post('/client/delete', async (req, res) => {
		const { _id } = req.body;
		if (!_id) return res.send({ error: 'Missing body params' });

		const { deletedCount } = await clients.deleteOne(_idQuery(_id));

		if (deletedCount === 0)
			return res.send({ error: 'No user with the given _id.' });

		res.send({ _id });
	});

	app.get('/client', async (req, res) => {
		const { _id, email, name } = req.body;
		let client;

		if (_id) {
			client = await clients.findOne(_idQuery(_id));
			if (client) return res.send(client);
			return res.send({ error: 'No user with the given _id.' });
		}

		if (email) {
			client = await clients.findOne({ email });
			if (client) return res.send(client);
			return res.send({ error: 'No user with the given email.' });
		}

		if (name) {
			client = await clients.findOne({ name });
			if (client) return res.send(client);
			return res.send({ error: 'No user with the given name.' });
		}

		return res.send({ error: 'Missing body params' });
	});

	app.get('/clients', async (req, res) => {
		const allClients = await clients.find({}).toArray();
		console.log(allClients);
		if (allClients) return res.send(allClients);
		return res.send({ error: 'Oops! Something went wrong.' });
	});

	app.listen(port, () => {
		console.log(`Example app listening at http://localhost:${port}`);
	});
}

run();
