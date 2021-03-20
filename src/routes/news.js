import express from 'express';
import jwt from 'jwt-express';
import { ObjectId } from 'mongodb';
import { groupToLevel, EDITOR } from '../utils';

const router = express.Router();

router.get('/', async (req, res) => {
    const news = await req.db.collection('news')
        .find({})
        .map(({ _id: id, ...fields }) => ({ id, ...fields }))
        .toArray();
    
    res.json(
        news
    ).status(200);
});

router.post('/add',
    jwt.active(),
    jwt.require('level', '>=', groupToLevel(EDITOR)), 
    async (req, res) => {
    const { message } = req.body;
    const date = Date.now();
    req.db.collection('news')
        .insertOne({ message, date })
        .then(({ insertedId }) => {
            res.status(200).json({ id: insertedId, message, date });
        });
})

router.post('/del',
    jwt.active(),
    jwt.require('level', '>=', groupToLevel(EDITOR)), 
    async (req, res) => {
    const { id } = req.body;
    req.db.collection('news')
        .deleteOne({ _id: new ObjectId(id) })
        .then(({ deletedCount }) => {
            res.status(200).json(deletedCount > 0 ? { id } : {});
        });
})

module.exports = router;
