import express from 'express';
import jwt from 'jwt-express';
import { ObjectId } from 'mongodb';
import {
    mojang, appRoot, HOST, PORT,
} from '..';
import fse from 'fs-extra';
import fs from 'fs';
import { promisify } from 'util';
import sha1FileCallback from 'sha1-file';
import nodepath from 'path';
import deleteEmpty from 'delete-empty';
import clone from 'clone';
import { groupToLevel, EDITOR, path as nameToPath } from '../utils';
import { error, INVALID_RESULT, INCOMPATIBLE_VERSION } from '../errors';

const sha1File = promisify(sha1FileCallback);
const router = express.Router();

router.use(jwt.active());

router.get('/', async (req, res) => {
    const packs = await req.db
        .collection('packs')
        .find({})
        .map(({ _id, ...fields }) => ({ id: _id, ...fields }))
        .toArray();
    res.status(200);
    res.json(packs);
});

router.post('/default', jwt.require('level', '>=', groupToLevel(EDITOR)), async (req, res) => {
    const { id } = req.body;
    await req.db.collection('packs')
        .updateMany(
            { default: true },
            { $set: { default: false } }  
        );
    await req.db.collection('packs')
        .updateMany(
            { _id: new ObjectId(id) },
            { $set: { default: true } }  
        );
    const packs = await req.db
        .collection('packs')
        .find({})
        .map(({ _id, ...fields }) => ({ id: _id, ...fields }))
        .toArray();
    res.status(200);
    res.json(packs);
});

router.post('/add', jwt.require('level', '>=', groupToLevel(EDITOR)), async (req, res) => {
    const { name, preset } = req.body;
    const { data: version } = await mojang.version(preset, true);
    console.log(version);
    req.db.collection('packs')
        .insertOne({ name, preset, files: [], libraries: [], desabled: [] })
        .then(({ insertedId }) => {
            res.status(200).json({ id: insertedId, name, preset });
        });
});

router.post('/del', jwt.require('level', '>=', groupToLevel(EDITOR)), async (req, res, next) => {
    const { id } = req.body;
    const { deletedCount } = await req.db.collection('packs')
        .deleteOne({ _id: new ObjectId(id) });
    if (deletedCount === 0) return next();
    res.status(200).json({ id });
}, ({ res }) => error(res, INVALID_RESULT));

router.post('/edit', jwt.require('level', '>=', groupToLevel(EDITOR)), async (req, res, next) => {
    const { id, name } = req.body;
    const pack = { name };
    const { modifiedCount } = await req.db.collection('packs')
        .updateOne(
            { _id: new ObjectId(id) },
            { $set: pack },
        );
    if (modifiedCount === 0) return next();
    res.status(200).json({ id });
}, ({ res }) => error(res, INVALID_RESULT));

router.post('/pack', async (req, res) => {
    const { id } = req.body;
    const pack = await req.db
        .collection('packs')
        .find({ _id: new ObjectId(id) })
        .map(({ _id, ...fields }) => ({ id: _id, ...fields }))
        .next();
    res.status(200);
    try {
        const { data } = await mojang.version(pack.preset);
        const clone = Object.assign({}, data);
        if (pack && pack.libraries)
            clone.libraries = pack.libraries.concat(data.libraries);
        res.json({ ...pack, data: clone });
    } catch (err) {
        error(res, INCOMPATIBLE_VERSION);
    }
});

const plurializeTypes = (type) => {
    if (type === 'library') {
        return 'libraries';
    } if (type === 'file') {
        return 'files';
    }
    return undefined;
};

