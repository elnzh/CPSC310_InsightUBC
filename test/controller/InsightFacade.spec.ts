import {
	IInsightFacade,
	InsightDatasetKind,
	InsightError,
	InsightResult, NotFoundError,
	ResultTooLargeError
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";

import {folderTest} from "@ubccpsc310/folder-test";
import {expect, use} from "chai";
import chaiAsPromised from "chai-as-promised";
import {clearDisk, getContentFromArchives} from "../TestUtil";

use(chaiAsPromised);

describe("InsightFacade", function () {
	let facade: IInsightFacade;

	// Declare datasets used in tests. You should add more datasets like this!
	let sections: string;
	let validSections: string;
	let emptySections: string;
	let emptyFolder: string;
	let invalidZip: string;
	let invalidFile: string;
	let myDataset = [{
		id: "id",
		kind: InsightDatasetKind.Sections,
		numRows: 12
	}];

	before(function () {
		// This block runs once and loads the datasets.
		// sections = getContentFromArchives("pair.zip");
		sections = getContentFromArchives("pair.zip");
		// Just in case there is anything hanging around from a previous run of the test suite
		clearDisk();
	});

	describe("Add/Remove/List Dataset", function () {
		before(function () {
			console.info(`Before: ${this.test?.parent?.title}`);
			validSections = getContentFromArchives("valid.zip");
			emptySections = getContentFromArchives("empty_section.zip");
			emptyFolder = getContentFromArchives("empty_folder.zip");
			invalidZip = getContentFromArchives("PHIL316.zip");
			invalidFile = getContentFromArchives("PHIL316.json");
		});

		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			clearDisk();
			console.info(`BeforeTest: ${this.currentTest?.title}`);
			facade = new InsightFacade();
		});

		after(function () {
			console.info(`After: ${this.test?.parent?.title}`);
		});

		afterEach(function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent of the previous one
			console.info(`AfterTest: ${this.currentTest?.title}`);
			clearDisk();
		});

		// // This is a unit test. You should create more like this!
		// it ("should reject with  an empty dataset id", function() {
		// 	const result = facade.addDataset("", sections, InsightDatasetKind.Sections);
		// 	return expect(result).to.eventually.be.rejectedWith(InsightError);
		// });

		it ("1. should reject with empty folder", function(){
			const result = facade.addDataset("id",emptyFolder,InsightDatasetKind.Sections);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it ("2. should reject with zipfile type", function(){
			const result = facade.addDataset("id",invalidZip,InsightDatasetKind.Sections);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it ("3. should reject with file", function(){
			const result = facade.addDataset("id",invalidFile,InsightDatasetKind.Sections);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it ("4. should reject with an empty folder", function(){
			const result = facade.addDataset("id"," ",InsightDatasetKind.Sections);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it ("5. should reject with an empty dataset id", function() {
			const result = facade.addDataset("", validSections, InsightDatasetKind.Sections);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("6. should reject with id contains an underscore",function(){
			const result = facade.addDataset("id_", validSections, InsightDatasetKind.Sections);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("7. should reject with dataset has no section", async function(){
			try{
				await facade.addDataset("id", emptySections, InsightDatasetKind.Sections);
				expect.fail();
			}catch(err){
				expect(err).to.be.instanceof(InsightError);
			}

		});

		it("8. should reject with InsightDatasetKind==room",async function(){
			try{
				const result = await facade.addDataset("id", validSections, InsightDatasetKind.Rooms);
				expect.fail();
			}catch(err){
				expect(err).to.be.instanceof(InsightError);

			}
		});

		it("9. should add one dataset without problem",  async function() {
			try {
				const result = await facade.addDataset("id", validSections, InsightDatasetKind.Sections);
				expect(result).to.have.length(1);
				expect(result).have.deep.members(["id"]);
			} catch (err) {
				expect.fail();
			}
		});

		it("10. should add multiple datasets without problem",  async function(){
			try{
				const result = await facade.addDataset("id", validSections, InsightDatasetKind.Sections);
				// expect(result).to.deep.equal(["id"]);
				expect(result).to.be.instanceof(Array);
				expect(result.length).to.equal(1);
				expect(result).have.deep.members(["id"]);
				const result2 = await facade.addDataset("id2", validSections, InsightDatasetKind.Sections);
				expect(result).to.be.instanceof(Array);
				expect(result2.length).to.equal(2);
				expect(result2).have.deep.members(["id","id2"]);
			} catch(err){
				expect.fail();
			}

		});

		it("11. should reject when adding id of an already added dataset",  function(){
			return facade.addDataset("id",validSections, InsightDatasetKind.Sections).then(
				(result)=>{
					return facade.addDataset("id",validSections, InsightDatasetKind.Sections);
				}).then((res)=>{
				// shouldn't pass
				throw new Error("Not supposed to resolve");
			}).catch((err)=>{
				expect(err).to.be.an.instanceof(InsightError);
				return expect(facade.listDatasets()).to.eventually.have.length(1);
			});
		});


		it("12. handling crashes on multiple adds", async function(){
			// add id (resolve), add id (reject), add id2 (resolve)
			try{
				const result = await facade.addDataset("id", validSections, InsightDatasetKind.Sections);
				expect(result.length).to.equal(1);
				expect(result).have.deep.members(["id"]);
				facade = new InsightFacade();
				await facade.addDataset("id", validSections, InsightDatasetKind.Sections);
				expect.fail();
			}catch(err){
				expect(err).to.be.instanceof(InsightError);
			}

			try{

				const res = await facade.addDataset("id2", validSections, InsightDatasetKind.Sections);
				expect(res).to.be.an.instanceof(Array);
				expect(res).to.have.length(2);
				expect(res).have.deep.members(["id","id2"]);
			}catch(err){
				expect.fail();
			}

		});
		it ("13. should reject with an empty dataset id", function() {
			const result = facade.removeDataset(" ");

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});


		it("14. should reject with id contains an underscore",function(){
			const result = facade.removeDataset("id_");

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});


		it("15. should reject when removing a not existing dataset", function(){
			return facade.removeDataset("id").then((result)=>{
				expect.fail("not supposed to pass");
			}).catch((err)=>{
				expect(err).to.be.instanceof(NotFoundError);
			});

		});


		it("16. should fulfill when removing an added dataset", async function(){
			try{
				const result = await facade.addDataset("id",validSections, InsightDatasetKind.Sections);
				expect(result.length).to.equal(1);
				expect(result).have.deep.members(["id"]);
				const res = await facade.removeDataset("id");
				expect(res).to.equal("id");
			}catch(err){
				expect.fail("shouldn't be rejected");
			}

		});

		it("17. remove dataset and add back without problem", async function(){
			try{
				const result = await facade.addDataset("id", validSections, InsightDatasetKind.Sections);
				expect(result.length).to.equal(1);
				expect(result).have.deep.members(["id"]);
				const res = await facade.removeDataset("id");
				expect(res).to.equal("id");
				const re = await facade.addDataset("id", validSections, InsightDatasetKind.Sections);
				expect(result.length).to.equal(1);
				expect(re).have.deep.members(["id"]);
			}catch(err){
				expect.fail("shouldn't be rejected");
			}

		});

		it("18. after a rejected remove, the next remove resolves",  function(){
			return facade.addDataset("id", validSections, InsightDatasetKind.Sections).then((result)=>{
				expect(result.length).to.equal(1);
				expect(result).have.deep.members(["id"]);
				return facade.removeDataset("id2");
			}).then((res)=>{
				return expect.fail("removed a not added id, shouldn't resolve");
			}).catch((err)=>{
				expect(err).to.be.instanceof(NotFoundError);
				return facade.removeDataset("id");
			}).then((re)=>{
				return expect(re).to.equal("id");
			});
		});

		it("19. crashes ", async function(){
			try{
				await facade.addDataset("id",validSections, InsightDatasetKind.Sections);
				facade = new InsightFacade(); // crash
				const result = await facade.removeDataset("id");
				expect(result).to.be.a("string");
				expect(result).to.equal("id");
			}catch(err){
				expect.fail();
			}
		});
		it("20. no dataset, should return empty []",function(){
			return facade.listDatasets().then((result)=>{
				// expect(result).to.deep.equal([])
				expect(result.length).to.equal(0);
			}).catch((err)=>{
				expect.fail();
			});
		});


		// it("21. added one dataset and return without error", async function(){
		// 	try {
		// 		const res = await facade.addDataset("id", sections, InsightDatasetKind.Sections);
		// 		const result = await facade.listDatasets();
		// 		expect(result.length).to.equal(1);
		// 		expect(result).to.deep.equal([{
		// 			id: "id",
		// 			kind: InsightDatasetKind.Sections,
		// 			numRows: 64612
		// 		}]);
		// 	}catch(err){
		// 		expect.fail();
		// 	}
		// });
		it("21. added one dataset and return without error", async function(){
			try {
				const res = await facade.addDataset("id", validSections, InsightDatasetKind.Sections);
				const result = await facade.listDatasets();
				expect(result.length).to.equal(1);
				expect(result).to.deep.equal(myDataset);
			}catch(err){
				expect.fail();
			}
		});


		it("22. removed one dataset and return without error", async function(){
			try{
				const r = await facade.addDataset("id", validSections, InsightDatasetKind.Sections);
				const r1 = await facade.removeDataset("id");
				const result = await facade.listDatasets();
				expect(result.length).to.equal(0);
			}catch(err){
				expect.fail();
			}
		});


		// it("23. after add crashes, return the correct listDatasets", async function(){
		// 	try{
		// 		const result = await facade.addDataset("id", sections, InsightDatasetKind.Sections);
		// 		expect(result).to.be.instanceof(Array);
		// 		expect(result.length).to.equal(1);
		// 		facade = new InsightFacade();
		// 		const res = await facade.listDatasets();
		// 		expect(res).to.be.instanceof(Array);
		// 		expect(res.length).to.equal(1);
		// 		expect(res).to.deep.equal([{
		// 			id: "id",
		// 			kind: InsightDatasetKind.Sections,
		// 			numRows: 64612
		// 		}]);
		// 	}catch(err){
		// 		expect.fail();
		// 	}
		// });

		it("23. after add crashes, return the correct listDatasets", async function(){
			try{
				const result = await facade.addDataset("id", validSections, InsightDatasetKind.Sections);
				expect(result).to.be.instanceof(Array);
				expect(result.length).to.equal(1);
				facade = new InsightFacade();
				const res = await facade.listDatasets();
				expect(res).to.be.instanceof(Array);
				expect(res.length).to.equal(1);
				expect(res).to.deep.equal(myDataset);
			}catch(err){
				expect.fail();
			}
		});

		it("24. after remove crashes, return the empty listDataset", async function(){
			try{
				const result = await facade.addDataset("id", validSections, InsightDatasetKind.Sections);
				expect(result).to.be.an.instanceof(Array);
				expect(result).to.have.length(1);
				const result2 = await facade.removeDataset("id");
				facade = new InsightFacade();
				const res = await facade.listDatasets();
				expect(res).to.be.instanceof(Array);
				expect(res.length).to.equal(0);
			}catch(err){
				expect.fail();
			}
		});

	// 	it("25. should list multiple datasets", async function(){
	// 		try{
	// 			await facade.addDataset("id",sections,InsightDatasetKind.Sections);
	// 			await facade.addDataset("id1",sections,InsightDatasetKind.Sections);
	// 			const result = await facade.listDatasets();
	// 			expect(result).to.be.instanceof(Array);
	// 			expect(result).to.have.length(2);
	// 			expect(result).to.deep.equal([{
	// 				id: "id",
	// 				kind: InsightDatasetKind.Sections,
	// 				numRows: 64612
	// 			},{
	// 				id: "id1",
	// 				kind: InsightDatasetKind.Sections,
	// 				numRows: 64612
	// 			}]);
	// 		}catch(err){
	// 			expect.fail();
	// 		}
	// 	});
	//
	// });
		it("25. should list multiple datasets", async function(){
			try{
				await facade.addDataset("id",validSections,InsightDatasetKind.Sections);
				await facade.addDataset("id1",validSections,InsightDatasetKind.Sections);
				const result = await facade.listDatasets();
				expect(result).to.be.instanceof(Array);
				expect(result).to.have.length(2);
				expect(result).to.deep.equal([{
					id: "id",
					kind: InsightDatasetKind.Sections,
					numRows: 12
				},{
					id: "id1",
					kind: InsightDatasetKind.Sections,
					numRows: 12
				}]);
			}catch(err){
				expect.fail();
			}
		});

	});

	// describe("test",()=> {
	// 	it("test perform query",()=>{
	// 		facade = new InsightFacade();
	//
	// 		facade.performQuery("");
	//
	//
	// 	});
	// });

	/*
	 * This test suite dynamically generates tests from the JSON files in test/resources/queries.
	 * You should not need to modify it; instead, add additional files to the queries directory.
	 * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
	 */
	describe("PerformQuery", () => {
		before(function () {
			console.info(`Before: ${this.test?.parent?.title}`);

			facade = new InsightFacade();

			// Load the datasets specified in datasetsToQuery and add them to InsightFacade.
			// Will *fail* if there is a problem reading ANY dataset.

			// const loadDatasetPromises = [
			// 	facade.addDataset("sections", sections, InsightDatasetKind.Sections),
			// ];
			const loadDatasetPromises = [
				facade.addDataset("sections", sections, InsightDatasetKind.Sections),
			];

			return Promise.all(loadDatasetPromises);
		});


		it("should check for order and make sure order is deep equal", async function(){
			try{
				const result = await facade.performQuery({
					WHERE: {
						AND: [{
							GT: {
								sections_avg: 97
							}
						},{
							IS:{
								sections_dept:"c*"
							}
						}
						]
					},
					OPTIONS: {
						COLUMNS: [
							"sections_dept",
							"sections_avg"
						],
						ORDER: "sections_avg"
					}
				});

				expect(result).to.deep.equal([
					{sections_dept:"cnps", sections_avg:97.47},
					{sections_dept:"cnps",sections_avg:97.47},
					{sections_dept:"crwr",sections_avg:98},
					{sections_dept:"crwr",sections_avg:98},
					{sections_dept:"cnps",sections_avg:99.19}]
				);

			}catch(err){
				expect.fail();
			}

		});
		//
		// it("should check for another dataset id", async function(){
		// 	try{
		// 		const result = await facade.performQuery({
		// 			WHERE: {
		// 				AND: [
		// 					{
		// 						IS: {
		// 							ubc_dept: "phil"
		// 						}
		// 					},
		// 					{
		// 						IS: {
		// 							ubc_id: "316"
		// 						}
		// 					},
		// 					{
		// 						IS: {
		// 							ubc_instructor: "schouls, peter"
		// 						}
		// 					},
		// 					{
		// 						IS: {
		// 							ubc_title: "phil after 1800"
		// 						}
		// 					},
		// 					{
		// 						IS: {
		// 							ubc_uuid: "20404"
		// 						}
		// 					}
		// 				]
		// 			},
		// 			OPTIONS: {
		// 				COLUMNS: [
		// 					"ubc_dept",
		// 					"ubc_avg"
		// 				],
		// 				ORDER: "ubc_avg"
		// 			}
		// 		});
		//
		// 		expect(result).have.deep.members([{ubc_dept:"phil",ubc_avg:71.98}]
		// 		);
		//
		// 	}catch(err){
		// 		expect.fail();
		// 	}
		//
		// });


		after(function () {
			console.info(`After: ${this.test?.parent?.title}`);
			clearDisk();

		});

		type PQErrorKind = "ResultTooLargeError" | "InsightError";

		folderTest<unknown, Promise<InsightResult[]>, PQErrorKind>(
			"Dynamic InsightFacade PerformQuery tests",
			(input) => facade.performQuery(input),
			"./test/resources/queries",
			{
				assertOnResult: async (actual, expected) => {
					expect(actual).have.deep.members(await expected); // order doesn't matter;
				},
				errorValidator: (error): error is PQErrorKind =>
					error === "ResultTooLargeError" || error === "InsightError",
				assertOnError: (actual, expected) => {
					if (expected === "ResultTooLargeError") {
						expect(actual).to.be.an.instanceOf(ResultTooLargeError);
					} else {
						expect(actual).to.be.an.instanceOf(InsightError);
					}
				},
			}
		);
	});
});
