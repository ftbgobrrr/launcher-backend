import express from 'express';
import jwt from 'jwt-express';
import upash from 'upash';
import { ObjectId } from 'mongodb';
import { groups, groupToLevel, ADMIN } from '../utils';

const router = express.Router();

router.use(jwt.active());

router.get('/', async (req, res) => {
    const users = await req.db
        .collection('users')
        .find({})
        .map(({ _id, pass, ...fields }) => ({ id: _id, ...fields }))
        .toArray();
    res.status(200);
    res.json(users);
});

router.get('/groups', async (req, res) => {
    res.status(200);
    res.json(groups);
});

router.post('/addUser', jwt.require('level', '>=', groupToLevel(ADMIN)), async (req, res) => {
    const { pass, login, group } = req.body;
    const hash = await upash.hash(pass);
    req.db.collection('users')
        .insertOne({ login, pass: hash, group })
        .then(({ insertedId }) => {
            res.status(200).json({ id: insertedId, login, group });
        });
});

router.post('/delUser', jwt.require('level', '>=', groupToLevel(ADMIN)), async (req, res) => {
    const { id } = req.body;
    req.db.collection('users')
        .deleteOne({ _id: new ObjectId(id) })
        .then(({ deletedCount }) => {
            res.status(200).json(deletedCount > 0 ? { id } : {});
        });
});

router.post('/editUser', jwt.require('level', '>=', groupToLevel(ADMIN)), async (req, res) => {
    const { id, login, group } = req.body;
    const user = { login, group };
    req.db.collection('users')
        .updateOne(
            { _id: new ObjectId(id) },
            { $set: user },
        )
        .then(({ modifiedCount }) => {
            res.status(200).json(modifiedCount > 0 ? { id } : {});
        });
});

module.exports = router;
