// Imports
import * as co from 'co';
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

co(function* () {

    const fileName = `${fileNamePrefix}_${moment().format('MM-DD-YYYY-HH-mm-ss')}.Bak`;
    const compressedFileName = `${fileName}.gz`;

    yield backupDatabase(databaseHost, databaseUser, databasePassword, databaseName, path.join(filePath, fileName));

    yield compressFile(path.join(filePath, fileName), path.join(filePath, compressedFileName));

    yield uploadFile(path.join(filePath, compressedFileName), accessToken);

}).catch((err) => {
    winston.error(err);
});

function backupDatabase(host: string, user: string, password: string, database: string, filename: string): Promise<void> {
    return co(function* () {
        const sqlConfig = {
            user: user,
            password: password,
            server: host,
            database: database
        };

        const pool = yield sql.connect(sqlConfig);
        const sqlResult = yield pool.request().query(`BACKUP DATABASE ${database} TO DISK = '${filename}'`);
        pool.close();

        return;
    });
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

function uploadFile(filename: string, token: string): Promise<void> {
    return co(function* () {

        const dropBoxGateway = new DropBoxGateway();

        const fileSize = fs.statSync(filename).size;

        const chunkSize = 100000;

        const sessionId = yield dropBoxGateway.startSession(accessToken);

        for (let i = 0; i < fileSize; i = i + chunkSize) {
            const buffer = readChunk.sync(filename, i, chunkSize);

            for (let j = 0; j < 5; j++) {
                try {
                    yield dropBoxGateway.appendSession(token, sessionId, i, buffer);
                    break;
                } catch (err) {
                    winston.error(err);
                    yield delay(1000);
                }
            }

            winston.info(`${i} / ${fileSize}`);
        }

        yield dropBoxGateway.endSession(accessToken, sessionId, `/${path.basename(filename)}`, fileSize);

        return;
    });
}
