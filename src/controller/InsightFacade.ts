import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError, ResultTooLargeError
} from "./IInsightFacade";
import DataSetHelper from "./DataSetHelper";
import * as fs from "fs-extra";
import {QueryTreeNode} from "./QueryTreeNode";
import {Section} from "./Section";
import QueryBuilder from "./QueryBuilder";
import PerformQueryHelper from "./PerformQueryHelper";
/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */

export default class InsightFacade implements IInsightFacade {

	private idAndDatasets: {[key: string]: {kind: InsightDatasetKind, data: any[]}} = {};
	private querybuilder: QueryBuilder;
	constructor() {
		console.log("InsightFacadeImpl::init()");
		this.idAndDatasets = this.loadFromDisk();
		this.querybuilder = new QueryBuilder();
	}
	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		return new Promise<string[]>((resolve, reject) => {
			if (id === null || id.includes("_") || id.trim().length === 0) {
				reject(new InsightError("The input id is invalid!"));
			}else if (Object.keys(this.idAndDatasets).includes(id)) {
				reject(new InsightError("The input id has existed!"));
			}else if (!(kind === InsightDatasetKind.Sections)) {
				reject(new InsightError("The input kind is not valid!"));
			}else{
				DataSetHelper.addSectionDataset(content).then((r: any) => {
					this.idAndDatasets[id] = {kind: kind, data: r};
					return this.writeToFiles();
				}).then(() => {
					resolve(Object.keys(this.idAndDatasets));
				}).catch((error) => {
					reject(new InsightError("Invalid files."));
				});
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
			}else if (!Object.keys(this.idAndDatasets).includes(id)) {
				reject(new NotFoundError("The input id did not exist!"));
			}else{
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

	private sections: Section[] = [];
	public loadFromDisk(){
		if(!fs.existsSync("./data/datasets.json")){
			return {};
		}
		let diskJson = JSON.parse(fs.readFileSync("./data/datasets.json").toString("utf-8"));
		let ret: {[key: string]: {kind: InsightDatasetKind, data: any[]}} = {};
		Object.keys(diskJson).forEach(function(key) {
			// each id is a key
			let sectionList: Section[] = [];
			ret[key] = {kind:InsightDatasetKind.Sections, data:[]};
			ret[key].kind = diskJson[key].kind;
			for (let r of diskJson[key].data){
				let s = new Section(r["id"].toString(), r["Course"], r["Title"], r["Professor"], r["Subject"],
					r["Year"], r["Avg"], r["Pass"], r["Fail"], r["Audit"]);
				sectionList.push(s);
			}
			ret[key].data = sectionList;
		});
		// parseSectionsFiles(filePromise: string[])
		return ret;

	}

	public performQuery(query: unknown): Promise<InsightResult[]> {
		this.querybuilder = new QueryBuilder();
		let root = this.querybuilder.parseQuery(query);
		let temp = this.idAndDatasets[this.querybuilder.getId()];
		if(temp === undefined){
			throw new InsightError("Referenced dataset " + this.querybuilder.getId() + " not added yet");
		}else{
			this.sections = this.idAndDatasets[this.querybuilder.getId()].data;
		}

		let result = this.answerQuery(root);
		console.log(result);
		return Promise.resolve(result);

	}
	public answerQueryWhere(node: QueryTreeNode){
		console.log(97);
		if(node.hasChildren()){
			console.log(99);
			// haven't reached the leaves
			let children = node.getChildren();
			let sectionIndex: number[] = [];
			if(node.getKey() === "AND"){
				for(let i = 0; i < node.getChildrenSize(); i++) {
					// find the same sections among all the children
					let temp = this.answerQueryWhere(children[i]);
					console.log(node.getKey());
					if(sectionIndex.length === 0 && i === 0){
						sectionIndex.push(...temp);
					}else{
						// find the intersection
						sectionIndex = PerformQueryHelper.findDuplicate(sectionIndex,temp);
					}
				}
			}else if(node.getKey() === "OR"){
				for(let i = 0; i < node.getChildrenSize(); i++) {
					// add all sections among all children
					let temp = this.answerQueryWhere(children[i]);
					console.log(117);
					if(sectionIndex.length === 0){
						sectionIndex.push(...temp);
					}else{
						// find the intersection
						sectionIndex = PerformQueryHelper.mergeNoDuplicate(sectionIndex,temp);
					}
				}
			}else if(node.getKey() === "NOT"){
				console.log(node.getKey());
				if( node.getChildrenSize() === 1){
					let arr1 = [...Array(this.sections.length).keys()];  // array = 0,1....length-1
					let temp = this.answerQueryWhere(children[0]);
					sectionIndex = PerformQueryHelper.excludeArr(arr1,temp);

				}else{
					throw new InsightError("127");
				}
			}
			return sectionIndex;
		} else {
			// reach either a mkey or skey
			let sectionIndex = this.answerQueryWhereBaseCase(node);
			return sectionIndex;
		}
	}


	public answerQuery(node: QueryTreeNode){
		let nodes =  node.getChildren();
		let colIndex: number[] = [];
		let res: InsightResult[] = [];
		for(const n of nodes){
			if(n.getKey() === "WHERE"){
				colIndex = this.answerQueryWhere(n.getChildren()[0]);
				console.log("colIndex: " + colIndex.length);
				if(colIndex.length > 5000){
					throw new ResultTooLargeError("The result is too big. Only queries with a maximum of 5000 " +
                        "results are supported.");
				}
			}else if(n.getKey() === "OPTIONS"){
				if( n.getChildren().length === 2) {
					let column = n.getChildren()[0].getValue();
					let order = n.getChildren()[1].getValue();

					if (typeof order === "object") {
						order = order[0];
					}
					if (typeof column === "string" || typeof column === "object") {
						for (let i of colIndex) {
							res.push(this.sections[i].toJson(column, this.querybuilder.getId()));
						}
						res.sort((a: {[key: string]: any}, b: {[key: string]: any}) => a[
							this.querybuilder.getId() + "_" + String(order)] > b[this.querybuilder.getId() + "_" +
						String(order)] ? 1 : -1);
					} else {
						throw new InsightError("line 199");
					}
				}else{
					let column = n.getChildren()[0].getValue();
					if (typeof column === "string" || typeof column === "object") {
						for (let i of colIndex) {
							res.push(this.sections[i].toJson(column, this.querybuilder.getId()));
						}
					} else {
						throw new InsightError("line 199");
					}
				}

			}else{
				throw new InsightError("unknown key");
			}
		}
		return res;
	}
	private answerQueryWhereBaseCase(node: QueryTreeNode) {
		let sectionIndex: number[] = [];
		if (node.getKey() === "IS") {
			console.log("IS");
			let start: boolean = false;
			let end: boolean = false;
			let value: string = String(node.getValue());
			if(value === "*"){
				console.log("*");
				sectionIndex = [...Array(this.sections.length).keys()];
				return sectionIndex;
			}
			if(value.startsWith("*")){
				console.log("*t");
				value = value.substring(1);
				start = true;
			}
			if(value.endsWith("*")){
				console.log("t*");
				value = value.substring(0, value.length - 1);
				end = true;
			}

			for (let i = 0; i < this.sections.length; i++) {
				sectionIndex = [...this.handleQueryIs(start, end, i, node, value, sectionIndex)];
			}
		} else {
			let value = node.getKey();
			for (let i = 0; i < this.sections.length; i++) {
				if (node.getKey() === "EQ") {
					if (this.sections[i].getValue(node.getChildrenString()[0]) === node.getValue()) {
						sectionIndex.push(i); // if a section matches, add its index
					}
				}else if (node.getKey() === "GT") {
					if (this.sections[i].getValue(node.getChildrenString()[0]) > Number(node.getValue())) {
						sectionIndex.push(i); // if a section matches, add its index
					}
				}else if (node.getKey() === "LT") {
					if (this.sections[i].getValue(node.getChildrenString()[0]) < Number(node.getValue())) {
						sectionIndex.push(i); // if a section matches, add its index
					}
				}
			}
		}
		return sectionIndex;
	}


	private handleQueryIs(start: boolean, end: boolean, i: number, node: QueryTreeNode,
						  value: string, sectionIndex: number[]) {
		if (start && end) {
			if (String(this.sections[i].getValue(node.getChildrenString()[0])).includes(value)) {
				sectionIndex.push(i);
			}
		} else if (start) {
			if (String(this.sections[i].getValue(node.getChildrenString()[0])).endsWith(value)) {
				sectionIndex.push(i);
			}
		} else if (end) {
			if (String(this.sections[i].getValue(node.getChildrenString()[0])).startsWith(value)) {
				sectionIndex.push(i);
			}
		} else {
			if (this.sections[i].getValue(node.getChildrenString()[0]) === value) {
				// if a section matches, add its index
				sectionIndex.push(i);
			}
		}
		return sectionIndex;
	}


}

