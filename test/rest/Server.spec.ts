import Server from "../../src/rest/Server";
import InsightFacade from "../../src/controller/InsightFacade";

import {expect} from "chai";
import request, {Response} from "supertest";
import * as fs from "fs";
import {getContentFromArchives} from "../TestUtil";

describe("Facade D3", function () {

	let facade: InsightFacade;
	let server: Server;
	let ZIP_FILE_DATA: Buffer;
	let query: object;

	before(async function () {
		query = {
			WHERE: {
				AND: [
					{
						GT: {
							sections_avg: 97,
						},
					},
					{
						IS: {
							sections_dept: "c*",
						},
					},
				],
			},
			OPTIONS: {
				COLUMNS: [
					"sections_dept",
					"sections_avg"
				],
				ORDER: {
					dir: "UP",
					keys: [
						"sections_avg"
					]
				}
			}};
		facade = new InsightFacade();
		server = new Server(4322);
		await server.start();
		// TODO: start server here once and handle errors properly
		ZIP_FILE_DATA = fs.readFileSync("test/resources/archives/pair.zip");
		// ZIP_FILE_DATA = "/Users/ellenzhang/Desktop/project_team213/test/resources/archives/pair.zip";
	});

	after(async function () {
		// TODO: stop server here once!
		await server.stop();
	});

	beforeEach(async function () {
		// might want to add some process logging here to keep track of what is going on

	});

	afterEach(async function () {
		// might want to add some process logging here to keep track of what is going on
	});

	// Sample on how to format PUT requests

	it("PUT test for courses dataset", function () {
		try {
			return request("http://localhost:4322")
				.put("/dataset/section/sections")
				.send(ZIP_FILE_DATA)
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: Response) {
					// some logging here please!
					console.log(res.error);
					expect(res.status).to.be.equal(200);
				})
				.catch(function (err) {
					// some logging here please!
					console.log(err);
					expect.fail();
				});
		} catch (err) {
			// and some more logging here!
		}
	});


	it("DELETE test for courses dataset", function () {
		try {
			return request("http://localhost:4322")
				.delete("/dataset/section")
				.then(function (res: Response) {
					// some logging here please!
					expect(res.status).to.be.equal(200);
				})
				.catch(function (err) {
					// some logging here please!
					console.log(err);
					expect.fail();
				});
		} catch (err) {
			// and some more logging here!
		}
	});

	it("GET test for courses dataset", function () {
		try {
			return request("http://localhost:4322")
				.get("/datasets")
				.then(function (res: Response) {
					// some logging here please!
					expect(res.status).to.be.equal(200);
				})
				.catch(function (err) {
					// some logging here please!
					console.log(err);
					expect.fail();
				});
		} catch (err) {
			// and some more logging here!
		}
	});

	it("POST test for courses dataset", function () {
		try {
			return request("http://localhost:4322")
				.post("/query")
				.send(JSON.parse(JSON.stringify(query)))
				.set("Content-Type", "application/json")
				.then(function (res: Response) {
					// some logging here please!
					console.log(res.body);
					expect(res.status).to.be.equal(200);
				}).catch(function (err) {
					// some logging here please!
					console.log(err);
					expect.fail();
				});
		} catch (err) {
			// and some more logging here!
		}
	});


	// The other endpoints work similarly. You should be able to find all instructions at the supertest documentation
});
