import express from 'express';
import jwt from 'jwt-express';
import { mojang } from '..';

const router = express.Router();

router.use(jwt.active());

router.get('/', async (req, res) => {
    const versions = await mojang.versions();
    res.json(versions).status(200);
});

module.exports = router;
