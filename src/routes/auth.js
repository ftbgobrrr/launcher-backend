import express from 'express';
import upash from 'upash';
import jwt from 'jwt-express';
import { ObjectId } from 'mongodb';
import { error, INVALID_CREDENTIALS, INVALID_RESULT } from '../errors';
import { groupToLevel } from '../utils';

const router = express.Router();

router.get('/', (req, res) => {
    res.json({ message: 'auth' });
});

router.post('/login', async (req, res, next) => {
    const { pass, login } = req.body;
	console.log(await upash.hash(pass));
    const result = await req.db
        .collection('users')
        .find({ login })
        .map(({ _id, ...fields }) => ({ id: _id, ...fields }))
        .next();
    if (!result || !await upash.verify(result.pass, pass)) { return next(); }
    delete result.pass;
    const token = res.jwt({
        id: result.id,
        level: groupToLevel({ group: result.group }),
    }).store(res).token;

    res.json({ ...result, token });
}, ({ res }) => error(res, INVALID_CREDENTIALS));

router.get('/me', jwt.active(), async (req, res) => {
    const { payload: { id } } = req.jwt;
    const user = await req.db
        .collection('users')
        .find({ _id: new ObjectId(id) })
        .map(({ _id, pass, ...fields }) => ({ id: _id, ...fields }))
        .next();
    res.status(200);
    res.json(user);
});

router.post('/me/pass', jwt.active(), async (req, res, next) => {
    const { payload: { id } } = req.jwt;
    const { pass } = req.body;
    const hash = await upash.hash(pass);
    const { modifiedCount } = await req.db.collection('users')
        .updateOne(
            { _id: new ObjectId(id) },
            { $set: { pass: hash } },
        );
    if (modifiedCount < 0) return next();
    res.status(200).json({ id });
}, ({ res }) => error(res, INVALID_RESULT));

router.get('/logout', jwt.active(), (req, res) => {
    res.clearCookie('auth');
    res.json({ message: 'ok' });
});

module.exports = router;
