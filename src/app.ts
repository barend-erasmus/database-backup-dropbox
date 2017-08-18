// Imports
import * as winston from 'winston';
import * as moment from 'moment';
import * as sql from 'mssql';
import * as fs from 'fs';
import * as path from 'path';
import * as delay from 'delay';
import * as readChunk from 'read-chunk';
import * as zlib from 'zlib';

// Import gateways
import { DropBoxGateway } from './dropbox-gateway';

const argv = require('yargs')
    .usage('Usage: $0 [options]')
    .demand('fileNamePrefix', 'Filename Prefix')
    .demand('filePath', 'File Path')
    .demand('databaseName', 'Database Name')
    .demand('databaseUser', 'Database User')
    .demand('databasePassword', 'Database Password')
    .demand('databaseHost', 'Database Host')
    .demand('accessToken', 'Dropbox Access Token')
    .argv;

const fileNamePrefix = argv.fileNamePrefix;
const filePath = argv.filePath;
const databaseName = argv.databaseName;
const databaseUser = argv.databaseUser;
const databaseHost = argv.databaseHost;
const databasePassword = argv.databasePassword;
const accessToken = argv.accessToken;

app().catch((err) => {
    winston.error(err);
});

async function app() {

    const fileName = `${fileNamePrefix}_${moment().format('MM-DD-YYYY-HH-mm-ss')}.Bak`;
    const compressedFileName = `${fileName}.gz`;

    await backupDatabase(databaseHost, databaseUser, databasePassword, databaseName, path.join(filePath, fileName));

    await compressFile(path.join(filePath, fileName), path.join(filePath, compressedFileName));

    await uploadFile(path.join(filePath, compressedFileName), accessToken);

}

async function backupDatabase(host: string, user: string, password: string, database: string, filename: string): Promise<void> {
    const sqlConfig = {
        user: user,
        password: password,
        server: host,
        database: database
    };

    const pool = await sql.connect(sqlConfig);
    const sqlResult = await pool.request().query(`BACKUP DATABASE ${database} TO DISK = '${filename}'`);
    pool.close();

    return;
}

function compressFile(inputFilename: string, outputFilename: string): Promise<void> {
    return new Promise((resolve, reject) => {

        const gzip = zlib.createGzip();
        const inputFile = fs.createReadStream(inputFilename);
        const outputFile = fs.createWriteStream(outputFilename);

        inputFile.pipe(gzip).pipe(outputFile);

        outputFile.on('finish', () => {
            inputFile.close();
            inputFile.destroy();
            outputFile.close();
            resolve();
        });

    });
}

async function uploadFile(filename: string, token: string): Promise<void> {
        const dropBoxGateway = new DropBoxGateway();

        const fileSize = fs.statSync(filename).size;

        const chunkSize = 100000;

        const sessionId = await dropBoxGateway.startSession(accessToken);

        for (let i = 0; i < fileSize; i = i + chunkSize) {
            const buffer = readChunk.sync(filename, i, chunkSize);

            for (let j = 0; j < 5; j++) {
                try {
                    await dropBoxGateway.appendSession(token, sessionId, i, buffer);
                    break;
                } catch (err) {
                    winston.error(err);
                    await delay(1000);
                }
            }

            winston.info(`${i} / ${fileSize}`);
        }

        await dropBoxGateway.endSession(accessToken, sessionId, `/${path.basename(filename)}`, fileSize);

        return;
}
