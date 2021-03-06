/*	Copyright 2016 (c) Michael Thomas (malinka) <malinka@entropy-development.com>
	Distributed under the terms of the GNU Affero General Public License v3
*/

'use strict';

const koa = require('koa');

const logger = require('koa-logger');
const etag = require('koa-etag');
const conditional = require('koa-conditional-get');
const route = require('koa-route');
const body = require('koa-body');
const { Pool } = require('pg');

const config = require('./config.js');

const app = new koa();

const pages = {
	create: async (ctx, site) => {
		try {
			const result = await ctx.pg.query('CREATE TABLE pages."' + site + '" (name TEXT PRIMARY KEY, body TEXT);');
			ctx.body = result.command;
		} catch(e) {
			if(e.code == '42P07') {
				e.status = 409;
				e.expose = true;
			}
			throw e;
		}
	},
	remove: async (ctx, site) => {
		try {
			const result = await ctx.pg.query('DROP TABLE pages."' + site + '";');
			ctx.body = result.command;
		} catch(e) {
			if(e.code == '3F000') {
				e.status = 404;
				e.expose = true;
			}
			throw e;
		}
	},
	get: async (ctx, site) => {
		try {
			const result = await ctx.pg.query('SELECT name FROM pages."' + site + '";');
			ctx.type = 'json';
			ctx.body = JSON.stringify((result.rows !== undefined ? result.rows : {}));
		} catch(e) {
			if(e.code == '42P01') {
				e.status = 404;
				e.expose = true;
			}
			throw e;
		}
	},
};

const page = {
	create: async (ctx, site, page) => {
		if(ctx.request.body === undefined || ctx.request.body.fields === undefined || ctx.request.body.fields.f === undefined) {
			ctx.throw(400, 'no data');
		}
		try {
			const result = await ctx.pg.query('INSERT INTO pages."' + site + '" (name, body) VALUES ($1::text, $2::text);', [page, ctx.request.body.fields.f]);
			ctx.body = result.command + ' ' + result.rowCount;
		} catch(e) {
			if(e.code == '23505') {
				e.status = 409;
				e.expose = true;
			}
			throw e;
		}
	},
	remove: async (ctx, site, page) => {
		const result = await ctx.pg.query('DELETE FROM pages."' + site + '" WHERE name = $1::text;', [page]);
		ctx.body = result.command + ' ' + result.rowCount;
	},
	modify: async (ctx, site, page) => {
		if(ctx.request.body === undefined || ctx.request.body.fields === undefined || ctx.request.body.fields.f === undefined) {
			ctx.throw(400, 'no data');
		}
		const result = await ctx.pg.query('UPDATE pages."' + site + '" SET body = $2::text WHERE name = $1::text', [page, ctx.request.body.fields.f]);
		if(result.rowCount == 0)
			ctx.throw(404);

		ctx.body = result.command + ' ' + result.rowCount;
	},
	get: async (ctx, site, page) => {
		try {
			const result = await ctx.pg.query('SELECT body FROM pages."' + site + '" WHERE name = $1::text;', [page]);
			ctx.type = 'markdown';
			if(result.rows.length == 0)
				ctx.throw(404);

			ctx.body = result.rows[0].body;
		} catch (e) {
			if(e.code == '42P01') {
				e.status = 404;
				e.expose = true;
			}
			throw e;
		}
	},
};

app.use(logger());
app.use(body({
	multipart: true,
}));
app.use(etag());
app.use(conditional());

app.use(async (ctx, next) => {
	if(ctx.url.startsWith('/' + config.name))
		ctx.url = ctx.url.replace('/' + config.name, '');

	await next();
});

app.use(async (ctx, next) => {
	ctx.pg = new Pool();

	await next();
});

app.use(async (ctx, next) => {
	await ctx.pg.query('CREATE SCHEMA IF NOT EXISTS pages;');

	await next();
});

app.use(route.get('/:site', pages.get));
app.use(route.put('/:site', pages.create));
app.use(route.del('/:site', pages.remove));
app.use(route.get('/:site/:page', page.get));
app.use(route.put('/:site/:page', page.create));
app.use(route.del('/:site/:page', page.remove));
app.use(route.post('/:site/:page', page.modify));

app.listen(config.port);
