# Database Backup Dropbox

Backups database and copies file to Dropbox


```
Usage: database-backup-droxbox [options]

Options:
  --fileNamePrefix             [required]
  --filePath                   [required]
  --databaseName               [required]
  --databaseUser               [required]
  --databasePassword           [required]
  --databaseHost               [required]
  --accessToken                [required]

```

## Getting Started

Install 'database-backup-dropbox' globally by running the following command.

`npm install -g database-backup-dropbox`

Example:

`database-backup-drobox --fileNamePrefix MyDatabase --filePath "C:\\SQL\\Backups" --databaseName MyLiveDatabase --databaseUser myuser --databasePassword 12345678 --databaseHost database.mydomain.com --accessToken XYZ`

This command will create two files, namely `MyDatabase_07-24-2017-18-21-45.Bak` and `MyDatabase_07-24-2017-18-21-45.Bak.gz`, in the `C:\SQL\Backups` directory. Only the GZ file will be uploaded to Dropbox.

## Notes

This tool only support MS SQL Server databases.