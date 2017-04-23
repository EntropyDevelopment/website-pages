/*	Copyright 2016 (c) Michael Thomas (malinka) <malinka@entropy-development.com>
	Distributed under the terms of the GNU Affero General Public License v3
*/

module.exports = {
	name: 'pages',
	db: {
		user: process.env.DB_USER || 'website',
		password: process.env.DB_PASS || '',
		port: process.env.DB_PORT,
		host: process.env.DB_HOST || 'localhost',
		db: process.env.DB_NAME || 'website',
		toString: function() {
			return 'postgres://' + this.user + (this.password !== '' ? ':' : '') + this.password + '@' + this.host + (this.port !== undefined ? ':' + this.port : '') + '/' + this.db;
		},
	},
	port: process.env.PORT || 8080,
	forward: 'http://' + (process.env.FORWARD !== undefined ? process.env.FORWARD : 'localhost:' + process.env.PORT) + '/',
};