router.post('/pack/upload', jwt.require('level', '>=', groupToLevel(EDITOR)), async (req, res, next) => {
    // pack id de la ressource
    // type = type library/file
    // name = truc formatter
    const { pack, type, name } = req.body;
    const plurializedType = plurializeTypes(type);
    if (!plurializedType) return next();
    try {
        const { files: { file } } = req;
        let fname = name.replace(/\s+/g, '-')
        const path = nodepath.normalize(nameToPath(fname, type));
        const out = nodepath.normalize(`${appRoot}/public/${plurializedType}/${path}`);
        await fse.createFile(out);
        await file.mv(out);
        const url = `${HOST}/public/${plurializedType}/${nodepath.normalize(path).replace(/^\/|\/$/g, '')}`;
        const { size } = await fse.stat(out);
        const sha1 = await sha1File(out);

        const lib = {
            name: fname,
            type: 'CUSTOM',
            downloads: {
                artifact: {
                    path: path.replace(/^\/|\/$/g, ''),
                    url,
                    size,
                    sha1,
                },
            },
        };

        const bulk = req.db.collection('packs').initializeOrderedBulkOp();
        bulk.find({ _id: new ObjectId(pack) }).updateOne({ $pull: { [plurializedType]: { name: fname } } });
        bulk.find({ _id: new ObjectId(pack) }).updateOne({ $push: { [plurializedType]: lib } });
        const { isOk } = await bulk.execute();
        if (!isOk) return next();
        res.json(lib);
    } catch (err) {
        console.log(err)
        return next();
    }
}, ({ res }) => error(res, INVALID_RESULT));

router.post('/pack/del', jwt.require('level', '>=', groupToLevel(EDITOR)), async (req, res, next) => {
    const { id: pack, type, name } = req.body;
    const plurializedType = plurializeTypes(type);
    const { modifiedCount } = await req.db.collection('packs')
        .updateOne(
            { _id: new ObjectId(pack) },
            { $pull: { [plurializedType]: { name } } }
        );
    if (modifiedCount === 0) return next();
    const path = nameToPath(name, type);
    const out = `${appRoot}/public/${plurializedType}/${path}`;
    await fse.unlink(out);
    res.status(200).json({ id: pack, name, type });
}, ({ res }) => error(res, INVALID_RESULT));

router.post('/pack/settings', jwt.require('level', '>=', groupToLevel(EDITOR)), async (req, res, next) => {
    const { id: pack, mainClass, args } = req.body;
    const { modifiedCount, matchedCount } = await req.db.collection('packs')
        .updateOne(
            { _id: new ObjectId(pack) },
            { $set: { mainClass, args } }
        );
    if (matchedCount !== 1 && modifiedCount === 0) return next();
    res.status(200).json({ id: pack, mainClass, args });
}, ({ res }) => error(res, INVALID_RESULT));

router.post('/pack/desable', jwt.require('level', '>=', groupToLevel(EDITOR)), async (req, res, next) => {
    const { id: pack, type, name, desable } = req.body;
    const bulk = req.db.collection('packs').initializeOrderedBulkOp();
    bulk.find({ _id: new ObjectId(pack) }).updateOne({ $pull: { desabled: { type, name } } });
    if (desable == true)
        bulk.find({ _id: new ObjectId(pack) }).updateOne({ $push: { desabled: { type, name } } });
    const { isOk } = await bulk.execute();
    if (!isOk) return next();
    res.status(200).json({ id: pack, name, type, desable });
}, ({ res }) => error(res, INVALID_RESULT));


router.post('/pack/build', jwt.require('level', '>=', groupToLevel(EDITOR)), async (req, res, next) => {
    const { id } = req.body;
    try {
        const packs = await req.db
            .collection('packs')
            .find({})
            .map(({ _id, ...fields }) => ({ id: _id, ...fields }))
            .toArray();
            res.status(200);
        const pack = packs.find(({ id: i }) => i == id)
        const { data } = await mojang.version(pack.preset);
        const copy = clone(data);
        if (pack) {
            copy.id = pack.name;
            copy.libraries = pack.libraries && pack.libraries.filter(({ name }) => {
                return pack.desabled && !pack.desabled.find(({ name: n, type }) => n == name && type == 'library')
            }).concat(data.libraries);

            copy.files = pack.files && pack.files.filter(({ name }) => {
                return pack.desabled && !pack.desabled.find(({ name: n, type }) => n == name && type == 'file')
            }) || undefined;

            copy.mainClass = pack.mainClass || copy.mainClass;
            if (pack.args) {
                copy.arguments.game = [ ...data.arguments.game, ...pack.args.split(' ') ];
            }
        }
        const version = `${appRoot}/public/versions/${pack.name.toLowerCase()}.json`;
        await fse.createFile(version)
        await fse.writeJson(version, copy);
        await deleteEmpty(`${appRoot}/public/`);
        res.json({ id });
    } catch (err) {
        console.log(err)
        error(res, INCOMPATIBLE_VERSION);
    }
}, ({ res }) => error(res, INVALID_RESULT));

module.exports = router;
