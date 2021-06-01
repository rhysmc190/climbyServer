const ObjectID = require('mongodb').ObjectID;

function _idQuery(_idString) {
	return { _id: new ObjectID.createFromHexString(_idString) };
}

module.exports = { _idQuery };
