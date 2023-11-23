import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError
} from "./IInsightFacade";
import DataSetHelper from "./DataSetHelper";
import * as fs from "fs-extra";
import {QueryTreeNode} from "./QueryTreeNode";
import {Room} from "./Room";
import {Section} from "./Section";
import QueryBuilder from "./QueryBuilder";
import AnswerQueryWhere from "./AnswerQueryWhere";
import AnswerQueryTrans from "./AnswerQueryTrans";
import InsightFacadeDatasetHelper from "./InsightFacadeDatasetHelper";
import PerformQueryHelper from "./PerformQueryHelper";
import AnswerQueryOption from "./AnswerQueryOption";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */

export default class InsightFacade implements IInsightFacade {

	private idAndDatasets: {[key: string]: {kind: InsightDatasetKind, data: any[]}} = {};
	private querybuilder: QueryBuilder;
	private sections: Section[] = [];
	private rooms: Room[] = [];
	private kind: InsightDatasetKind = InsightDatasetKind.Sections;

	constructor() {
		console.log("InsightFacadeImpl::init()");
		this.idAndDatasets = this.loadFromDisk();
		this.querybuilder = new QueryBuilder();
	}


	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		return new Promise<string[]>((resolve, reject) => {
			if (id === null || id.includes("_") || id.trim().length === 0) {
				reject(new InsightError("The input id is invalid!"));
			} else if (Object.keys(this.idAndDatasets).includes(id)) {
				reject(new InsightError("The input id has existed!"));
			} else if (kind === InsightDatasetKind.Sections) {
				DataSetHelper.addSectionDataset(content)
					.then((r: any) => {
						this.idAndDatasets[id] = {kind: kind, data: r};
						return InsightFacadeDatasetHelper.writeToFiles(this.idAndDatasets);
					})
					.then(() => {
						resolve(Object.keys(this.idAndDatasets));
					})
					.catch((error) => {
						reject(new InsightError("Invalid files."));
					});
			} else if (kind === InsightDatasetKind.Rooms) {
				DataSetHelper.addRoomDataset(content)
					.then((r: any) => {
						this.idAndDatasets[id] = {kind: kind, data: r};
						return InsightFacadeDatasetHelper.writeToFiles(this.idAndDatasets);
					})
					.then(() => {
						resolve(Object.keys(this.idAndDatasets));
					})
					.catch((error) => {
						reject(new InsightError("Invalid files."));
					});
			} else {
				reject(new InsightError("The kind is invalid!"));
			}
		});
	}

	private writeToFiles() {
		fs.ensureDirSync("./data");
		return fs.writeJson("./data/datasets.json", this.idAndDatasets);
	}

	public removeDataset(id: string): Promise<string> {
		return new Promise<string>((resolve, reject) => {
			if (id === null || id.includes("_") || id.trim().length === 0) {
				reject(new InsightError("The input id is invalid!"));
			} else if (!Object.keys(this.idAndDatasets).includes(id)) {
				reject(new NotFoundError("The input id did not exist!"));
			} else {
				delete this.idAndDatasets[id];
				this.writeToFiles().then(() => {
					resolve(id);
				}).catch((err) => {
					reject(err);
				});
			}
		});
	}

	public listDatasets(): Promise<InsightDataset[]> {
		let list: InsightDataset[] = [];
		for (const [key, value] of Object.entries(this.idAndDatasets)) {
			list.push({
				id: key,
				kind: value.kind,
				numRows: value.data.length
			});
		}
		return Promise.resolve(list);
	}


	public loadFromDisk() {
		if (!fs.existsSync("./data/datasets.json")) {
			return {};
		}
		let diskJson = JSON.parse(fs.readFileSync("./data/datasets.json").toString());
		let ret: {[key: string]: {kind: InsightDatasetKind, data: any[]}} = {};
		Object.keys(diskJson).forEach(function (key) {
			// each id is a key
			let sectionList: Section[] = [];
			let roomList: Room[] = [];

			ret[key] = {kind: diskJson[key].kind, data: []};
			// ret[key].kind = diskJson[key].kind;
			if (diskJson[key].kind === InsightDatasetKind.Sections){
				for (let r of diskJson[key].data) {
					let s = new Section(r["uuid"], r["id"], r["title"], r["instructor"], r["dept"],
						r["year"], r["avg"], r["pass"], r["fail"], r["audit"]);
					sectionList.push(s);
				}
				ret[key].data = sectionList;
			}else if(diskJson[key].kind === InsightDatasetKind.Rooms){
				for (let i of diskJson[key].data) {
					let r = new Room(i["fullname"], i["number"],i["seats"], i["furniture"], i["type"]);
					r.setBuildingValue(i["shortname"],i["name"],i["address"], i["href"], i["lat"], i["lon"]);
					roomList.push(r);
				}
				ret[key].data = roomList;
			}

		});
		this.idAndDatasets = ret;
		return ret;

	}

	public performQuery(query: unknown): Promise<InsightResult[]> {
		// initialize querybuilder

		this.querybuilder = new QueryBuilder();
		let root = this.querybuilder.parseQuery(query);
		let queryKind = this.querybuilder.getType();
		if (queryKind === undefined) {
			throw new InsightError("failed parsing");
		} else {
			this.kind = queryKind;
		}
		let temp = this.idAndDatasets[this.querybuilder.getId()];
		// console.log(this.idAndDatasets);
		if (temp === undefined) {
			throw new InsightError("Referenced dataset " + this.querybuilder.getId() + " not added yet");
		} else {
			// check if kind are matched
			if (this.idAndDatasets[this.querybuilder.getId()].kind !== this.kind) {
				throw new InsightError("Query kind not matched");
			}
			if (this.kind === InsightDatasetKind.Sections) {
				this.sections = this.idAndDatasets[this.querybuilder.getId()].data;
			} else {
				this.rooms = this.idAndDatasets[this.querybuilder.getId()].data;
				// console.log("room check:" + this.rooms[0]);
			}
		}
		let result = this.answerQuery(root);
		return Promise.resolve(result);
	}

	public getDatasetLength(){
		if (this.kind === InsightDatasetKind.Sections) {
			return this.sections.length;
		} else {
			return this.rooms.length;
		}
	}

	public answerQuery(node: QueryTreeNode) {
		let nodes = node.getChildren();
		let colIndex: number[] = [];
		let res: InsightResult[] = [];
		let where: AnswerQueryWhere;
		let trans: AnswerQueryTrans;
		let option: AnswerQueryOption;
		where = new AnswerQueryWhere(this.sections, this.rooms, this.kind);
		trans = new AnswerQueryTrans(this.kind);
		option = new AnswerQueryOption(this.sections, this.rooms, this.kind, this.querybuilder.getId());
		for (const n of nodes) {
			if (n.getKey() === "WHERE") {
				if (n.getChildren().length === 0) {
					colIndex = Array.from(Array(this.getDatasetLength()).keys());
				} else {
					colIndex = where.handleWhere(n.getChildren()[0]);
				}
			} else if (n.getKey() === "TRANSFORMATIONS") {
				this.transform(trans, colIndex, n);
			} else if (n.getKey() === "OPTIONS") {
				if (!trans.hasTransformation()) {
					res = option.optionNoTrans(n, colIndex, res);
				} else {
					let column = n.getChildren()[0].getValue();
					if (typeof column !== "string" && !Array.isArray(column)) {
						throw new InsightError("col type error");
					}
					let transRes: [{[key: string]: number | string;}] = trans.getTransformedList();
					let tempRes: InsightResult[] = [];
					this.extracted(transRes, column, tempRes);
					if (n.getChildren().length === 2) {
						let order = n.getChildren()[1];
						if(order.hasChildren()){
							res = this.orderHasChildren(order, option, tempRes);
						}else{
							let key = this.getKey(order);
							let arr = [];
							arr.push(key);
							res = option.handleOrder("UP", arr, tempRes);
						}
					} else {
						return tempRes;
					}
				}
			} else {
				throw new InsightError("unknown key");
			}
		}
		return res;
	}

	private getKey(order: QueryTreeNode) {
		let key = order.getValue();
		if (typeof key !== "string") {
			throw new InsightError("order type invalid");
		}
		return key;
	}

	private orderHasChildren(order: QueryTreeNode, option: AnswerQueryOption, tempRes: InsightResult[]) {
		let dir = order.getChildren()[0].getValue();
		let keys = order.getChildren()[1].getValue();
		if (typeof dir !== "string" || typeof keys !== "object" || !Array.isArray(keys)) {
			throw new InsightError("order type invalid");
		}
		return option.handleOrder(dir, keys, tempRes);
	}

	private transform(trans: AnswerQueryTrans, colIndex: number[], n: QueryTreeNode) {
		// console.log("TRANSFORMATIONS");
		trans.initializeDatasets(this.sections, this.rooms, colIndex);
		let group = n.getChildren()[0].getValue();
		let apply = n.getChildren()[1];
		if (Array.isArray(group) && apply.hasChildren()) {
			trans.handleTrans(group, apply);
		} else {
			throw new InsightError("188");
		}
		if (trans.getTransSize() > 5000) {
			throw new ResultTooLargeError("The result is too big. Only queries with a maximum of 5000 " +
				"results are supported.");
		}
	}

	private extracted(transRes: [{[p: string]: number | string}], column: string | string[], tempRes: InsightResult[]) {
		for (let t in transRes) {
			let temp: {[key: string]: number | string;} = {};
			let obj = transRes[t];
			for (let i of column) {
				if (PerformQueryHelper.isCustomField(i)) {
					temp[i] = transRes[t][i];
				} else {
					temp[this.querybuilder.getId() + "_" + i] = transRes[t][i];
				}

			}

			// console.log(temp);
			tempRes.push(temp);
		}
	}
}

