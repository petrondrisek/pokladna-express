import sqlite3 from 'sqlite3'

const sqlite = sqlite3.verbose();

//Database
export const db = new sqlite.Database('./database.db');