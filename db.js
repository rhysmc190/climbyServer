const { MongoClient } = require('mongodb');
const fs = require('fs');

let db;

const loadDB = async () => {
	if (db) {
		return db;
	}
	try {
		const uri = fs.readFileSync('mongoURIAccess', 'utf8');
		const client = await MongoClient.connect(uri, {
			useUnifiedTopology: true,
		});
		db = client.db('bercbase');
	} catch (err) {
		console.log(err);
		Raven.captureException(err);
	}
	return db;
};

module.exports = loadDB;
