import express from 'express';
import {
    appRoot, HOST, PORT,
} from '..';
import fs from 'fs';
import fse from 'fs-extra';
import path from 'path'
import jwt from 'jwt-express';
import sha1FileCallback from 'sha1-file';
import { groupToLevel, EDITOR } from '../utils';
import {promisify} from 'util';

const readdir = promisify(fs.readdir);
const sha1File = promisify(sha1FileCallback);

const router = express.Router();

router.get('/', (req, res) => {
    res.json({ message: 'hello' });
});

router.get('/manifest', async (req, res) => {
    const folder = `${appRoot}/public/versions/`;
    try {
        const packs = await req.db
            .collection('packs')
            .find({})
            .map(({ preset, _id, name, data, libraries, files, desabled, mainClass, args, ...fields}) => ({ id: name, ...fields, type: 'release' }))
            .toArray();

        const files = await req.db
            .collection('launcher')
            .find({})
            .map(({ _id, ...fields }) => ({ ...fields }))
            .toArray();
        const versions = packs.map(({ default: def, ...v }) => {
            return {
                ...v,
                url: `${HOST}/public/versions/${v.id.toLowerCase()}.json`
            }
        })

        const launcher = {
            launcher: files.find(({ type }) => type == 'launcher'),
            bootloaders: files.filter(({ type }) => type == 'bootloader')
        }

		const { id: latest, type } = packs.find(({ default: def }) => def) || { id: 'none' };

        res.status(200).json({
            launcher,
            latest: { [type]: latest },
            versions
        });
    } catch (err) {
        console.error(err);
    }
});

router.post('/uploadLauncher', jwt.active(), jwt.require('level', '>=', groupToLevel(EDITOR)), async(req, res) => {
    const { type, arch } = req.body;
    const { files: { file } } = req;
    const out = `${appRoot}/public/launcher/${type}${arch !== 'null' ? `-${arch}`: ''}${path.extname(file.name)}`;
    await fse.createFile(out);
    await file.mv(out);
    const url = `${HOST}/public/launcher/${type}${arch !== 'null' ? `-${arch}`: ''}${path.extname(file.name)}`;
    const sha1 = await sha1File(out);
    const { ok } = await req.db
        .collection('launcher')
        .findOneAndUpdate(
            { type, arch },
            { 
                $set: { 
                    type, 
                    arch,
                    sha1,
                    url
                } 
            },
            { upsert: true }
        )
    if (ok !== 1) return next();
    res.json({ type, arch });
}, ({ res }) => error(res, INVALID_RESULT));

//router.get('/fixHost', async (req, res) => {
//
//	const data = await req.db
//		.collection('packs')
//		.find({})
//		.toArray();
//	
//	const formatted_data = data.map(async (pack) => {
//		const id = pack._id;
//		delete pack._id
//		pack.files = pack.files.map((file) => {
//			if (file === 'CUSTOM')
//				file.downloads.artifact.url = file.downloads.artifact.url.replace(/^((http[s]?):\/)?\/?([^:\/\s]+)/gm, HOST);
//			return file;
//		});
//		
//		pack.libraries = pack.libraries.map((lib) => {
//			if (lib.type === 'CUSTOM')
//				lib.downloads.artifact.url = lib.downloads.artifact.url.replace(/^((http[s]?):\/)?\/?([^:\/\s]+)/gm, HOST);
//			return lib;
//		});
//
//
//		const res = await req.db.collection('packs')
//			.update({ _id: id }, { $set: pack })
//		console.log(res)
//
//		return pack;
//	})
//
//	//const { ok } = await req.db.collection('packs')
//	//	.updateMany({}, formatted_data)
//
//	res.json({ formatted_data });
//});

module.exports = router;
