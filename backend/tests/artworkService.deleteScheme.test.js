const path = require('path');
const fs = require('fs');
const assert = require('assert');

const TEST_DB_PATH = path.join(__dirname, 'delete-scheme-test.sqlite');
process.env.DB_FILE = TEST_DB_PATH;

if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
}

const { db } = require('../db/index');
const artworkService = require('../services/ArtworkService');

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve(this);
            }
        });
    });
}

function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

async function setupDatabase() {
    await new Promise((resolve, reject) => {
        db.exec(`
            PRAGMA foreign_keys = ON;
            CREATE TABLE IF NOT EXISTS artworks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS color_schemes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                artwork_id INTEGER,
                scheme_name TEXT NOT NULL,
                thumbnail_path TEXT,
                initial_thumbnail_path TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (artwork_id) REFERENCES artworks (id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS custom_colors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                color_code TEXT UNIQUE,
                formula TEXT,
                image_path TEXT,
                applicable_layers TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS scheme_layers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                scheme_id INTEGER,
                layer_number INTEGER,
                custom_color_id INTEGER,
                FOREIGN KEY (scheme_id) REFERENCES color_schemes (id) ON DELETE CASCADE
            );
        `, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

async function runTest() {
    await setupDatabase();

    const artworkResult = await run(
        `INSERT INTO artworks (code, name) VALUES (?, ?)`,
        ['ART-001', 'Test Artwork']
    );
    const artworkId = artworkResult.lastID;

    const schemeResult = await run(
        `INSERT INTO color_schemes (artwork_id, scheme_name, thumbnail_path, initial_thumbnail_path) VALUES (?, ?, ?, ?)`,
        [artworkId, 'Test Scheme', '/uploads/test-thumbnail.png', '/uploads/test-initial.png']
    );
    const schemeId = schemeResult.lastID;

    await run(
        `INSERT INTO scheme_layers (scheme_id, layer_number, custom_color_id) VALUES (?, ?, ?)`,
        [schemeId, 1, null]
    );

    const result = await artworkService.deleteScheme(schemeId);
    assert.deepStrictEqual(result, { success: true, deletedId: schemeId });

    const remainingSchemes = await all(`SELECT * FROM color_schemes WHERE id = ?`, [schemeId]);
    assert.strictEqual(remainingSchemes.length, 0, 'Scheme should be deleted from the database');

    console.log('artworkService.deleteScheme returns success with deletedId when deletion succeeds.');
}

runTest()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => {
        db.close((closeErr) => {
            if (closeErr) {
                console.error('Failed to close test database:', closeErr);
            }
            if (fs.existsSync(TEST_DB_PATH)) {
                fs.unlinkSync(TEST_DB_PATH);
            }
        });
    });
